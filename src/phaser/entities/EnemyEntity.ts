import Phaser from 'phaser';
import LoggerInstance, { Logger as LoggerType } from '../../core/utils/Logger'; // Use default import for Logger instance
import EventBusInstance, { EventBus as EventBusType } from '../../core/events/EventBus'; // Import EventBus instance and type
import * as Events from '../../core/constants/events'; // Import the events constants object
import { EnemyConfig } from '../../core/config/schemas/enemySchema';
import * as Assets from '../../core/constants/assets'; // Import Assets for texture key

// Define payload for applying the slow effect (copied from EnemyManager for type safety)
// TODO: Move to a shared types file
interface ApplySlowEffectData {
    enemyInstanceIds: string[];
    slowFactor: number;
    durationMs: number;
}

// Placeholder Enemy Entity
export class EnemyEntity extends Phaser.Physics.Arcade.Sprite {
  // Static property to track game pause state
  public static isPaused: boolean = false;

  public instanceId: string;
  public configId: string;
  public enemyConfig: EnemyConfig;
  private shootCooldownTimer: number = 0;
  private maxHealth: number; // Store scaled max health
  private baseSpeedMultiplier: number; // Store the base speed multiplier from difficulty/wave scaling

  // Slow effect properties
  private currentSlowMultiplier: number = 1.0; // 1.0 means no slow
  private slowEffectExpiryTime: number = 0; // Timestamp when the slow effect ends

  // Store injected instances
  private eventBus: EventBusType;
  private logger: LoggerType;

  // Static method to initialize event listeners for pause/resume
  public static initializeEventListeners(): void {
    EventBusInstance.on(Events.GAME_PAUSED, () => {
      EnemyEntity.isPaused = true;
      LoggerInstance.debug('EnemyEntity: Game paused state set to true');
    });

    EventBusInstance.on(Events.GAME_RESUMED, () => {
      EnemyEntity.isPaused = false;
      LoggerInstance.debug('EnemyEntity: Game paused state set to false');
    });
  }

  // Static method to clean up event listeners for pause/resume
  public static cleanupEventListeners(): void {
    EventBusInstance.off(Events.GAME_PAUSED, () => {});
    EventBusInstance.off(Events.GAME_RESUMED, () => {});
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string, // Texture key passed from GameSceneEventHandler
    instanceId: string,
    config: EnemyConfig,
    maxHealth: number,
    speedMultiplier: number,
    // Inject dependencies
    eventBusInstance: EventBusType = EventBusInstance,
    loggerInstance: LoggerType = LoggerInstance
  ) {
    super(scene, x, y, texture);
    this.instanceId = instanceId;
    this.configId = config.id;
    this.enemyConfig = config;
    this.maxHealth = maxHealth;
    this.baseSpeedMultiplier = speedMultiplier;
    this.eventBus = eventBusInstance; // Store injected EventBus
    this.logger = loggerInstance; // Store injected Logger

    // Initialize cooldown if the enemy can shoot
    if (this.enemyConfig.canShoot && this.enemyConfig.shootConfig) {
      this.shootCooldownTimer = Math.random() * this.enemyConfig.shootConfig.cooldownMs;
    }

    // Add the entity to the scene's physics and display list
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set appropriate scale for the sprite
    this.setScale(0.05); // Use default scale

    // Basic physics properties
    if (config.movementPattern === 'bomber_dive' || config.id === 'hexagon_bomber') {
      this.setCollideWorldBounds(false);
    } else {
      this.setCollideWorldBounds(true);
    }
    // Align collision circle with the visual sprite
    this.setCircle(
      config.collisionRadius,
      -config.collisionRadius + this.width / 2, // X offset to center collision
      -config.collisionRadius + this.height / 2 // Y offset to center collision
    );
    const initialSpeed = config.baseSpeed * this.baseSpeedMultiplier;
    this.setVelocityX(initialSpeed * (Math.random() < 0.5 ? -1 : 1));
    this.setVelocityY(0);

    // Set data properties for debug inspection
    this.setData('instanceId', this.instanceId);
    this.setData('objectType', 'enemy');
    this.setData('configId', this.configId);

    // Bind instance-specific event handlers
    this.handleApplySlowRequest = this.handleApplySlowRequest.bind(this);

    // Register instance-specific event listeners
    this.eventBus.on(Events.APPLY_SLOW_EFFECT, this.handleApplySlowRequest);

    this.logger.debug(`EnemyEntity created: ${this.configId} (Instance: ${this.instanceId})`);
  }

