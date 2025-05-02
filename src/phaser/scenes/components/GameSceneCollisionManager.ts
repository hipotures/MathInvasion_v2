import Phaser from 'phaser';
import logger from '../../../core/utils/Logger';
import { GameSceneCollisionHandler } from '../../handlers/GameSceneCollisionHandler';
import { GameObjects, CollisionConfig } from '../types/GameSceneTypes';
import { EnemyManager } from '../../../core/managers/EnemyManager';
import ProjectileManager from '../../../core/managers/ProjectileManager';
import { EnemyEntity } from '../../entities/EnemyEntity'; // Added back import

/**
 * Handles collision setup and detection for the game scene
 */
export class GameSceneCollisionManager {
  private scene: Phaser.Scene;
  private collisionHandler: GameSceneCollisionHandler;
  private gameObjects: GameObjects;
  // Keep manager references if needed elsewhere, though not strictly for collision setup now
  private enemyManager: EnemyManager;
  private projectileManager: ProjectileManager;

  constructor(
    scene: Phaser.Scene,
    collisionHandler: GameSceneCollisionHandler,
    gameObjects: GameObjects,
    enemyManager: EnemyManager,
    projectileManager: ProjectileManager
  ) {
    this.scene = scene;
    this.collisionHandler = collisionHandler;
    this.gameObjects = gameObjects;
    this.enemyManager = enemyManager;
    this.projectileManager = projectileManager;
  }

  /**
   * Sets up collision detection between game objects
   */
  public setupCollisions(): void {
    logger.debug('GameSceneCollisionManager: Setting up collisions');

    // Player vs Enemy collisions (collider)
    this.scene.physics.add.collider(
      this.gameObjects.playerSprite,
      this.gameObjects.enemyGroup,
      (player, enemy) => { // Use inline arrow function
        this.collisionHandler.handlePlayerEnemyCollision(player, enemy);
      },
      undefined, // processCallback
      this // Context for the collider function itself
    );

    // Projectile vs Enemy collisions (collider) - Stops projectiles
    this.scene.physics.add.collider(
      this.gameObjects.projectileGroup,
      this.gameObjects.enemyGroup,
      (projectileGO, enemyGO) => {
          // Attempt to cast and get IDs
          const projId = (projectileGO as Phaser.GameObjects.Shape)?.getData('instanceId') ?? 'unknown_proj';
          const enemyId = (enemyGO as EnemyEntity)?.instanceId ?? 'unknown_enemy';
          // Use logger instead of console.log
          logger.debug(`Collision detected: Projectile [${projId}] vs Enemy [${enemyId}]`);
          // Re-enable the handler call
          this.collisionHandler.handleProjectileEnemyCollision(projectileGO, enemyGO);
      },
      undefined, // processCallback
      this // Context for the collider function itself
    );

    // Player vs Projectile collisions (collider)
    this.scene.physics.add.collider(
      this.gameObjects.playerSprite,
      this.gameObjects.projectileGroup,
      (player, projectileShape) => { // Use inline arrow function, rename projectile to projectileShape
        // This callback now only runs if processCallback returns true
        this.collisionHandler.handlePlayerProjectileCollision(player, projectileShape);
      },
      (player, projectileShape) => { // processCallback
          // Retrieve the owner from the projectile shape's data
          const owner = (projectileShape as Phaser.GameObjects.Shape)?.getData('owner');
          // Only process the collision if the owner is 'enemy'
          const shouldCollide = owner === 'enemy';
          if (!shouldCollide) {
              // If it's a player projectile, log for debugging (optional)
              // const projId = (projectileShape as Phaser.GameObjects.Shape)?.getData('instanceId') ?? 'unknown_proj';
              // logger.debug(`Ignoring collision: Player vs Player Projectile [${projId}]`);
          }
          return shouldCollide;
      },
      this // Context for the collider/process callbacks
    );

    // --- Player vs Powerup overlap setup REMOVED ---
    // The standard physics.add.overlap was not firing the callback.
    // Overlap detection and handling will be done manually in GameScene.update
    // using the debugLogPotentialOverlaps logic.
    // logger.warn('[CollisionManager] Player vs Powerup overlap setup skipped. Using manual check in GameScene.update.'); // Warning removed
    // --- End REMOVED ---

    logger.debug('GameSceneCollisionManager: Collisions setup complete');
  } // <-- Added missing closing brace for setupCollisions

  /**
   * Creates a collision handler for the game scene
   * @param config The collision configuration
   * @returns The created collision handler
   */
  // This static method might be better placed elsewhere or refactored,
  // but keeping it for now to minimize structural changes.
  public static createCollisionHandler(
    config: CollisionConfig,
    projectileManager: ProjectileManager, // Use specific type
    enemyManager: EnemyManager,       // Use specific type
    projectileShapes: Map<string, Phaser.GameObjects.Shape>, // Use specific type
    powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>
  ): GameSceneCollisionHandler {
    return new GameSceneCollisionHandler(
      config.scene,
      projectileManager,
      enemyManager,
      config.playerSprite,
      projectileShapes, // Pass the map
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