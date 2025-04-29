import Phaser from 'phaser'; // Removed unused 'Types'
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import PlayerManager from '../../core/managers/PlayerManager';
import InputManager from '../../core/managers/InputManager';
import WeaponManager from '../../core/managers/WeaponManager';
import ProjectileManager from '../../core/managers/ProjectileManager';
import EconomyManager from '../../core/managers/EconomyManager';
import EnemyManager from '../../core/managers/EnemyManager';
import configLoader from '../../core/config/ConfigLoader';
// import { type WeaponConfig } from '../../core/config/schemas/weaponSchema'; // Unused import
// import { PlayerState } from '../../core/types/PlayerState'; // Unused import
import { EnemyEntity } from '../entities/EnemyEntity';
// import { EnemyConfig } from '../../core/config/schemas/enemySchema'; // Unused import
import { GameSceneCollisionHandler } from '../handlers/GameSceneCollisionHandler';
import { GameSceneEventHandler } from '../handlers/GameSceneEventHandler'; // Import the event handler
// Event constants
import * as Events from '../../core/constants/events';
// Asset constants
import * as Assets from '../../core/constants/assets';

// --- Event Data Interfaces --- (Removed unused interfaces)
// interface PlayerHitEnemyData { ... }
// interface EnemyRequestFireData { ... }
// interface ProjectileCreatedData { ... }
// interface PlayerHitProjectileData { ... }

export default class GameScene extends Phaser.Scene {
  // Core Managers
  private playerManager!: PlayerManager;
  private inputManager!: InputManager;
  private weaponManager!: WeaponManager;
  private projectileManager!: ProjectileManager;
  private economyManager!: EconomyManager;
  private enemyManager!: typeof EnemyManager;
  private collisionHandler!: GameSceneCollisionHandler;
  private eventHandler!: GameSceneEventHandler; // Add property for the event handler

