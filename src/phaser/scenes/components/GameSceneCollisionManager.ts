import Phaser from 'phaser';
import logger from '../../../core/utils/Logger';
import { GameSceneCollisionHandler } from '../../handlers/GameSceneCollisionHandler';
import { GameObjects, CollisionConfig } from '../types/GameSceneTypes';

/**
 * Handles collision setup and detection for the game scene
 */
export class GameSceneCollisionManager {
  private scene: Phaser.Scene;
  private collisionHandler: GameSceneCollisionHandler;
  private gameObjects: GameObjects;

  constructor(
    scene: Phaser.Scene, 
    collisionHandler: GameSceneCollisionHandler,
    gameObjects: GameObjects
  ) {
    this.scene = scene;
    this.collisionHandler = collisionHandler;
    this.gameObjects = gameObjects;
  }

  /**
   * Sets up collision detection between game objects
   */
  public setupCollisions(): void {
    logger.debug('GameSceneCollisionManager: Setting up collisions');
    
    // Player vs Enemy collisions
    this.scene.physics.overlap(
      this.gameObjects.playerSprite,
      this.gameObjects.enemyGroup,
      this.collisionHandler.handlePlayerEnemyCollision,
      undefined,
      this.collisionHandler
    );

    // Projectile vs Enemy collisions
    this.scene.physics.overlap(
      this.gameObjects.projectileGroup,
      this.gameObjects.enemyGroup,
      this.collisionHandler.handleProjectileEnemyCollision,
      undefined,
      this.collisionHandler
    );

    // Player vs Projectile collisions
    this.scene.physics.overlap(
      this.gameObjects.playerSprite,
      this.gameObjects.projectileGroup,
      this.collisionHandler.handlePlayerProjectileCollision,
      undefined,
      this.collisionHandler
    );

    // Player vs Powerup collisions
    this.scene.physics.overlap(
      this.gameObjects.playerSprite,
      this.gameObjects.powerupGroup,
      this.collisionHandler.handlePlayerPowerupCollision,
      undefined,
      this.collisionHandler
    );
    
    logger.debug('GameSceneCollisionManager: Collisions setup complete');
  }

  /**
   * Creates a collision handler for the game scene
   * @param config The collision configuration
   * @returns The created collision handler
   */
  public static createCollisionHandler(
    config: CollisionConfig,
    projectileManager: any,
    enemyManager: any,
    projectileShapes: Map<string, any>,
    powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>
  ): GameSceneCollisionHandler {
    return new GameSceneCollisionHandler(
      config.scene,
      projectileManager,
      enemyManager,
      config.playerSprite,
      projectileShapes,
      config.powerupGroup,
      powerupSprites
    );
  }

  /**
   * Cleans up resources used by this manager
   */
  public destroy(): void {
    // No specific cleanup needed for collisions as they're handled by the scene
    logger.log('GameSceneCollisionManager destroyed');
  }
}