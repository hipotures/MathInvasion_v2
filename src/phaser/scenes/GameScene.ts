import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
// Managers are now initialized via the helper
import PlayerManager from '../../core/managers/PlayerManager';
import InputManager from '../../core/managers/InputManager';
import WeaponManager from '../../core/managers/WeaponManager';
import ProjectileManager from '../../core/managers/ProjectileManager';
import EconomyManager from '../../core/managers/EconomyManager';
import { EnemyManager } from '../../core/managers/EnemyManager';
import { PowerupManager } from '../../core/managers/PowerupManager';
import DebugManager from '../../core/managers/DebugManager';
// import debugState from '../../core/utils/DebugState'; // Removed unused import
// import configLoader from '../../core/config/ConfigLoader'; // No longer needed directly here
import { EnemyEntity } from '../entities/EnemyEntity';
import { GameSceneCollisionHandler } from '../handlers/GameSceneCollisionHandler';
import { GameSceneEventHandler } from '../handlers/GameSceneEventHandler';
// Import ProjectileShape type
import { ProjectileShape } from '../handlers/event/ProjectileEventHandler';
import { GameSceneAreaEffectHandler } from '../handlers/GameSceneAreaEffectHandler';
import { GameSceneDebugHandler } from '../handlers/GameSceneDebugHandler';
import { initializeGameManagers, GameManagers } from '../initializers/GameSceneManagerInitializer';
// Event constants
import * as Events from '../../core/constants/events';
// Asset constants
import * as Assets from '../../core/constants/assets';

export default class GameScene extends Phaser.Scene {
  // Core Managers
  private playerManager!: PlayerManager;
  private inputManager!: InputManager;
  private weaponManager!: WeaponManager;
  private projectileManager!: ProjectileManager;
  private economyManager!: EconomyManager;
  private enemyManager!: EnemyManager;
  private powerupManager!: PowerupManager;
  private debugManager!: DebugManager;
  private collisionHandler!: GameSceneCollisionHandler;
  private eventHandler!: GameSceneEventHandler;
  private areaEffectHandler!: GameSceneAreaEffectHandler;
  private debugHandler!: GameSceneDebugHandler;

