import Phaser from 'phaser';
import { EnemyConfig } from '../../core/config/schemas/enemySchema';
import Logger from '../../core/utils/Logger'; // Use default import for Logger instance
import EventBus from '../../core/events/EventBus'; // Import EventBus instance
import {
  ENEMY_REQUEST_FIRE,
  REQUEST_ENEMY_DESTRUCTION_EFFECT,
  GAME_PAUSED,
  GAME_RESUMED
} from '../../core/constants/events'; // Import the new events

// Placeholder Enemy Entity
export class EnemyEntity extends Phaser.Physics.Arcade.Sprite {
  // Static property to track game pause state
  public static isPaused: boolean = false;
  
  public instanceId: string;
  public configId: string;
  public enemyConfig: EnemyConfig;
  private shootCooldownTimer: number = 0;
  private maxHealth: number; // Store scaled max health
  private speedMultiplier: number; // Store speed multiplier
  
  // Static method to initialize event listeners
  public static initializeEventListeners(): void {
    // Set up listeners for game pause/resume events
    EventBus.on(GAME_PAUSED, () => {
      EnemyEntity.isPaused = true;
      Logger.debug('EnemyEntity: Game paused state set to true');
    });
    
    EventBus.on(GAME_RESUMED, () => {
      EnemyEntity.isPaused = false;
      Logger.debug('EnemyEntity: Game paused state set to false');
    });
  }
  
  // Static method to clean up event listeners
  public static cleanupEventListeners(): void {
    // Remove listeners when no longer needed
    EventBus.off(GAME_PAUSED, () => {});
    EventBus.off(GAME_RESUMED, () => {});
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    instanceId: string,
    config: EnemyConfig,
    maxHealth: number, // Add maxHealth parameter
    speedMultiplier: number // Add speedMultiplier parameter
  ) {
    super(scene, x, y, texture);
    this.instanceId = instanceId;
    this.configId = config.id;
    this.enemyConfig = config;
    this.maxHealth = maxHealth; // Store maxHealth
    this.speedMultiplier = speedMultiplier; // Store speedMultiplier

    // Initialize cooldown if the enemy can shoot
    if (this.enemyConfig.canShoot && this.enemyConfig.shootConfig) {
      // Start with a random delay before first shot (e.g., 0 to cooldown)
      this.shootCooldownTimer = Math.random() * this.enemyConfig.shootConfig.cooldownMs;
    }

    // Add the entity to the scene's physics and display list
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set appropriate scale for the sprite (much smaller)
    this.setScale(0.05);

    // Basic physics properties
    this.setCollideWorldBounds(true);
    // Adjust collision radius to match the new scale
    this.setCircle(config.collisionRadius * 0.1);
    // Apply speed multiplier to initial velocity
    const initialSpeed = config.baseSpeed * this.speedMultiplier;
    this.setVelocityX(initialSpeed * (Math.random() < 0.5 ? -1 : 1));
    this.setVelocityY(0); // Explicitly set initial Y velocity to 0
 
    // Set data properties for debug inspection
    this.setData('instanceId', this.instanceId);
    this.setData('objectType', 'enemy');
    this.setData('configId', this.configId);

    Logger.debug(`EnemyEntity created: ${this.configId} (Instance: ${this.instanceId})`);
  }