  // Updated to accept optional maxHealth for UI updates
  public takeDamage(amount: number, maxHealth?: number): void {
    const currentMaxHealth = maxHealth ?? this.maxHealth;
    this.logger.debug(
      `Enemy ${this.instanceId} took ${amount} damage (visual placeholder). Max Health: ${currentMaxHealth}`
    );
    // Example: Flash red
    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (this.tintTopLeft === 0xff0000) {
          this.clearTint();
      }
    });
    // Actual health is managed by EnemyManager
  }

  // --- Getters for State (Only slow-related needed now) ---
  public isSlowed(): boolean {
      return this.currentSlowMultiplier < 1.0;
  }

  public getSlowFactor(): number {
      return this.currentSlowMultiplier;
  }

  public getSlowExpiryTime(): number {
      // Return 0 if not slowed, otherwise the expiry timestamp
      return this.currentSlowMultiplier < 1.0 ? this.slowEffectExpiryTime : 0;
  }
  // --- End Getters ---

  // Method to handle destruction
  public destroySelf(): void {
    this.logger.debug(`Destroying EnemyEntity: ${this.instanceId}`);

    // Unregister instance-specific listeners
    this.eventBus.off(Events.APPLY_SLOW_EFFECT, this.handleApplySlowRequest);

    // Disable physics body immediately
    this.disableBody(true, false);

    // Emit event for the scene/handler to create the visual effect
    this.eventBus.emit(Events.REQUEST_ENEMY_DESTRUCTION_EFFECT, {
      configId: this.configId,
      x: this.x,
      y: this.y,
    });

    // Destroy the game object immediately after emitting the event
    this.destroy(); // Phaser's destroy method
  }

  // Pre-update loop
  protected preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    if (!this.body || !this.active) {
      return;
    }

    if (!EnemyEntity.isPaused) {
      this.handleMovement(time, delta);
      this.handleShooting(time, delta);
      this.checkOffScreen();
      this.updateSlowEffect(time); // Use game time from preUpdate
    }
  }

  private handleMovement(time: number, _delta: number): void {
    if (!this.body) {
      return;
    }
    // Apply base speed multiplier AND current slow multiplier
    const currentSpeedMultiplier = this.baseSpeedMultiplier * this.currentSlowMultiplier;
    const speed = this.enemyConfig.baseSpeed * currentSpeedMultiplier;

    // Visual indicator for slow (optional)
    if (this.currentSlowMultiplier < 1.0) {
        this.setTint(0xadd8e6); // Light blue tint when slowed
    } else {
        if (this.tintTopLeft === 0xadd8e6) {
             this.clearTint();
        }
    }

    // Apply movement based on pattern
    switch (this.enemyConfig.movementPattern) {
      case 'invader_standard':
      case 'invader_support':
        if (this.body.blocked.right) {
          this.setVelocityX(-speed);
        } else if (this.body.blocked.left) {
          this.setVelocityX(speed);
        }
        if (Math.abs(this.body.velocity.x) < speed * 0.9 && (this.body.blocked.right || this.body.blocked.left)) {
          this.setVelocityX(this.body.velocity.x >= 0 ? speed : -speed);
        } else if (Math.abs(this.body.velocity.x) < 1 && !this.body.blocked.right && !this.body.blocked.left) {
          this.setVelocityX(speed * (Math.random() < 0.5 ? -1 : 1));
        }
        if (this.y < -10) { this.setVelocityY(0); } else { this.setVelocityY(speed * 0.1); }
        break;

      case 'boss_weaving': {
        const frequency = 0.001;
        const amplitude = speed * 1.5;
        const horizontalVelocity = Math.sin(time * frequency) * amplitude;
        this.setVelocityX(horizontalVelocity);
        if (this.y < -10) { this.setVelocityY(0); } else { this.setVelocityY(speed * 0.5); }
        break;
      }
      case 'bomber_dive': {
        if (this.body.velocity.x !== 0) this.setVelocityX(0);
        if (this.y < -10) { this.setVelocityY(0); } else { this.setVelocityY(speed * 1.5); }
        break;
      }
      case 'strafe_horizontal': {
        if (this.body.blocked.right) {
          this.setVelocityX(-speed);
        } else if (this.body.blocked.left) {
          this.setVelocityX(speed);
        }
        if (Math.abs(this.body.velocity.x) < speed * 0.9 && (this.body.blocked.right || this.body.blocked.left)) {
          this.setVelocityX(this.body.velocity.x >= 0 ? speed : -speed);
        } else if (Math.abs(this.body.velocity.x) < 1 && !this.body.blocked.right && !this.body.blocked.left) {
          this.setVelocityX(speed * (Math.random() < 0.5 ? -1 : 1));
        }
        if (this.y < -10) { this.setVelocityY(0); } else { this.setVelocityY(speed * 0.05); }
        break;
      }
      default:
        this.logger.warn(`Unknown movement pattern: ${this.enemyConfig.movementPattern}`);
        if (this.body.velocity.x !== 0) this.setVelocityX(0);
        if (this.y < -10) { this.setVelocityY(0); } else { this.setVelocityY(speed); }
        break;
    }
  }

  private handleShooting(time: number, delta: number): void {
    if (!this.enemyConfig.canShoot || !this.enemyConfig.shootConfig || !this.active) {
      return;
    }

    this.shootCooldownTimer -= delta;

    if (this.shootCooldownTimer <= 0) {
      if (this.y >= 50) {
        this.logger.debug(`Enemy ${this.instanceId} requesting fire (y >= 50).`);
        if (this.scene) {
        this.eventBus.emit(Events.ENEMY_REQUEST_FIRE, {
          instanceId: this.instanceId,
          x: this.x,
          y: this.getBottomCenter().y,
            shootConfig: this.enemyConfig.shootConfig,
          });
        } else {
          this.logger.error(`Enemy ${this.instanceId} tried to fire but scene context is missing.`);
        }
        this.shootCooldownTimer = this.enemyConfig.shootConfig.cooldownMs;
      } else {
        this.shootCooldownTimer = this.enemyConfig.shootConfig.cooldownMs;
        this.logger.debug(`Enemy ${this.instanceId} ready to fire but not far enough on screen (y=${this.y}). Cooldown reset.`);
      }
    }
  }

  private checkOffScreen(): void {
    if (this.y > this.scene.cameras.main.height + this.displayHeight) {
      this.logger.debug(`Enemy ${this.instanceId} went off-screen at y=${this.y}. Destroying.`);
      this.eventBus.emit(Events.ENEMY_OFF_SCREEN, { instanceId: this.instanceId });
      this.setActive(false).setVisible(false);
      this.disableBody(true, true);
    }
  }

  // --- Slow Effect Logic ---

  // Handler for the APPLY_SLOW_EFFECT event
  private handleApplySlowRequest(data: ApplySlowEffectData): void {
      // Check if this specific enemy instance is targeted
      if (data.enemyInstanceIds.includes(this.instanceId)) {
          this.applySlow(data.slowFactor, data.durationMs);
      }
  }

  /**
   * Applies a slow effect to the enemy. Overwrites existing slow.
   * @param factor The speed multiplier (e.g., 0.5 for 50% speed).
   * @param durationMs The duration of the slow effect in milliseconds.
   */
  public applySlow(factor: number, durationMs: number): void {
    this.currentSlowMultiplier = factor;
    // Use scene time for consistent expiry check
    this.slowEffectExpiryTime = this.scene.time.now + durationMs;
    this.logger.debug(`Applied slow (Factor: ${factor}, Duration: ${durationMs}ms) to Enemy ${this.instanceId}. Expires at: ${this.slowEffectExpiryTime}`);
  }

  /**
   * Checks if the slow effect has expired and resets the multiplier if it has.
   * Called in the preUpdate loop.
   * @param currentTime The current game time (passed from preUpdate).
   */
  private updateSlowEffect(currentTime: number): void {
    // Use scene time for comparison
    if (this.currentSlowMultiplier < 1.0 && this.scene.time.now >= this.slowEffectExpiryTime) {
      this.logger.debug(`Slow effect expired for Enemy ${this.instanceId}.`);
      this.currentSlowMultiplier = 1.0; // Reset to normal speed
      this.slowEffectExpiryTime = 0;
      // Clear tint if it was the slow tint
      if (this.tintTopLeft === 0xadd8e6) {
          this.clearTint();
      }
    }
  }
}
