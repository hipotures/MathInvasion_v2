import Phaser from 'phaser';
import logger from '../../core/utils/Logger';
import ProjectileManager from '../../core/managers/ProjectileManager';
import { EnemyManager } from '../../core/managers/EnemyManager';
import { ProjectileShape } from './event/ProjectileEventHandler';
// Import the separated handler functions
import {
    handlePlayerEnemyCollision,
    handlePlayerProjectileCollision,
    handlePlayerPowerupCollision
} from './collisions/PlayerCollisionHandlers';
import { handleProjectileEnemyCollision } from './collisions/ProjectileCollisionHandlers';
// Import types (no longer needed directly in this file)
// import { PlayerHitEnemyData, PlayerHitProjectileData, ProjectileHitEnemyData } from './types/Collision.types';

/**
 * Orchestrates collision handling by delegating to specialized functions.
 * Holds references to necessary game objects and managers required by the handlers.
 */
export class GameSceneCollisionHandler {
    private scene: Phaser.Scene;
    private projectileManager: ProjectileManager;
    private enemyManager: EnemyManager;
    private playerSprite: Phaser.Physics.Arcade.Sprite;
    private projectileShapes: Map<string, ProjectileShape>;
    private powerupGroup: Phaser.GameObjects.Group;
    private powerupSprites: Map<string, Phaser.Physics.Arcade.Sprite>; // Changed key to string

    // Context object to pass to handler functions
    private collisionContext: any; // Define a proper type later if needed

    constructor(
        scene: Phaser.Scene,
        projectileManager: ProjectileManager,
        enemyManager: EnemyManager,
        playerSprite: Phaser.Physics.Arcade.Sprite,
        projectileShapes: Map<string, ProjectileShape>,
        powerupGroup: Phaser.GameObjects.Group,
        powerupSprites: Map<string, Phaser.Physics.Arcade.Sprite> // Changed key to string
      ) {
        this.scene = scene;
        this.projectileManager = projectileManager;
        this.enemyManager = enemyManager;
        this.playerSprite = playerSprite;
        this.projectileShapes = projectileShapes;
        this.powerupGroup = powerupGroup;
        this.powerupSprites = powerupSprites;

        // Prepare the context object to pass to handlers
        this.collisionContext = {
            playerSprite: this.playerSprite,
            projectileShapes: this.projectileShapes,
            powerupSprites: this.powerupSprites,
            powerupGroup: this.powerupGroup,
            projectileManager: this.projectileManager,
            enemyManager: this.enemyManager
            // Add scene if needed by any handler: scene: this.scene
        };

        // Bind the wrapper methods that will call the external handlers
        this.onPlayerEnemyCollision = this.onPlayerEnemyCollision.bind(this);
        this.onProjectileEnemyCollision = this.onProjectileEnemyCollision.bind(this);
        this.onPlayerProjectileCollision = this.onPlayerProjectileCollision.bind(this);
        this.onPlayerPowerupCollision = this.onPlayerPowerupCollision.bind(this);
    }

    // --- Collision Callback Wrappers ---
    // These methods are registered with Phaser's collision system and call the external handlers

    public onPlayerEnemyCollision(object1: unknown, object2: unknown): void {
        handlePlayerEnemyCollision(object1, object2, this.collisionContext);
    }

    public onProjectileEnemyCollision(object1: unknown, object2: unknown): void {
        // Note: The context passed here might need adjustment if ProjectileCollisionContext differs significantly
        handleProjectileEnemyCollision(object1, object2, this.collisionContext);
    }

    public onPlayerProjectileCollision(object1: unknown, object2: unknown): void {
        handlePlayerProjectileCollision(object1, object2, this.collisionContext);
    }

    public onPlayerPowerupCollision(object1: unknown, object2: unknown): void {
        handlePlayerPowerupCollision(object1, object2, this.collisionContext);
    }

    // --- Cleanup ---
    public destroy(): void {
        // No listeners owned directly by this class anymore
        logger.log('GameSceneCollisionHandler destroyed.');
        // Clear context? Not strictly necessary if the instance is destroyed
        this.collisionContext = null;
    }
}
