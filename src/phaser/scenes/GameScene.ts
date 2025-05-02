import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import { GameSceneCollisionHandler } from '../handlers/GameSceneCollisionHandler'; // Import correct handler
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
  private collisionHandler!: GameSceneCollisionHandler; // Fixed type
  private eventHandler!: GameSceneEventHandler; // Fixed type
  private areaEffectHandler!: GameSceneAreaEffectHandler; // Fixed type
  private debugHandler!: GameSceneDebugHandler; // Fixed type

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

      // Removed: Process end-of-frame logic for collision manager (laser overlap tracking)
      // this.collisionManager.processEndOfFrame();
    }

    // Always update debug visuals, even when paused
    // Ensure debugHandler exists before calling update
    if (this.debugHandler) {
        this.debugHandler.updateDebugVisuals();
        // --- MANUAL OVERLAP CHECK & HANDLING ---
        this.triggerManualPowerupOverlap(); // Renamed for clarity
        // --- END MANUAL OVERLAP CHECK ---
    }

    // --- Powerup Out-of-Bounds Check --- // Moved check outside debugHandler block
    this.checkPowerupsOutOfBounds();
    // --- End Powerup Check ---
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
      this.gameObjects.enemySprites, // Pass enemySprites map
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
      this.managers.economyManager,
      this.gameObjects.powerupSprites // Pass the powerupSprites map
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
      this.gameObjects,
      // --- Added managers ---
      this.managers.enemyManager,
      this.managers.projectileManager
      // --- End added ---
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

  // --- Helper for Manual Powerup Overlap Check & Handling ---
  private triggerManualPowerupOverlap(): void {
    // Only run if necessary components exist
    if (!this.gameObjects?.playerSprite?.body || !this.gameObjects?.powerupGroup) {
      return;
    }

    const playerBody = this.gameObjects.playerSprite.body as Phaser.Physics.Arcade.Body;
    // Ensure player body is valid for checks
    if (!playerBody.enable || !playerBody.isCircle || playerBody.radius <= 0) {
        return;
    }
    const playerRadius = playerBody.radius;
    const playerCenter = playerBody.center;

    this.gameObjects.powerupGroup.children.each((powerupGO) => {
      const powerupSprite = powerupGO as Phaser.Physics.Arcade.Sprite;
      // Check if powerup sprite and its body are active and valid
      if (powerupSprite.active && powerupSprite.body) {
        const powerupBody = powerupSprite.body as Phaser.Physics.Arcade.Body;
        if (powerupBody.enable && powerupBody.isCircle && powerupBody.radius > 0) {
          const powerupRadius = powerupBody.radius;
          const powerupCenter = powerupBody.center;
          const distance = Phaser.Math.Distance.Between(
            playerCenter.x, playerCenter.y,
            powerupCenter.x, powerupCenter.y
          );
          const radiiSum = playerRadius + powerupRadius;

          // Log if distance indicates potential overlap
          if (distance < radiiSum) {
            // Check if the overlap callback *should* have fired this frame
            // Note: This is a simplified check; Phaser's internal checks are more complex
            const shouldOverlap = playerBody.enable && powerupBody.enable &&
                                  !(playerBody.checkCollision.none || powerupBody.checkCollision.none) &&
                                  Phaser.Geom.Intersects.CircleToCircle(
                                      new Phaser.Geom.Circle(playerCenter.x, playerCenter.y, playerRadius),
                                      new Phaser.Geom.Circle(powerupCenter.x, powerupCenter.y, powerupRadius)
                                  );

            // --- TRIGGER HANDLER MANUALLY ---
            // If our manual check says they should overlap, call the handler directly
            if (shouldOverlap) {
                // logger.log(`[GameScene Update] MANUAL OVERLAP TRIGGER! Dist: ${distance.toFixed(2)}, RadiiSum: ${radiiSum.toFixed(2)}`); // Optional: Keep for debugging
                this.collisionHandler.handlePlayerPowerupCollision(this.gameObjects.playerSprite, powerupSprite);
            }
            // --- END MANUAL TRIGGER ---
            // Removed original detailed log block
          }
        }
      }
      // Explicitly return true to satisfy EachSetCallback type
      return true;
    });
  }
  // --- End Helper ---

  // --- Helper for Powerup Out-of-Bounds Check ---
  private checkPowerupsOutOfBounds(): void {
    if (!this.gameObjects?.powerupGroup) return;

    const gameHeight = this.cameras.main.height;
    const removalMargin = 50; // How far below the screen before removing

    const powerupsToRemove: Phaser.Physics.Arcade.Sprite[] = [];

    this.gameObjects.powerupGroup.children.each((powerupGO) => {
      const powerupSprite = powerupGO as Phaser.Physics.Arcade.Sprite;
      if (powerupSprite.y > gameHeight + removalMargin) {
        powerupsToRemove.push(powerupSprite);
      }
      return true; // Continue iteration
    });

    powerupsToRemove.forEach(powerupSprite => {
      const instanceId = powerupSprite.getData('instanceId');
      if (instanceId !== undefined) {
        logger.debug(`Powerup ${instanceId} out of bounds, destroying.`);
        // Emit event for PowerupManager cleanup BEFORE destroying sprite/removing from map
        eventBus.emit(Events.POWERUP_OUT_OF_BOUNDS, { instanceId });
        this.gameObjects.powerupSprites.delete(instanceId);
      } else {
        logger.warn('Found out-of-bounds powerup sprite without instanceId, destroying anyway.');
      }
      powerupSprite.destroy(); // Destroy the sprite (implicitly removes from group)
    });
  }
  // --- End Helper ---
}
