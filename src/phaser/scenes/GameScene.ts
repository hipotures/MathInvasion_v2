import Phaser from 'phaser';

import logger from '../../core/utils/Logger';

import { GameSceneInitializer as CoreInitializer } from './components/GameSceneInitializer';
import { EnemyEntity } from '../entities/EnemyEntity';
import { GameSceneInitialization } from './initialization/GameSceneInitialization';
import { GameComponents, GameHandlers, GameManagers, GameObjects } from './types/GameSceneTypes';
import { GameSceneUpdate } from './update/GameSceneUpdate';

/**
 * Main game scene that orchestrates the game components.
 * Delegates initialization and update logic to specialized classes.
 */
export default class GameScene extends Phaser.Scene {
    // Core Initializer (handles assets, managers, game objects)
    private coreInitializer!: CoreInitializer;
    // New Initializer (handles handlers, components setup)
    private sceneInitializer!: GameSceneInitialization;
    // New Update Handler
    private sceneUpdater!: GameSceneUpdate;

    // Properties to hold created instances (still needed for passing around)
    private managers!: GameManagers;
    private gameObjects!: GameObjects;
    private handlers!: GameHandlers;
    private components!: GameComponents;

    constructor() {
        super({ key: 'GameScene' });
    }

    preload(): void {
        logger.log('GameScene preload');
        // Create the core initializer
        this.coreInitializer = new CoreInitializer(this);
        // Preload assets using the core initializer
        this.coreInitializer.preloadAssets();
    }

    create(): void {
        logger.log('GameScene create');

        // 1. Use Core Initializer to create managers and game objects
        const { managers, objects } = this.coreInitializer.initialize();
        this.managers = managers;
        this.gameObjects = objects;

        // 2. Create the new Scene Initializer, passing necessary instances
        this.sceneInitializer = new GameSceneInitialization(
            this,
            this.managers,
            this.gameObjects,
            this.coreInitializer // Pass core initializer for cleanup setup
        );

        // 3. Use Scene Initializer to create handlers and components
        this.handlers = this.sceneInitializer.createHandlers();
        this.components = this.sceneInitializer.createComponents(this.handlers);

        // 4. Use Scene Initializer to set up components (listeners, collisions, etc.)
        this.sceneInitializer.setupComponents(this.components, this.handlers);

        // 5. Create the Scene Updater
        this.sceneUpdater = new GameSceneUpdate(
            this,
            this.managers,
            this.gameObjects,
            this.handlers,
            this.components
        );

        // Initialize static event listeners for EnemyEntity (can remain here or move)
        EnemyEntity.initializeEventListeners();

        // Launch UI scene
        this.scene.launch('UIScene');
        logger.log('Launched UIScene');
    }

    update(time: number, delta: number): void {
        // Delegate update logic to the scene updater
        if (this.sceneUpdater) {
            this.sceneUpdater.update(time, delta);
        }
    }

    // Removed createHandlers, createComponents, setupComponents
    // Removed triggerManualPowerupOverlap, checkPowerupsOutOfBounds
    // These are now handled by GameSceneInitialization and GameSceneUpdate
}
