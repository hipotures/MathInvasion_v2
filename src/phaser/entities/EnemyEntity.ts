import Phaser from 'phaser';
import { EnemyConfig } from '../../core/config/schemas/enemySchema';
import Logger from '../../core/utils/Logger'; // Use default import for Logger instance

// Placeholder Enemy Entity
export class EnemyEntity extends Phaser.Physics.Arcade.Sprite {
  public instanceId: string;
  public configId: string;
  public enemyConfig: EnemyConfig; // Store the config for reference (Made public)

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
    // TODO: Add explosion animation/particles
    this.destroy(); // Phaser's destroy method
  }

  // Pre-update loop (optional, for movement patterns etc.)
  // protected preUpdate(time: number, delta: number): void {
  //   super.preUpdate(time, delta);
  //   // Implement movement patterns based on this.enemyConfig.movementPattern
  // }
}
