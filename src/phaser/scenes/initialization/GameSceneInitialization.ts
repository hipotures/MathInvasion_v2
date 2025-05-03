import Phaser from 'phaser';
import logger from '../../../core/utils/Logger';
import { GameSceneCollisionHandler } from '../../handlers/GameSceneCollisionHandler';
import { GameSceneEventHandler } from '../../handlers/GameSceneEventHandler';
import { GameSceneAreaEffectHandler } from '../../handlers/GameSceneAreaEffectHandler';
import { GameSceneDebugHandler } from '../../handlers/GameSceneDebugHandler';
import { DebugObjectInspector } from '../../../core/utils/debug/DebugObjectInspector';
import { GameSceneEventManager } from '../components/GameSceneEventManager';
import { GameSceneCollisionManager } from '../components/GameSceneCollisionManager';
import { GameSceneSpawner } from '../components/GameSceneSpawner';
import { GameManagers, GameObjects, GameHandlers, GameComponents } from '../types/GameSceneTypes';
import { GameSceneInitializer as CoreInitializer } from '../components/GameSceneInitializer'; // Alias original initializer

/**
 * Handles the creation and setup of handlers and components within the GameScene.
 * This complements the CoreInitializer which handles asset loading and manager/object creation.
 */
export class GameSceneInitialization {
    private scene: Phaser.Scene;
    private managers: GameManagers;
    private gameObjects: GameObjects;
    private coreInitializer: CoreInitializer; // Keep reference to original initializer for cleanup setup

    constructor(
        scene: Phaser.Scene,
        managers: GameManagers,
        gameObjects: GameObjects,
        coreInitializer: CoreInitializer
    ) {
        this.scene = scene;
        this.managers = managers;
        this.gameObjects = gameObjects;
        this.coreInitializer = coreInitializer;
    }

    /**
     * Creates all game-specific handlers.
     * @returns An object containing the created handlers.
     */
    public createHandlers(): GameHandlers {
        logger.log('Creating GameScene Handlers...');
        // Create collision handler
        const collisionHandler = GameSceneCollisionManager.createCollisionHandler(
            {
                scene: this.scene,
                playerSprite: this.gameObjects.playerSprite,
                enemyGroup: this.gameObjects.enemyGroup,
                projectileGroup: this.gameObjects.projectileGroup,
                powerupGroup: this.gameObjects.powerupGroup
            },
            this.managers.projectileManager,
            this.managers.enemyManager,
            this.gameObjects.projectileShapes,
            this.gameObjects.powerupSprites // Now Map<string, Sprite>
        );

        // Create event handler
        const eventHandler = new GameSceneEventHandler(
            this.scene,
            this.gameObjects.playerSprite,
            this.gameObjects.projectileGroup,
            this.gameObjects.enemyGroup,
            this.gameObjects.powerupGroup,
            this.gameObjects.enemySprites,
            this.gameObjects.projectileShapes,
            this.gameObjects.powerupSprites // Now Map<string, Sprite>
        );

        // Create area effect handler
        const areaEffectHandler = new GameSceneAreaEffectHandler(
            this.scene,
            this.gameObjects.playerSprite
        );

        // Create debug object inspector
        const debugObjectInspector = new DebugObjectInspector(
            this.managers.playerManager,
            this.managers.weaponManager,
            this.managers.enemyManager,
            this.managers.projectileManager,
            this.managers.powerupManager,
            this.managers.economyManager,
            this.gameObjects.powerupSprites // Now Map<string, Sprite>
        );

        // Create debug handler
        const debugHandler = new GameSceneDebugHandler(
            this.scene,
            this.gameObjects.playerSprite,
            this.gameObjects.enemySprites,
            this.gameObjects.projectileShapes,
            this.gameObjects.powerupSprites, // Now Map<string, Sprite>
            this.managers.playerManager,
            this.managers.weaponManager,
            this.managers.enemyManager,
            this.managers.projectileManager,
            this.managers.powerupManager,
            this.managers.economyManager,
            this.managers.debugManager,
            debugObjectInspector
        );

        return { collisionHandler, eventHandler, areaEffectHandler, debugHandler };
    }

    /**
     * Creates the core scene components (managers, spawner).
     * @param handlers The handlers created by createHandlers.
     * @returns An object containing the created components.
     */
    public createComponents(handlers: GameHandlers): GameComponents {
         logger.log('Creating GameScene Components...');
        // Create event manager
        const eventManager = new GameSceneEventManager(this.scene, this.gameObjects);

        // Create collision manager
        const collisionManager = new GameSceneCollisionManager(
            this.scene,
            handlers.collisionHandler, // Use handler passed in
            this.gameObjects,
            this.managers.enemyManager,
            this.managers.projectileManager
        );

        // Create spawner
        const spawner = new GameSceneSpawner({
            scene: this.scene,
            enemyManager: this.managers.enemyManager,
            worldBounds: {
                width: this.scene.cameras.main.width,
                height: this.scene.cameras.main.height
            }
        });

        return { eventManager, collisionManager, spawner };
    }

    /**
     * Sets up the created components (event listeners, collisions, spawner timer).
     * @param components The components created by createComponents.
     * @param handlers The handlers created by createHandlers.
     */
    public setupComponents(components: GameComponents, handlers: GameHandlers): void {
         logger.log('Setting up GameScene Components...');
        // Setup event listeners
        components.eventManager.setupEventListeners();

        // Setup collisions
        components.collisionManager.setupCollisions();

        // Setup enemy spawner
        const spawnerTimer = components.spawner.setupEnemySpawner();

        // Pass the timer reference to handlers/managers that need it
        if (handlers.eventHandler && typeof handlers.eventHandler.setEnemySpawnerTimer === 'function') {
            handlers.eventHandler.setEnemySpawnerTimer(spawnerTimer);
        }
        if (components.eventManager && typeof components.eventManager.setEnemySpawnerTimer === 'function') {
            components.eventManager.setEnemySpawnerTimer(spawnerTimer);
        }

        // Setup shutdown cleanup using the original initializer's method
        this.coreInitializer.setupShutdownCleanup(
            this.managers,
            { ...handlers, ...components } // Combine handlers and components for cleanup
        );
    }
}