import Phaser from 'phaser';
import logger from '../../../core/utils/Logger';
import { GameManagers, GameObjects } from '../types/GameSceneTypes';
import { initializeGameManagers } from '../../initializers/GameSceneManagerInitializer';
import eventBus from '../../../core/events/EventBus';
import * as Assets from '../../../core/constants/assets';
import { EnemyEntity } from '../../entities/EnemyEntity';
import { ProjectileShape } from '../../handlers/event/ProjectileEventHandler'; // Import the type alias

/**
 * Handles initialization of game objects and managers
 */
export class GameSceneInitializer {
  private scene: Phaser.Scene;
  private gameManagers!: GameManagers;
  private gameObjects!: GameObjects;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Initializes all game components
   * @returns The initialized game managers and objects
   */
  public initialize(): { managers: GameManagers; objects: GameObjects } {
    logger.log('GameSceneInitializer: Initializing game components');

    this.initializeManagers();
    this.createPlayer();
    this.createGroups();

    return {
      managers: this.gameManagers,
      objects: this.gameObjects
    };
  }

  /**
   * Initializes all game managers
   */
  private initializeManagers(): void {
    // Use the initializer function
    this.gameManagers = initializeGameManagers(eventBus, logger);

    // Initialize game objects container
    this.gameObjects = {
      playerSprite: {} as Phaser.Physics.Arcade.Sprite, // Will be set in createPlayer
      enemyGroup: {} as Phaser.GameObjects.Group, // Will be set in createGroups
      projectileGroup: {} as Phaser.GameObjects.Group, // Will be set in createGroups
      powerupGroup: {} as Phaser.GameObjects.Group, // Will be set in createGroups
      enemySprites: new Map<string, EnemyEntity>(),
      projectileShapes: new Map<string, ProjectileShape>(), // Use the imported type alias
      powerupSprites: new Map<number, Phaser.Physics.Arcade.Sprite>()
    };
  }

  /**
   * Creates the player sprite
   */
  private createPlayer(): void {
    const screenCenterX = this.scene.cameras.main.worldView.x + this.scene.cameras.main.width / 2;
    const playerY = this.scene.cameras.main.height - 50;

    this.gameObjects.playerSprite = this.scene.physics.add.sprite(
      screenCenterX,
      playerY,
      Assets.PLAYER_KEY
    );

    this.gameObjects.playerSprite.setScale(0.05);
    this.gameObjects.playerSprite.setCollideWorldBounds(true);
    this.gameObjects.playerSprite.name = 'player'; // Set name for easier identification
    // Set circular collision shape for the player (adjust radius as needed)
    // Align collision circle with the visual sprite
    const playerRadius = 10; // Example radius
    this.gameObjects.playerSprite.setCircle(
      playerRadius,
      -playerRadius + this.gameObjects.playerSprite.width / 2, // X offset
      -playerRadius + this.gameObjects.playerSprite.height / 2 // Y offset
    );

    logger.debug('GameSceneInitializer: Player created');
  }

  /**
   * Creates game object groups
   */
  private createGroups(): void {
    // Create projectile group
    this.gameObjects.projectileGroup = this.scene.add.group({
      runChildUpdate: true
    });

    // Create enemy group with EnemyEntity as class type
    this.gameObjects.enemyGroup = this.scene.add.group({
      classType: EnemyEntity,
      runChildUpdate: true
    });

    // Create powerup group
    this.gameObjects.powerupGroup = this.scene.add.group({
      runChildUpdate: true
    });

    logger.debug('GameSceneInitializer: Groups created');
  }

  /**
   * Preloads all required assets
   */
  public preloadAssets(): void {
    logger.log('GameSceneInitializer: Preloading assets');

    // Player assets
    this.scene.load.image(Assets.PLAYER_KEY, 'assets/images/player_ship.png');

    // Enemy assets
    this.scene.load.image(Assets.ENEMY_SMALL_ALIEN_KEY, 'assets/images/alien_small.png');
    this.scene.load.image(Assets.ENEMY_MEDIUM_ALIEN_KEY, 'assets/images/alien_medium.png');
    this.scene.load.image(Assets.ENEMY_LARGE_METEOR_KEY, 'assets/images/meteor_large.png');
    this.scene.load.image(Assets.ENEMY_HEXAGON_BOMBER_KEY, 'assets/images/hexagon_enemy.png');
    this.scene.load.image(Assets.ENEMY_DIAMOND_STRAFER_KEY, 'assets/images/diamond_strafer.png');

    // Projectile assets
    this.scene.load.image(Assets.PROJECTILE_DEATH_BOMB_KEY, 'assets/images/death_bomb.png');

    // Powerup assets
    this.scene.load.image(Assets.POWERUP_SHIELD_KEY, 'assets/images/powerup_shield.png');
    this.scene.load.image(Assets.POWERUP_RAPID_FIRE_KEY, 'assets/images/powerup_rapid.png');
    this.scene.load.image(Assets.POWERUP_CASH_KEY, 'assets/images/powerup_cash.png'); // Load cash powerup image

    // Audio assets
    this.scene.load.audio(Assets.AUDIO_EXPLOSION_SMALL_KEY, 'assets/audio/explosion_small.ogg');
    this.scene.load.audio(Assets.AUDIO_POWERUP_APPEAR_KEY, 'assets/audio/powerup_appear.ogg');
    this.scene.load.audio(Assets.AUDIO_POWERUP_GET_KEY, 'assets/audio/powerup_get.ogg');
  }

  /**
   * Sets up shutdown cleanup
   * @param managers The game managers to clean up
   * @param handlers The game handlers to clean up
   */
  public setupShutdownCleanup(
    managers: GameManagers,
    handlers: Record<string, { destroy: () => void }>
  ): void {
    this.scene.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      logger.log('GameScene shutdown, cleaning up managers and listeners');

      // Destroy managers
      managers.inputManager.destroy();
      managers.playerManager.destroy();
      managers.weaponManager.destroy();
      managers.projectileManager.destroy();
      managers.powerupManager.destroy();
      managers.debugManager.destroy();

      // Destroy handlers
      Object.values(handlers).forEach(handler => handler.destroy());

      // Clear maps
      this.gameObjects.projectileShapes.clear();
      this.gameObjects.enemySprites.clear();
      this.gameObjects.powerupSprites.clear();

      // Clean up static event listeners
      EnemyEntity.cleanupEventListeners();

      logger.log('GameSceneInitializer: Shutdown cleanup complete');
    });
  }
}