  // Game Objects
  private playerSprite!: Phaser.Physics.Arcade.Sprite;
  private enemyGroup!: Phaser.GameObjects.Group;
  private projectileGroup!: Phaser.GameObjects.Group;
  private powerupGroup!: Phaser.GameObjects.Group;
  // Rename and update type for projectile map
  private projectileShapes: Map<string, ProjectileShape> = new Map();
  private enemySprites: Map<string, EnemyEntity> = new Map();
  private powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite> = new Map();
  private enemySpawnerTimer!: Phaser.Time.TimerEvent;
  private gameOverText?: Phaser.GameObjects.Text;
  private isPaused: boolean = false; // Pause state flag

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    logger.log('GameScene preload');
    this.load.image(Assets.PLAYER_KEY, 'assets/images/player_ship.png');
    // Remove unused projectile image loads if they are all dynamic now
    // Keep enemy/player/powerup/other assets
    this.load.image(Assets.ENEMY_SMALL_ALIEN_KEY, 'assets/images/alien_small.png');
    this.load.image(Assets.ENEMY_MEDIUM_ALIEN_KEY, 'assets/images/alien_medium.png');
    this.load.image(Assets.ENEMY_LARGE_METEOR_KEY, 'assets/images/meteor_large.png');
    this.load.image(Assets.ENEMY_HEXAGON_BOMBER_KEY, 'assets/images/hexagon_enemy.png');
    this.load.image(Assets.ENEMY_DIAMOND_STRAFER_KEY, 'assets/images/diamond_strafer.png');
    this.load.image(Assets.PROJECTILE_DEATH_BOMB_KEY, 'assets/images/death_bomb.png'); // Keep if death bomb uses sprite
    this.load.image(Assets.POWERUP_SHIELD_KEY, 'assets/images/powerup_shield.png');
    this.load.image(Assets.POWERUP_RAPID_FIRE_KEY, 'assets/images/powerup_rapid.png');
    // Audio Assets
    this.load.audio(Assets.AUDIO_EXPLOSION_SMALL_KEY, 'assets/audio/explosion_small.ogg');
    this.load.audio(Assets.AUDIO_POWERUP_APPEAR_KEY, 'assets/audio/powerup_appear.ogg');
    this.load.audio(Assets.AUDIO_POWERUP_GET_KEY, 'assets/audio/powerup_get.ogg');
  }

  create(): void {
    logger.log('GameScene create');
    this.initializeManagers();
    this.createPlayer();
    this.createGroups();

    // Instantiate the collision handler after managers and player sprite are ready
    this.collisionHandler = new GameSceneCollisionHandler(
      this,
      this.projectileManager,
      this.enemyManager,
      this.playerSprite,
      // Pass the renamed map
      this.projectileShapes,
      this.powerupGroup,
      this.powerupSprites
    );

    // Instantiate the event handler
    this.eventHandler = new GameSceneEventHandler(
      this,
      this.playerSprite,
      this.projectileGroup,
      this.enemyGroup,
      this.powerupGroup,
      this.enemySprites,
      // Pass the renamed map
      this.projectileShapes,
      this.powerupSprites
    );

    // Instantiate the area effect handler
    this.areaEffectHandler = new GameSceneAreaEffectHandler(this, this.playerSprite);

    // Instantiate the debug handler
    this.debugHandler = new GameSceneDebugHandler(
      this,
      this.playerSprite,
      this.enemySprites,
      // Pass the renamed map
      this.projectileShapes,
      this.powerupSprites,
      this.playerManager,
      this.weaponManager,
      this.enemyManager,
      this.projectileManager, // Pass projectileManager
      this.powerupManager, // Pass powerupManager
      this.economyManager,
      this.debugManager
    );
    // Bind event handlers
    this.handleTogglePause = this.handleTogglePause.bind(this);

    this.setupEventListeners();
    this.setupCollisions();
    this.setupEnemySpawner();
    this.setupShutdownCleanup();
    this.scene.launch('UIScene');
    logger.log('Launched UIScene');
  }

  update(time: number, delta: number): void {
    // Update core managers (pass delta in milliseconds)
    this.inputManager.update(delta);
    this.playerManager.update(delta);
    this.weaponManager.update(delta);
    this.projectileManager.update(delta);
    this.enemyManager.update(delta);
    this.powerupManager.update(delta);

    // Update debug visuals if debug mode is enabled
    this.debugHandler.updateDebugVisuals();
  }

  // --- Initialization Methods ---

  private initializeManagers(): void {
    // Use the initializer function
    const managers: GameManagers = initializeGameManagers(eventBus, logger);
    this.playerManager = managers.playerManager;
    this.inputManager = managers.inputManager;
    this.weaponManager = managers.weaponManager;
    this.projectileManager = managers.projectileManager;
    this.economyManager = managers.economyManager;
    this.enemyManager = managers.enemyManager;
    this.powerupManager = managers.powerupManager;
    this.debugManager = managers.debugManager;
  }

  private createPlayer(): void {
    const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
    const playerY = this.cameras.main.height - 50;
    this.playerSprite = this.physics.add.sprite(screenCenterX, playerY, Assets.PLAYER_KEY);
    this.playerSprite.setScale(0.05);
    this.playerSprite.setCollideWorldBounds(true);
  }

  private createGroups(): void {
    this.projectileGroup = this.add.group({ runChildUpdate: true });
    this.enemyGroup = this.add.group({ classType: EnemyEntity, runChildUpdate: true });
    this.powerupGroup = this.add.group({ runChildUpdate: true });
  }

  private setupEventListeners(): void {
    logger.debug('GameScene: Core event listeners are now managed by sub-handlers.');
    // Add listener for pause toggle
    eventBus.on(Events.TOGGLE_PAUSE, this.handleTogglePause); // Remove context argument
  }

  private setupCollisions(): void {
    // Use methods from the collision handler instance
    this.physics.overlap(
      this.playerSprite,
      this.enemyGroup,
      this.collisionHandler.handlePlayerEnemyCollision,
      undefined,
      this.collisionHandler
    );

    this.physics.overlap(
      this.projectileGroup,
      this.enemyGroup,
      this.collisionHandler.handleProjectileEnemyCollision,
      undefined,
      this.collisionHandler
    );

    this.physics.overlap(
      this.playerSprite,
      this.projectileGroup,
      this.collisionHandler.handlePlayerProjectileCollision,
      undefined,
      this.collisionHandler
    );

    // Add collision for player vs powerups
    this.physics.overlap(
      this.playerSprite,
      this.powerupGroup,
      this.collisionHandler.handlePlayerPowerupCollision,
      undefined,
      this.collisionHandler
    );
  }

  private setupEnemySpawner(): void {
    this.enemySpawnerTimer = this.time.addEvent({
      delay: 2000,
      callback: this.spawnRandomEnemy,
      callbackScope: this,
      loop: true,
    });

    // Pass the timer reference to the event handler so it can stop it on player death
    this.eventHandler.setEnemySpawnerTimer(this.enemySpawnerTimer);
  }

  private setupShutdownCleanup(): void {
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      logger.log('GameScene shutdown, cleaning up managers and listeners');
      this.cleanupEventListeners();

      // Destroy managers to remove their global listeners if necessary
      this.inputManager.destroy();
      this.playerManager.destroy();
      this.weaponManager.destroy();
      this.projectileManager.destroy();
      this.powerupManager.destroy();
      this.debugManager.destroy();
      this.collisionHandler.destroy();
      this.eventHandler.destroy();
      this.areaEffectHandler.destroy();
      this.debugHandler.destroy();

      // Clear the renamed map
      this.projectileShapes.clear();
      this.enemySprites.clear();
      this.powerupSprites.clear();

      if (this.enemySpawnerTimer) this.enemySpawnerTimer.destroy();
    });
  }

  private cleanupEventListeners(): void {
    logger.debug('GameScene: Core event listener cleanup is now managed by sub-handlers.');
    // Remove pause toggle listener
    eventBus.off(Events.TOGGLE_PAUSE, this.handleTogglePause); // Remove context argument
  }

  // --- Event Handlers ---

  private handleTogglePause(): void {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      logger.log('Game Paused');
      this.scene.pause(); // Pause this scene (stops update loop, physics, etc.)
      eventBus.emit(Events.GAME_PAUSED);
    } else {
      logger.log('Game Resumed');
      this.scene.resume(); // Resume this scene
      eventBus.emit(Events.GAME_RESUMED);
    }
  }

  // --- Helper Methods ---

  // Bind event handlers in constructor or initialization
  // (Add this binding in the constructor or create method)
  // Example: this.handleTogglePause = this.handleTogglePause.bind(this);

  private spawnRandomEnemy(): void {
    // TODO: Use difficulty config
    const enemyTypes = ['triangle_scout', 'square_tank', 'hexagon_bomber', 'diamond_strafer'];
    const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    const spawnPadding = 50;
    const spawnX = Phaser.Math.Between(spawnPadding, this.cameras.main.width - spawnPadding);
    const spawnY = Phaser.Math.Between(spawnPadding, this.cameras.main.height / 3);
    this.enemyManager.spawnEnemy(randomType, { x: spawnX, y: spawnY });
  }
}