  // Game Objects
  private playerSprite!: Phaser.Physics.Arcade.Sprite;
  private enemyGroup!: Phaser.GameObjects.Group;
  private projectileGroup!: Phaser.GameObjects.Group;
  private projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
  private enemySprites: Map<string, EnemyEntity> = new Map();
  private enemySpawnerTimer!: Phaser.Time.TimerEvent;
  private gameOverText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    logger.log('GameScene preload');
    this.load.image(Assets.PLAYER_KEY, 'assets/images/player_ship.png');
    this.load.image(Assets.BULLET_KEY, 'assets/images/bullet.png');
    this.load.image(Assets.ENEMY_SMALL_ALIEN_KEY, 'assets/images/alien_small.png');
    this.load.image(Assets.ENEMY_MEDIUM_ALIEN_KEY, 'assets/images/alien_medium.png');
    this.load.image(Assets.ENEMY_LARGE_METEOR_KEY, 'assets/images/meteor_large.png');
    this.load.image(Assets.ENEMY_HEXAGON_BOMBER_KEY, 'assets/images/hexagon_enemy.png'); // Load new enemy asset
    this.load.audio(Assets.AUDIO_EXPLOSION_SMALL_KEY, 'assets/audio/explosion_small.ogg');
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
      this.projectileSprites // Pass the map
    );
    // Instantiate the event handler
    this.eventHandler = new GameSceneEventHandler(
      this,
      this.playerSprite,
      this.projectileGroup,
      this.enemyGroup, // Pass enemy group
      this.enemySprites,
      this.projectileSprites
    );
    // this.bindEventHandlers(); // No longer needed as handlers are bound in their own class
    this.setupEventListeners(); // Will now use eventHandler methods
    this.setupCollisions();
    this.setupEnemySpawner(); // Spawner timer needs to be passed to event handler
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
    // EconomyManager is event-driven
  }

  // --- Initialization Methods ---

  private initializeManagers(): void {
    const playerConfig = configLoader.getPlayerConfig();
    this.economyManager = new EconomyManager(eventBus, 0);
    this.playerManager = new PlayerManager(eventBus, playerConfig);
    this.inputManager = new InputManager(eventBus);
    this.weaponManager = new WeaponManager(eventBus);
    this.projectileManager = new ProjectileManager(eventBus);
    this.enemyManager = EnemyManager; // Singleton instance
  }

  private createPlayer(): void {
    const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
    const playerY = this.cameras.main.height - 50;
    this.playerSprite = this.physics.add.sprite(screenCenterX, playerY, Assets.PLAYER_KEY);
    this.playerSprite.setCollideWorldBounds(true);
  }

  private createGroups(): void {
    this.projectileGroup = this.add.group({ runChildUpdate: true });
    this.enemyGroup = this.add.group({ classType: EnemyEntity, runChildUpdate: true });
  }

  // private bindEventHandlers(): void { ... } // Removed

  private setupEventListeners(): void {
    // Use methods from the event handler instance
    eventBus.on(Events.PLAYER_STATE_UPDATED, this.eventHandler.handlePlayerStateUpdate);
    eventBus.on(Events.PROJECTILE_CREATED, this.eventHandler.handleProjectileCreated);
    eventBus.on(Events.PROJECTILE_DESTROYED, this.eventHandler.handleProjectileDestroyed);
    eventBus.on(Events.ENEMY_SPAWNED, this.eventHandler.handleEnemySpawned);
    eventBus.on(Events.ENEMY_DESTROYED, this.eventHandler.handleEnemyDestroyed);
    eventBus.on(Events.ENEMY_HEALTH_UPDATED, this.eventHandler.handleEnemyHealthUpdate);
    eventBus.on(Events.REQUEST_FIRE_WEAPON, this.eventHandler.handleRequestFireWeapon);
    eventBus.on(Events.ENEMY_REQUEST_FIRE, this.eventHandler.handleEnemyRequestFire);
    eventBus.on(Events.PLAYER_DIED, this.eventHandler.handlePlayerDied);
  }

  private setupCollisions(): void {
    // Use methods from the collision handler instance
    this.physics.overlap(
      this.playerSprite,
      this.enemyGroup,
      this.collisionHandler.handlePlayerEnemyCollision, // Use handler method
      undefined,
      this.collisionHandler // Pass handler as context if needed (or ensure methods are bound/arrow)
    );
    this.physics.overlap(
      this.projectileGroup,
      this.enemyGroup,
      this.collisionHandler.handleProjectileEnemyCollision, // Use handler method
      undefined,
      this.collisionHandler
    );
    this.physics.overlap(
      this.playerSprite,
      this.projectileGroup,
      this.collisionHandler.handlePlayerProjectileCollision, // Use handler method
      undefined,
      this.collisionHandler
    );
  }

  private setupEnemySpawner(): void {
    this.enemySpawnerTimer = this.time.addEvent({
      delay: 2000,
      callback: this.spawnRandomEnemy, // Keep spawner logic in scene for now
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
      // this.enemyManager.destroy(); // Singleton, might not need destroy
      // this.economyManager.destroy(); // Add if needed
      this.projectileSprites.clear();
      this.enemySprites.clear();
      if (this.enemySpawnerTimer) this.enemySpawnerTimer.destroy();
    });
  }

  private cleanupEventListeners(): void {
    // Use methods from the event handler instance
    eventBus.off(Events.PLAYER_STATE_UPDATED, this.eventHandler.handlePlayerStateUpdate);
    eventBus.off(Events.PROJECTILE_CREATED, this.eventHandler.handleProjectileCreated);
    eventBus.off(Events.PROJECTILE_DESTROYED, this.eventHandler.handleProjectileDestroyed);
    eventBus.off(Events.ENEMY_SPAWNED, this.eventHandler.handleEnemySpawned);
    eventBus.off(Events.ENEMY_DESTROYED, this.eventHandler.handleEnemyDestroyed);
    eventBus.off(Events.ENEMY_HEALTH_UPDATED, this.eventHandler.handleEnemyHealthUpdate);
    eventBus.off(Events.REQUEST_FIRE_WEAPON, this.eventHandler.handleRequestFireWeapon);
    eventBus.off(Events.ENEMY_REQUEST_FIRE, this.eventHandler.handleEnemyRequestFire);
    eventBus.off(Events.PLAYER_DIED, this.eventHandler.handlePlayerDied);
  }

  // --- Event Handlers ---
  // All event handlers are now moved to GameSceneEventHandler

  // --- Helper Methods ---

  private spawnRandomEnemy(): void {
    // TODO: Use difficulty config
    const enemyTypes = ['triangle_scout', 'square_tank', 'hexagon_bomber']; // Add new enemy to random pool
    const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    const spawnPadding = 50;
    const spawnX = Phaser.Math.Between(spawnPadding, this.cameras.main.width - spawnPadding);
    const spawnY = Phaser.Math.Between(spawnPadding, this.cameras.main.height / 3);
    this.enemyManager.spawnEnemy(randomType, { x: spawnX, y: spawnY });
  }
}
