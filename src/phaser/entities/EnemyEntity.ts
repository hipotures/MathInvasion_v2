import Phaser from 'phaser';
import { EnemyConfig } from '../../core/config/schemas/enemySchema';
import Logger from '../../core/utils/Logger'; // Use default import for Logger instance
import EventBus from '../../core/events/EventBus'; // Import EventBus instance
import { ENEMY_REQUEST_FIRE } from '../../core/constants/events'; // Import the new event

// Placeholder Enemy Entity
export class EnemyEntity extends Phaser.Physics.Arcade.Sprite {
  public instanceId: string;
  public configId: string;
  public enemyConfig: EnemyConfig; // Store the config for reference (Made public)
  private shootCooldownTimer: number = 0; // Timer for shooting cooldown

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string, // Placeholder texture key (e.g., 'vite' or a specific enemy key later)
    instanceId: string,
    config: EnemyConfig
  ) {
    super(scene, x, y, texture);
    this.instanceId = instanceId;
    this.configId = config.id;
    this.enemyConfig = config;

    // Initialize cooldown if the enemy can shoot
    if (this.enemyConfig.canShoot && this.enemyConfig.shootConfig) {
      // Start with a random delay before first shot (e.g., 0 to cooldown)
      this.shootCooldownTimer = Math.random() * this.enemyConfig.shootConfig.cooldownMs;
    }

    // Add the entity to the scene's physics and display list
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Basic physics properties (adjust as needed based on config later)
    this.setCollideWorldBounds(true); // Prevent going off-screen initially
    this.setCircle(config.collisionRadius); // Use collision radius from config
    this.setVelocityX(config.baseSpeed * (Math.random() < 0.5 ? -1 : 1)); // Simple initial horizontal movement

    // Set interactive if needed later for clicks, etc.
    // this.setInteractive();

    Logger.debug(`EnemyEntity created: ${this.configId} (Instance: ${this.instanceId})`);
  }

  // Placeholder method for taking damage (could update tint, play animation, etc.)
  public takeDamage(amount: number): void {
    Logger.debug(`Enemy ${this.instanceId} took ${amount} damage (visual placeholder)`);
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

    // Add a simple tween effect: flash red and shrink
    this.scene.tweens.add({
      targets: this,
      duration: 150, // ms
      scaleX: 0.1,
      scaleY: 0.1,
      angle: 180,
      alpha: 0.5,
      tint: 0xff0000, // Flash red
      ease: 'Power2',
      onComplete: () => {
        // Use destroy() which removes from scene and cleans up listeners
        this.destroy();
      },
    });
  }

  // Pre-update loop for movement patterns etc.
  protected preUpdate(time: number, delta: number): void {
    // Keep delta here for super.preUpdate
    super.preUpdate(time, delta); // Pass original delta to super

    // Ensure body exists and sprite is active before processing
    if (!this.body || !this.active) {
      return;
    }

    // Handle movement
    this.handleMovement(time, delta);

    // Handle shooting
    this.handleShooting(time, delta);
  }

  private handleMovement(time: number, _delta: number): void {
    // Prefix unused delta
    // Ensure body exists before accessing velocity/blocked properties
    // (Redundant check due to preUpdate check, but safe)
    if (!this.body) {
      return;
    }
    const speed = this.enemyConfig.baseSpeed;

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

        // Add a slight downward drift
        this.setVelocityY(speed * 0.1); // Adjust multiplier as needed
        break;

      case 'boss_weaving': {
        // Implement sine wave horizontal movement
        const frequency = 0.001; // Controls how fast the weave is (adjust as needed)
        const amplitude = speed * 1.5; // Controls how wide the weave is (adjust as needed)
        const horizontalVelocity = Math.sin(time * frequency) * amplitude;
        this.setVelocityX(horizontalVelocity);
        this.setVelocityY(speed * 0.5); // Maintain slower downward movement
        break;
      }
      case 'bomber_dive': {
        // Fast downward movement, no horizontal movement for now
        if (this.body.velocity.x !== 0) this.setVelocityX(0);
        this.setVelocityY(speed * 1.5); // Faster dive speed
        break;
      }
      default:
        // Default to simple downward movement if pattern is unknown
        Logger.warn(`Unknown movement pattern: ${this.enemyConfig.movementPattern}`);
        if (this.body.velocity.x !== 0) this.setVelocityX(0);
        this.setVelocityY(speed);
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
      // Ready to fire
      Logger.debug(`Enemy ${this.instanceId} requesting fire.`);
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

      // Reset cooldown
      this.shootCooldownTimer = this.enemyConfig.shootConfig.cooldownMs;
    }
  }
}
