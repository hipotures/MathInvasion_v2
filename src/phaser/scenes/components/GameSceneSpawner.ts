import Phaser from 'phaser';
import logger from '../../../core/utils/Logger';
import { EnemyManager } from '../../../core/managers/EnemyManager';
import { SpawnerConfig } from '../types/GameSceneTypes';

/**
 * Handles enemy spawning for the game scene
 */
export class GameSceneSpawner {
  private scene: Phaser.Scene;
  private enemyManager: EnemyManager;
  private spawnerTimer: Phaser.Time.TimerEvent | null = null;
  private worldBounds: { width: number; height: number };
  private spawnPadding: number = 50;

  constructor(config: SpawnerConfig) {
    this.scene = config.scene;
    this.enemyManager = config.enemyManager;
    this.worldBounds = config.worldBounds;
  }

  /**
   * Sets up the enemy spawner
   * @param delay The delay between spawns in milliseconds
   * @returns The created timer
   */
  public setupEnemySpawner(delay: number = 2000): Phaser.Time.TimerEvent {
    logger.debug(`GameSceneSpawner: Setting up enemy spawner with ${delay}ms delay`);
    
    this.spawnerTimer = this.scene.time.addEvent({
      delay: delay,
      callback: this.spawnRandomEnemy,
      callbackScope: this,
      loop: true,
    });
    
    return this.spawnerTimer;
  }

  /**
   * Spawns a random enemy
   */
  private spawnRandomEnemy(): void {
    // TODO: Use difficulty config
    const enemyTypes = ['triangle_scout', 'square_tank', 'hexagon_bomber', 'diamond_strafer'];
    const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    
    const spawnX = Phaser.Math.Between(
      this.spawnPadding, 
      this.worldBounds.width - this.spawnPadding
    );
    
    const spawnY = Phaser.Math.Between(
      this.spawnPadding, 
      this.worldBounds.height / 3
    );
    
    this.enemyManager.spawnEnemy(randomType, { x: spawnX, y: spawnY });
    
    logger.debug(`GameSceneSpawner: Spawned ${randomType} at (${spawnX}, ${spawnY})`);
  }

  /**
   * Spawns a specific enemy type
   * @param enemyType The type of enemy to spawn
   * @param position The position to spawn at
   */
  public spawnEnemy(enemyType: string, position: { x: number; y: number }): void {
    this.enemyManager.spawnEnemy(enemyType, position);
    logger.debug(`GameSceneSpawner: Spawned ${enemyType} at (${position.x}, ${position.y})`);
  }

  /**
   * Sets the spawn padding
   * @param padding The padding from the edges of the screen
   */
  public setSpawnPadding(padding: number): void {
    this.spawnPadding = padding;
  }

  /**
   * Pauses the spawner
   */
  public pause(): void {
    if (this.spawnerTimer) {
      this.spawnerTimer.paused = true;
      logger.debug('GameSceneSpawner: Spawner paused');
    }
  }

  /**
   * Resumes the spawner
   */
  public resume(): void {
    if (this.spawnerTimer) {
      this.spawnerTimer.paused = false;
      logger.debug('GameSceneSpawner: Spawner resumed');
    }
  }

  /**
   * Cleans up resources used by this spawner
   */
  public destroy(): void {
    if (this.spawnerTimer) {
      this.spawnerTimer.destroy();
      this.spawnerTimer = null;
    }
    
    logger.log('GameSceneSpawner destroyed');
  }
}