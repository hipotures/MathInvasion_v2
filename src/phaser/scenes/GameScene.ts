import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import { GameSceneEventHandler } from '../handlers/GameSceneEventHandler';
import { GameSceneAreaEffectHandler } from '../handlers/GameSceneAreaEffectHandler';
import { GameSceneDebugHandler } from '../handlers/GameSceneDebugHandler';
import { DebugObjectInspector } from '../../core/utils/debug/DebugObjectInspector';
import { EnemyEntity } from '../entities/EnemyEntity';
import * as Events from '../../core/constants/events';

// Import our new components
import { GameSceneInitializer } from './components/GameSceneInitializer';
import { GameSceneEventManager } from './components/GameSceneEventManager';
import { GameSceneCollisionManager } from './components/GameSceneCollisionManager';
import { GameSceneSpawner } from './components/GameSceneSpawner';
import { GameManagers, GameObjects } from './types/GameSceneTypes';

/**
 * Main game scene that orchestrates the game components
 */
export default class GameScene extends Phaser.Scene {
  // Core components
  private initializer!: GameSceneInitializer;
  private eventManager!: GameSceneEventManager;
  private collisionManager!: GameSceneCollisionManager;
  private spawner!: GameSceneSpawner;
  
  // Managers
  private managers!: GameManagers;
  
  // Game objects
  private gameObjects!: GameObjects;
  
  // Handlers
  private collisionHandler!: any; // GameSceneCollisionHandler
  private eventHandler!: any; // GameSceneEventHandler
  private areaEffectHandler!: any; // GameSceneAreaEffectHandler
  private debugHandler!: any; // GameSceneDebugHandler

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    logger.log('GameScene preload');
    
    // Create initializer
    this.initializer = new GameSceneInitializer(this);
    
    // Preload assets
    this.initializer.preloadAssets();
  }

  create(): void {
    logger.log('GameScene create');
    
    // Initialize game components
    const { managers, objects } = this.initializer.initialize();
    this.managers = managers;
    this.gameObjects = objects;
    
    // Create handlers
    this.createHandlers();
    
    // Create components
    this.createComponents();
    
    // Setup components
    this.setupComponents();
    
    // Initialize static event listeners for EnemyEntity
    EnemyEntity.initializeEventListeners();
    
    // REMOVED: this.input.ignorePause = true;

    // Launch UI scene
    this.scene.launch('UIScene');
    logger.log('Launched UIScene');
  }

  update(time: number, delta: number): void {
    // Only update game logic if not paused
    if (!this.eventManager.isPauseActive()) {
      // Update core managers (pass delta in milliseconds)
      this.managers.inputManager.update(delta);
      this.managers.playerManager.update(delta);
      this.managers.weaponManager.update(delta);
      this.managers.projectileManager.update(delta);
      this.managers.enemyManager.update(delta);
      this.managers.powerupManager.update(delta);
    }

    // Always update debug visuals, even when paused
    // Ensure debugHandler exists before calling update
    if (this.debugHandler) {
        this.debugHandler.updateDebugVisuals();
    }
  }

  /**
   * Creates the game handlers
   */
  private createHandlers(): void {
    // Create collision handler
    this.collisionHandler = GameSceneCollisionManager.createCollisionHandler(
      {
        scene: this,
        playerSprite: this.gameObjects.playerSprite,
        enemyGroup: this.gameObjects.enemyGroup,
        projectileGroup: this.gameObjects.projectileGroup,
        powerupGroup: this.gameObjects.powerupGroup
      },
      this.managers.projectileManager,
      this.managers.enemyManager,
      this.gameObjects.projectileShapes,
      this.gameObjects.powerupSprites
    );
    
    // Create event handler
    this.eventHandler = new GameSceneEventHandler(
      this,
      this.gameObjects.playerSprite,
      this.gameObjects.projectileGroup,
      this.gameObjects.enemyGroup,
      this.gameObjects.powerupGroup,
      this.gameObjects.enemySprites,
      this.gameObjects.projectileShapes,
      this.gameObjects.powerupSprites
    );
    
    // Create area effect handler
    this.areaEffectHandler = new GameSceneAreaEffectHandler(
      this, 
      this.gameObjects.playerSprite
    );
    
    // Create debug object inspector
    const debugObjectInspector = new DebugObjectInspector(
      this.managers.playerManager,
      this.managers.weaponManager,
      this.managers.enemyManager,
      this.managers.projectileManager,
      this.managers.powerupManager,
      this.managers.economyManager
    );
    
    // Create debug handler
    this.debugHandler = new GameSceneDebugHandler(
      this,
      this.gameObjects.playerSprite,
      this.gameObjects.enemySprites,
      this.gameObjects.projectileShapes,
      this.gameObjects.powerupSprites,
      this.managers.playerManager,
      this.managers.weaponManager,
      this.managers.enemyManager,
      this.managers.projectileManager,
      this.managers.powerupManager,
      this.managers.economyManager,
      this.managers.debugManager,
      debugObjectInspector
    );
  }

  /**
   * Creates the game components
   */
  private createComponents(): void {
    // Create event manager
    this.eventManager = new GameSceneEventManager(this, this.gameObjects);
    
    // Create collision manager
    this.collisionManager = new GameSceneCollisionManager(
      this,
      this.collisionHandler,
      this.gameObjects
    );
    
    // Create spawner
    this.spawner = new GameSceneSpawner({
      scene: this,
      enemyManager: this.managers.enemyManager,
      worldBounds: {
        width: this.cameras.main.width,
        height: this.cameras.main.height
      }
    });
  }

  /**
   * Sets up the game components
   */
  private setupComponents(): void {
    // Setup event listeners
    this.eventManager.setupEventListeners();
    
    // Setup collisions
    this.collisionManager.setupCollisions();
    
    // Setup enemy spawner
    const spawnerTimer = this.spawner.setupEnemySpawner();
    
    // Pass the timer reference to the event handler so it can stop it on player death
    if (this.eventHandler && typeof this.eventHandler.setEnemySpawnerTimer === 'function') {
        this.eventHandler.setEnemySpawnerTimer(spawnerTimer);
    }
    
    // Pass the timer to the event manager
    if (this.eventManager && typeof this.eventManager.setEnemySpawnerTimer === 'function') {
        this.eventManager.setEnemySpawnerTimer(spawnerTimer);
    }
    
    // Setup shutdown cleanup
    this.initializer.setupShutdownCleanup(
      this.managers,
      {
        collisionHandler: this.collisionHandler,
        eventHandler: this.eventHandler,
        areaEffectHandler: this.areaEffectHandler,
        debugHandler: this.debugHandler,
        eventManager: this.eventManager,
        collisionManager: this.collisionManager,
        spawner: this.spawner
      }
    );
  }
}