  // Updated to accept optional maxHealth for UI updates
  public takeDamage(amount: number, maxHealth?: number): void {
    // Use the stored maxHealth if not provided by the event
    const currentMaxHealth = maxHealth ?? this.maxHealth;
    Logger.debug(
      `Enemy ${this.instanceId} took ${amount} damage (visual placeholder). Max Health: ${currentMaxHealth}`
    );
    // Example: Flash red
    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      this.clearTint();
    });
    // Actual health is managed by EnemyManager
  }

  // Method to handle destruction (play animation, particles, etc.)
  // This is called by GameScene when ENEMY_DESTROYED event is received
  public destroySelf(): void {
    Logger.debug(`Destroying EnemyEntity: ${this.instanceId}`);
    // Disable physics body immediately
    this.disableBody(true, false); // destroyGameObject = false, hideGameObject = false

    // Emit event for the scene/handler to create the visual effect
    EventBus.emit(REQUEST_ENEMY_DESTRUCTION_EFFECT, {
      configId: this.configId,
      x: this.x,
      y: this.y,
    });

    // Destroy the game object immediately after emitting the event
    this.destroy();
  }

  // Pre-update loop for movement patterns etc.
  protected preUpdate(time: number, delta: number): void {
    // Keep delta here for super.preUpdate
    super.preUpdate(time, delta); // Pass original delta to super

    // Ensure body exists and sprite is active before processing
    if (!this.body || !this.active) {
      return;
    }

    // Only process game logic if the game is not paused
    if (!EnemyEntity.isPaused) {
      // Handle movement
      this.handleMovement(time, delta);

      // Handle shooting
      this.handleShooting(time, delta);
    }
  }

  private handleMovement(time: number, _delta: number): void {
    // Prefix unused delta
    // Ensure body exists before accessing velocity/blocked properties
    // (Redundant check due to preUpdate check, but safe)
    if (!this.body) {
      return;
    }
    // Apply speed multiplier to base speed for movement calculations
    const speed = this.enemyConfig.baseSpeed * this.speedMultiplier;

    switch (this.enemyConfig.movementPattern) {
      case 'invader_standard':
      case 'invader_support': // Treat support like standard for now
        // Reverse direction if hitting horizontal bounds
        if (this.body.blocked.right) {
          this.setVelocityX(-speed);
        } else if (this.body.blocked.left) {
          this.setVelocityX(speed);
        }
        // Ensure velocity is maintained if not blocked (it might be stopped by collision)
        // Use a small threshold to avoid floating point issues
        if (
          Math.abs(this.body.velocity.x) < speed * 0.9 &&
          (this.body.blocked.right || this.body.blocked.left)
        ) {
          // Only reset velocity if it was recently blocked and significantly slowed down
          this.setVelocityX(this.body.velocity.x >= 0 ? speed : -speed);
        } else if (
          Math.abs(this.body.velocity.x) < 1 &&
          !this.body.blocked.right &&
          !this.body.blocked.left
        ) {
          // If stopped mid-air for some reason, restart movement
          this.setVelocityX(speed * (Math.random() < 0.5 ? -1 : 1));
        }
 
        // Ensure Y velocity is 0 until close to screen, then apply drift
        if (this.y < -10) {
             this.setVelocityY(0);
        } else {
             this.setVelocityY(speed * 0.1); // Adjust multiplier as needed
        }
        break;
 
      case 'boss_weaving': {
        // Implement sine wave horizontal movement
        const frequency = 0.001; // Controls how fast the weave is (adjust as needed)
        const amplitude = speed * 1.5; // Controls how wide the weave is (adjust as needed)
        const horizontalVelocity = Math.sin(time * frequency) * amplitude;
        this.setVelocityX(horizontalVelocity);
        // Ensure Y velocity is 0 until close to screen, then apply downward movement
        if (this.y < -10) {
            this.setVelocityY(0);
        } else {
            this.setVelocityY(speed * 0.5);
        }
        break;
      }
      case 'bomber_dive': {
        // Fast downward movement, no horizontal movement for now
        if (this.body.velocity.x !== 0) this.setVelocityX(0);
        // Ensure Y velocity is 0 until close to screen, then apply dive speed
        if (this.y < -10) {
            this.setVelocityY(0);
        } else {
            this.setVelocityY(speed * 1.5); // Faster dive speed
        }
        break;
      }
      case 'strafe_horizontal': {
        // Fast horizontal movement, reverse on bounds
        if (this.body.blocked.right) {
          this.setVelocityX(-speed);
        } else if (this.body.blocked.left) {
          this.setVelocityX(speed);
        }
        // Ensure velocity is maintained if not blocked
        if (
          Math.abs(this.body.velocity.x) < speed * 0.9 &&
          (this.body.blocked.right || this.body.blocked.left)
        ) {
          this.setVelocityX(this.body.velocity.x >= 0 ? speed : -speed);
        } else if (
          Math.abs(this.body.velocity.x) < 1 &&
          !this.body.blocked.right &&
          !this.body.blocked.left
        ) {
          // If stopped mid-air, restart movement
          this.setVelocityX(speed * (Math.random() < 0.5 ? -1 : 1));
        }
        // Ensure Y velocity is 0 until close to screen, then apply slow drift
        if (this.y < -10) {
            this.setVelocityY(0);
        } else {
            this.setVelocityY(speed * 0.05); // Very slow drift
        }
        break;
      }
      default:
        // Default to simple downward movement if pattern is unknown
        Logger.warn(`Unknown movement pattern: ${this.enemyConfig.movementPattern}`);
        if (this.body.velocity.x !== 0) this.setVelocityX(0);
        // Ensure Y velocity is 0 until close to screen, then apply default speed
        if (this.y < -10) {
            this.setVelocityY(0);
        } else {
            this.setVelocityY(speed);
        }
        break;
    }
  }

  private handleShooting(time: number, _delta: number): void {
    // Prefix unused delta
    if (!this.enemyConfig.canShoot || !this.enemyConfig.shootConfig || !this.active) {
      return; // Cannot shoot or is inactive
    }

    this.shootCooldownTimer -= _delta; // Use the renamed parameter

    if (this.shootCooldownTimer <= 0) {
      // Ready to fire, but only if sufficiently on screen (y >= 50)
      if (this.y >= 50) {
        Logger.debug(`Enemy ${this.instanceId} requesting fire (y >= 50).`);
        // Ensure we have a valid scene context before accessing properties like 'x'
        if (this.scene) {
        EventBus.emit(ENEMY_REQUEST_FIRE, {
          instanceId: this.instanceId,
          x: this.x,
          y: this.getBottomCenter().y, // Fire from bottom center
            shootConfig: this.enemyConfig.shootConfig,
          });
        } else {
          Logger.error(`Enemy ${this.instanceId} tried to fire but scene context is missing.`);
        }
 
        // Reset cooldown only after a successful fire attempt (or decision not to fire)
        this.shootCooldownTimer = this.enemyConfig.shootConfig.cooldownMs;
      } else {
        // Still reset cooldown even if not far enough on screen, otherwise it might fire immediately upon reaching y=50
        this.shootCooldownTimer = this.enemyConfig.shootConfig.cooldownMs;
        Logger.debug(`Enemy ${this.instanceId} ready to fire but not far enough on screen (y=${this.y}). Cooldown reset.`);
      }
    }
  }
}
