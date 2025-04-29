import Phaser, { Types } from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import PlayerManager from '../../core/managers/PlayerManager';
import InputManager from '../../core/managers/InputManager';
import WeaponManager from '../../core/managers/WeaponManager';
import ProjectileManager from '../../core/managers/ProjectileManager';
import EconomyManager from '../../core/managers/EconomyManager';
import EnemyManager from '../../core/managers/EnemyManager'; // Import EnemyManager instance
import configLoader from '../../core/config/ConfigLoader'; // Import config loader instance
import { type WeaponConfig } from '../../core/config/schemas/weaponSchema'; // Import weapon config type
import { PlayerState } from '../../core/types/PlayerState'; // For event data type
import { EnemyEntity } from '../entities/EnemyEntity'; // Import EnemyEntity class
import { EnemyConfig } from '../../core/config/schemas/enemySchema'; // For event data type
// Event constants
import { PLAYER_STATE_UPDATED } from '../../core/constants/events';
import { PROJECTILE_CREATED } from '../../core/constants/events';
import { PROJECTILE_DESTROYED } from '../../core/constants/events';
import { ENEMY_SPAWNED } from '../../core/constants/events';
import { ENEMY_DESTROYED } from '../../core/constants/events';
import { ENEMY_HEALTH_UPDATED } from '../../core/constants/events';
import { PLAYER_HIT_ENEMY } from '../../core/constants/events';
import { PLAYER_DIED } from '../../core/constants/events'; // Import player died event
import { REQUEST_FIRE_WEAPON } from '../../core/constants/events'; // Import player fire request event
import { ENEMY_REQUEST_FIRE } from '../../core/constants/events'; // Import enemy fire request event
import { SPAWN_PROJECTILE } from '../../core/constants/events'; // Import spawn event
import { PROJECTILE_HIT_ENEMY } from '../../core/constants/events';
import { PLAYER_HIT_PROJECTILE } from '../../core/constants/events'; // Import player hit by projectile event

// Asset constants
import {
  PLAYER_KEY,
  BULLET_KEY,
  ENEMY_SMALL_ALIEN_KEY,
  ENEMY_MEDIUM_ALIEN_KEY, // Added
  ENEMY_LARGE_METEOR_KEY, // Added
  AUDIO_EXPLOSION_SMALL_KEY, // Added
} from '../../core/constants/assets';

/** Defines the data expected for the PLAYER_HIT_ENEMY event */
interface PlayerHitEnemyData {
  enemyInstanceId: string;
  damage: number; // Damage dealt by the collision
}

/** Defines the data expected for the ENEMY_REQUEST_FIRE event */
interface EnemyRequestFireData {
  instanceId: string;
  x: number;
  y: number;
  shootConfig: NonNullable<EnemyConfig['shootConfig']>; // Ensure shootConfig is not null/undefined
}

/** Defines the data expected for the PROJECTILE_CREATED event (updated) */
interface ProjectileCreatedData {
  id: string;
  type: string;
  x: number;
  y: number;
  owner: 'player' | 'enemy'; // Added owner
  // velocityX, velocityY are not needed by the scene for creation
}

/** Defines the data expected for the PLAYER_HIT_PROJECTILE event */
interface PlayerHitProjectileData {
  projectileId: string;
  damage: number;
}

export default class GameScene extends Phaser.Scene {
  // Core Managers
  private playerManager!: PlayerManager;
  private inputManager!: InputManager;
  private weaponManager!: WeaponManager;
  private projectileManager!: ProjectileManager;
  private economyManager!: EconomyManager;
  private enemyManager!: typeof EnemyManager; // Add EnemyManager property

  // Game Objects
  private playerSprite!: Phaser.Physics.Arcade.Sprite;
  private enemyGroup!: Phaser.GameObjects.Group; // Group for enemy physics bodies
  private projectileGroup!: Phaser.GameObjects.Group;
  // Maps to link manager instance IDs to Phaser Sprites/Entities
  private projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
  private enemySprites: Map<string, EnemyEntity> = new Map(); // Map for enemy entities
  private enemySpawnerTimer!: Phaser.Time.TimerEvent; // Timer for spawning enemies
  private gameOverText?: Phaser.GameObjects.Text; // Text object for game over message

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    logger.log('GameScene preload');
    // Load actual game assets using imported keys
    this.load.image(PLAYER_KEY, 'assets/images/player_ship.png');
    this.load.image(BULLET_KEY, 'assets/images/bullet.png');
    this.load.image(ENEMY_SMALL_ALIEN_KEY, 'assets/images/alien_small.png');
    this.load.image(ENEMY_MEDIUM_ALIEN_KEY, 'assets/images/alien_medium.png'); // Added
    this.load.image(ENEMY_LARGE_METEOR_KEY, 'assets/images/meteor_large.png'); // Added
    // Load audio
    this.load.audio(AUDIO_EXPLOSION_SMALL_KEY, 'assets/audio/explosion_small.ogg');
    // TODO: Load other assets (meteors, powerups, other audio) as needed
  }

  create(): void {
    logger.log('GameScene create');

    // --- Instantiate Core Managers ---
    // Pass the singleton eventBus instance to each manager
    // Ensure configs are loaded before creating managers that depend on them
    // Note: ConfigLoader.loadAllConfigs() should ideally be called earlier (e.g., in a Preload scene or main.ts)
    // For simplicity here, we assume it's loaded. A robust implementation would await the promise.
    const playerConfig = configLoader.getPlayerConfig(); // Get player config

    this.economyManager = new EconomyManager(eventBus, 0); // Start with 0 currency
    this.playerManager = new PlayerManager(eventBus, playerConfig); // Pass player config
    this.inputManager = new InputManager(eventBus);
    this.weaponManager = new WeaponManager(eventBus);
    this.projectileManager = new ProjectileManager(eventBus);
    this.enemyManager = EnemyManager; // Assign the imported singleton instance

    // --- Create Player Sprite ---
    const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
    // Position player near the bottom center
    const playerY = this.cameras.main.height - 50;
    this.playerSprite = this.physics.add.sprite(screenCenterX, playerY, PLAYER_KEY);
    this.playerSprite.setCollideWorldBounds(true); // Keep player on screen
    // TODO: Set player physics properties (size, offset) if needed

    // --- Create Projectile Group ---
    this.projectileGroup = this.add.group({
      runChildUpdate: true,
    });

    // --- Create Enemy Group ---
    this.enemyGroup = this.add.group({
      classType: EnemyEntity, // Optional: Specify class for group elements
      runChildUpdate: true,
    });

    // --- Bind Event Handlers ---
    this.handlePlayerStateUpdate = this.handlePlayerStateUpdate.bind(this);
    this.handleProjectileCreated = this.handleProjectileCreated.bind(this);
    this.handleProjectileDestroyed = this.handleProjectileDestroyed.bind(this);
    this.handleEnemySpawned = this.handleEnemySpawned.bind(this); // Bind enemy handlers
    this.handleEnemyDestroyed = this.handleEnemyDestroyed.bind(this);
    this.handleEnemyHealthUpdate = this.handleEnemyHealthUpdate.bind(this);
    this.handleRequestFireWeapon = this.handleRequestFireWeapon.bind(this); // Bind player fire request handler
    this.handleEnemyRequestFire = this.handleEnemyRequestFire.bind(this); // Bind enemy fire request handler
    this.handlePlayerDied = this.handlePlayerDied.bind(this); // Bind player died handler
    // Bind collision handlers (using arrow functions for simplicity now)
    // this.handlePlayerEnemyCollision = this.handlePlayerEnemyCollision.bind(this); // No longer needed with arrow func
    // this.handleProjectileEnemyCollision = this.handleProjectileEnemyCollision.bind(this); // No longer needed with arrow func
    // this.handlePlayerProjectileCollision = this.handlePlayerProjectileCollision.bind(this); // No longer needed with arrow func

    // --- Subscribe to Core Events ---
    eventBus.on(PLAYER_STATE_UPDATED, this.handlePlayerStateUpdate);
    eventBus.on(PROJECTILE_CREATED, this.handleProjectileCreated);
    eventBus.on(PROJECTILE_DESTROYED, this.handleProjectileDestroyed);
    eventBus.on(ENEMY_SPAWNED, this.handleEnemySpawned); // Subscribe to enemy events
    eventBus.on(ENEMY_DESTROYED, this.handleEnemyDestroyed);
    eventBus.on(ENEMY_HEALTH_UPDATED, this.handleEnemyHealthUpdate);
    eventBus.on(REQUEST_FIRE_WEAPON, this.handleRequestFireWeapon); // Subscribe to player fire request
    eventBus.on(ENEMY_REQUEST_FIRE, this.handleEnemyRequestFire); // Subscribe to enemy fire request
    eventBus.on(PLAYER_DIED, this.handlePlayerDied); // Subscribe to player died event

    // --- Scene Shutdown Cleanup ---
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      logger.log('GameScene shutdown, cleaning up managers and listeners');
      // Destroy managers to remove their global listeners
      this.inputManager.destroy();
      this.playerManager.destroy();
      this.weaponManager.destroy();
      this.projectileManager.destroy();
      // this.enemyManager.destroy(); // Add if EnemyManager needs cleanup
      // EconomyManager doesn't have global listeners currently

      // Remove scene-specific listeners
      eventBus.off(PLAYER_STATE_UPDATED, this.handlePlayerStateUpdate);
      eventBus.off(PROJECTILE_CREATED, this.handleProjectileCreated);
      eventBus.off(PROJECTILE_DESTROYED, this.handleProjectileDestroyed);
      eventBus.off(ENEMY_SPAWNED, this.handleEnemySpawned); // Unsubscribe enemy events
      eventBus.off(ENEMY_DESTROYED, this.handleEnemyDestroyed);
      eventBus.off(ENEMY_HEALTH_UPDATED, this.handleEnemyHealthUpdate);
      eventBus.off(REQUEST_FIRE_WEAPON, this.handleRequestFireWeapon); // Unsubscribe player fire request
      eventBus.off(ENEMY_REQUEST_FIRE, this.handleEnemyRequestFire); // Unsubscribe enemy fire request
      eventBus.off(PLAYER_DIED, this.handlePlayerDied); // Unsubscribe player died event
      this.projectileSprites.clear();
      this.enemySprites.clear(); // Clear enemy map
    });

    // --- Temporary Enemy Spawner ---
    this.time.addEvent({
      delay: 2000, // Spawn every 2 seconds
      callback: this.spawnRandomEnemy,
      callbackScope: this,
      loop: true,
    });

    // Launch the UI Scene in parallel
    this.scene.launch('UIScene');
    logger.log('Launched UIScene');
  }

  // --- Event Handlers ---

  private handlePlayerStateUpdate(state: PlayerState): void {
    // Apply velocity from the PlayerManager state to the physics sprite
    if (this.playerSprite && this.playerSprite.body) {
      this.playerSprite.setVelocityX(state.velocityX);
      // Note: PlayerManager currently doesn't manage Y velocity or position directly
      // We sync the manager's conceptual position with the sprite's actual position
      // state.x = this.playerSprite.x; // This would be incorrect - manager owns state
      // state.y = this.playerSprite.y;
    }
  }

  // Updated handler to accept owner and use the correct interface
  private handleProjectileCreated(data: ProjectileCreatedData): void {
    logger.debug(
      `GameScene creating projectile sprite: ID ${data.id}, Type ${data.type}, Owner ${data.owner}`
    );

    // Determine texture based on type (and potentially owner)
    let textureKey = BULLET_KEY; // Default
    if (data.type === 'enemy_bullet') {
      textureKey = BULLET_KEY; // Use same graphic for now, maybe tint later
    } else if (data.type === 'enemy_laser') {
      textureKey = BULLET_KEY; // Placeholder, needs laser graphic
    }
    // Add more types as needed

    const projectileSprite = this.physics.add.sprite(data.x, data.y, textureKey);

    // Optional: Tint enemy projectiles differently
    if (data.owner === 'enemy') {
      projectileSprite.setTint(0xff8888); // Light red tint for enemy bullets
    }

    this.projectileGroup.add(projectileSprite);
    this.projectileSprites.set(data.id, projectileSprite);

    // Velocity is managed by the ProjectileManager, no need to set it here
    // Collision detection setup happens in the update loop via physics.overlap
  }

  private handleProjectileDestroyed(data: { id: string }): void {
    logger.debug(`GameScene destroying projectile sprite: ID ${data.id}`);
    const projectileSprite = this.projectileSprites.get(data.id);
    if (projectileSprite) {
      this.projectileGroup.remove(projectileSprite, true, true); // Remove from group and destroy
      this.projectileSprites.delete(data.id);
    } else {
      logger.warn(`GameScene could not find projectile sprite to destroy: ID ${data.id}`);
    }
  }

  private handleEnemySpawned(data: {
    instanceId: string;
    config: EnemyConfig;
    position: { x: number; y: number };
    initialHealth: number; // Unused here, health managed by EnemyManager
  }): void {
    logger.debug(
      `GameScene creating enemy entity: ID ${data.instanceId}, Config ${data.config.id}`
    );

    // Map enemy config ID to the correct asset key
    let enemyAssetKey: string;
    switch (data.config.id) {
      case 'triangle_scout':
        enemyAssetKey = ENEMY_SMALL_ALIEN_KEY;
        break;
      case 'square_tank':
      case 'pentagon_healer': // Use medium alien for healer too
        enemyAssetKey = ENEMY_MEDIUM_ALIEN_KEY;
        break;
      case 'circle_boss':
        enemyAssetKey = ENEMY_LARGE_METEOR_KEY; // Using meteor for boss
        break;
      default:
        logger.warn(`Unknown enemy config ID: ${data.config.id}, defaulting to small alien`);
        enemyAssetKey = ENEMY_SMALL_ALIEN_KEY;
    }

    const enemyEntity = new EnemyEntity(
      this,
      data.position.x,
      data.position.y,
      enemyAssetKey, // Use determined asset key
      data.instanceId,
      data.config
    );
    this.enemyGroup.add(enemyEntity);
    this.enemySprites.set(data.instanceId, enemyEntity);
  }

  private handleEnemyDestroyed(data: {
    instanceId: string;
    configId: string;
    reward: number;
  }): void {
    logger.debug(`GameScene destroying enemy entity: ID ${data.instanceId}`);
    const enemyEntity = this.enemySprites.get(data.instanceId);
    if (enemyEntity) {
      // Play sound effect
      this.sound.play(AUDIO_EXPLOSION_SMALL_KEY);

      enemyEntity.destroySelf(); // Trigger visual destruction in the entity
      // Note: Group removal happens automatically when the entity is destroyed
      this.enemySprites.delete(data.instanceId);
      // EconomyManager listens for this event directly to grant reward
    } else {
      logger.warn(`GameScene could not find enemy entity to destroy: ID ${data.instanceId}`);
    }
  }

  // Handle visual updates based on health changes (e.g., flashing)
  private handleEnemyHealthUpdate(data: {
    instanceId: string;
    currentHealth: number;
    maxHealth: number;
  }): void {
    const enemyEntity = this.enemySprites.get(data.instanceId);
    if (enemyEntity) {
      // Example: Trigger a visual effect on the entity
      enemyEntity.takeDamage(0); // Call takeDamage for visual effect (amount doesn't matter here)
      // Could also update a health bar if enemies had one
    }
  }

  // Handle request from WeaponManager to fire
  private handleRequestFireWeapon(data: { weaponConfig: WeaponConfig }): void {
    if (!this.playerSprite || !this.playerSprite.active) {
      logger.warn('Player sprite not available to fire weapon.');
      return;
    }

    const weaponConfig = data.weaponConfig;
    // Calculate spawn position based on player sprite (e.g., top center)
    const spawnPoint = this.playerSprite.getTopCenter(); // Use Phaser's helper
    const spawnX = spawnPoint.x;
    const spawnY = spawnPoint.y;

    // Determine velocity (assuming firing straight up for now)
    const velocityX = 0;
    const velocityY = -weaponConfig.projectileSpeed; // Use speed from config

    // Emit SPAWN_PROJECTILE for ProjectileManager
    eventBus.emit(SPAWN_PROJECTILE, {
      type: weaponConfig.projectileType,
      x: spawnX,
      y: spawnY,
      velocityX: velocityX,
      velocityY: velocityY,
      damage: weaponConfig.baseDamage ?? 0,
      owner: 'player', // Explicitly set owner
    });
  }

  // Handle request from EnemyEntity to fire
  private handleEnemyRequestFire(data: EnemyRequestFireData): void {
    logger.debug(`GameScene received enemy fire request from ${data.instanceId}`);
    const enemySprite = this.enemySprites.get(data.instanceId);
    if (!enemySprite || !enemySprite.active) {
      logger.warn(`Enemy sprite ${data.instanceId} not found or inactive, cannot fire.`);
      return;
    }

    const shootConfig = data.shootConfig;
    const projectileSpeed = shootConfig.speed ?? 150; // Use config speed or default

    // Calculate angle towards player
    let velocityX = 0;
    let velocityY = projectileSpeed; // Default to downward if player doesn't exist

    if (this.playerSprite && this.playerSprite.active) {
      const angle = Phaser.Math.Angle.Between(
        data.x,
        data.y,
        this.playerSprite.x,
        this.playerSprite.y
      );
      // Convert angle to velocity components using physics helper
      const velocity = this.physics.velocityFromAngle(
        Phaser.Math.RadToDeg(angle), // Convert radians to degrees for velocityFromAngle
        projectileSpeed
      );
      velocityX = velocity.x;
      velocityY = velocity.y;
      logger.debug(
        `Enemy ${data.instanceId} aiming at player. Angle: ${Phaser.Math.RadToDeg(angle).toFixed(2)}deg, Vel: (${velocityX.toFixed(2)}, ${velocityY.toFixed(2)})`
      );
    } else {
      logger.warn(`Enemy ${data.instanceId} firing downwards as player sprite is inactive.`);
    }

    // Emit SPAWN_PROJECTILE for ProjectileManager
    eventBus.emit(SPAWN_PROJECTILE, {
      type: shootConfig.projectileType,
      x: data.x, // Use position from event
      y: data.y,
      velocityX: velocityX,
      velocityY: velocityY,
      damage: shootConfig.damage ?? 0, // Use config damage or default
      owner: 'enemy', // Explicitly set owner
    });
  }

  // Handle player death
  private handlePlayerDied(): void {
    logger.log('Game Over - Player Died');

    // Stop enemy spawning
    if (this.enemySpawnerTimer) {
      this.enemySpawnerTimer.destroy();
    }

    // Disable player sprite physics and hide it with an effect
    if (this.playerSprite && this.playerSprite.active) {
      this.playerSprite.disableBody(true, false); // destroyGameObject = false, hideGameObject = false

      this.tweens.add({
        targets: this.playerSprite,
        duration: 300,
        alpha: 0,
        scale: 0.5,
        angle: 90,
        tint: 0xff0000,
        ease: 'Power2',
        onComplete: () => {
          this.playerSprite.setVisible(false); // Ensure it's hidden after tween
        },
      });
    }

    // TODO: Disable player input (need method in InputManager or flag here)
    // TODO: Potentially stop enemy movement/actions

    // Display Game Over text slightly delayed after the player effect starts
    this.time.delayedCall(500, () => {
      const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
      const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;
      this.gameOverText = this.add
        .text(screenCenterX, screenCenterY, 'GAME OVER', {
          fontSize: '64px',
          color: '#ff0000',
          align: 'center',
        })
        .setOrigin(0.5);
    });

    // Optional: Add a delay and restart the scene or go to a menu
    // this.time.delayedCall(3500, () => { // Increased delay
    //   this.scene.restart();
    // });
  }

  // --- Game Loop Update ---

  update(time: number, delta: number): void {
    // Update core managers
    // Pass delta in milliseconds
    // Update core managers (pass delta in milliseconds)
    this.inputManager.update(delta); // Add if InputManager needs frame updates
    this.playerManager.update(delta);
    this.weaponManager.update(delta);
    this.projectileManager.update(delta);
    this.enemyManager.update(delta); // Call EnemyManager update
    // EconomyManager is event-driven, no update needed here

    // Update projectile sprites based on ProjectileManager state (if needed)
    // This is an alternative to having ProjectileManager emit position updates constantly
    this.projectileSprites.forEach((_sprite, _id) => {
      // Prefix unused parameters
      // const projectileState = this.projectileManager.getProjectileState(id); // Need method in manager
      // if (projectileState) {
      //   sprite.setPosition(projectileState.x, projectileState.y);
      // }
      // Boundary check is now handled within ProjectileManager.update()
    });

    // --- Collision Detection ---
    // Use overlap checks which don't cause physical reactions but trigger callbacks
    this.physics.overlap(
      this.playerSprite,
      this.enemyGroup,
      this.handlePlayerEnemyCollision,
      undefined, // Optional process callback
      this // Context for the callback
    );

    this.physics.overlap(
      this.projectileGroup,
      this.enemyGroup,
      this.handleProjectileEnemyCollision,
      undefined,
      this
    );

    // Add overlap check for player vs projectiles
    this.physics.overlap(
      this.playerSprite,
      this.projectileGroup,
      this.handlePlayerProjectileCollision, // Use the new handler
      undefined,
      this
    );
  }

  // --- Collision Handlers ---

  private handlePlayerEnemyCollision = function (
    this: GameScene,
    object1: unknown,
    object2: unknown
  ) {
    if (!(object1 instanceof Phaser.Physics.Arcade.Sprite)) return;
    if (!(object2 instanceof EnemyEntity)) return;
    const playerObject = object1;
    const enemyObject = object2;
    // Runtime check: Ensure enemyObject is likely an EnemyEntity before proceeding
    if (!(enemyObject instanceof EnemyEntity) || !enemyObject.instanceId) {
      // logger.warn('Player collision with non-EnemyEntity object:', enemyObject);
      return;
    }
    const enemyEntity = enemyObject as EnemyEntity; // Cast after check

    logger.debug(`Player collided with enemy: ${enemyEntity.instanceId}`);

    // Emit event for PlayerManager to handle taking damage
    // Get collision damage from the enemy's configuration stored in the entity
    const collisionDamage = enemyEntity.enemyConfig.collisionDamage ?? 0; // Corrected: Use enemyConfig property
    const eventData: PlayerHitEnemyData = {
      enemyInstanceId: enemyEntity.instanceId,
      damage: collisionDamage, // Use damage from config
    };
    eventBus.emit(PLAYER_HIT_ENEMY, eventData);

    // Optional: Destroy the enemy immediately upon collision with the player?
    // Or let the PlayerManager decide if the player takes damage and the enemy survives?
    // For now, let's destroy the enemy as well for simplicity.
    // PlayerManager handles player health reduction via PLAYER_HIT_ENEMY event
    this.enemyManager.handleDamage(enemyEntity.instanceId, 9999); // Instant kill on player collision
  };

  // Using arrow function for collision handler to maintain 'this' context
  private handleProjectileEnemyCollision = (object1: unknown, object2: unknown): void => {
    // Type guards
    if (!(object1 instanceof Phaser.Physics.Arcade.Sprite)) return;
    if (!(object2 instanceof EnemyEntity)) return;
    const projectileObject = object1;
    const enemyObject = object2;
    // Runtime checks: Ensure objects are likely the expected types
    if (!(projectileObject instanceof Phaser.Physics.Arcade.Sprite)) {
      // logger.warn('Projectile collision with non-Sprite object:', projectileObject);
      return;
    }
    if (!(enemyObject instanceof EnemyEntity) || !enemyObject.instanceId) {
      // logger.warn('Projectile collision with non-EnemyEntity object:', enemyObject);
      // Destroy the projectile if it hit something invalid?
      if (projectileObject?.active) projectileObject.destroy();
      return;
    }
    const projectileSprite = projectileObject as Phaser.Physics.Arcade.Sprite;
    const enemyEntity = enemyObject as EnemyEntity;

    // Find the corresponding IDs managed by our core managers
    const projectileId = [...this.projectileSprites.entries()].find(
      ([, sprite]) => sprite === projectileSprite
    )?.[0];

    // --- Check Projectile Owner ---
    const projectileOwner = projectileId
      ? this.projectileManager.getProjectileOwner(projectileId)
      : undefined;

    // Only player projectiles should hit enemies
    if (projectileOwner !== 'player') {
      // logger.debug(`Ignoring collision: Projectile ${projectileId} (owner: ${projectileOwner}) hit enemy ${enemyEntity.instanceId}`);
      return;
    }
    // --- End Owner Check ---

    const enemyInstanceId = enemyEntity?.instanceId;

    if (!projectileId || !enemyInstanceId) {
      // logger.warn('Collision detected but could not map sprites to manager IDs.');
      // It's possible the projectile was already destroyed by another collision in the same frame
      // Or the enemy was already marked for destruction. Silently return.
      // We might need more robust handling if sprites are missing from maps unexpectedly.
      if (projectileSprite?.active) projectileSprite.destroy(); // Destroy sprite if still active
      return;
    }

    logger.debug(`Projectile ${projectileId} hit enemy ${enemyInstanceId}`);

    // Emit event for managers to handle the consequences
    // Get damage from the projectile manager
    const damage = this.projectileManager.getProjectileDamage(projectileId) ?? 0; // Default to 0 if undefined

    // ProjectileManager will listen and destroy the projectile state
    // EnemyManager will listen and apply damage to the enemy state
    eventBus.emit(PROJECTILE_HIT_ENEMY, {
      projectileId: projectileId,
      enemyInstanceId: enemyInstanceId,
      damage: damage, // Include damage in the event payload
    });

    // Remove the projectile sprite immediately for visual feedback
    // The manager will handle the state removal via the event
    projectileSprite.destroy();
    this.projectileSprites.delete(projectileId);

    // Don't destroy the enemy sprite here; wait for the ENEMY_DESTROYED event from EnemyManager
  };

  // New handler for player vs projectile collisions
  private handlePlayerProjectileCollision = (object1: unknown, object2: unknown): void => {
    // Type guards
    if (!(object1 instanceof Phaser.Physics.Arcade.Sprite)) return; // Player
    if (!(object2 instanceof Phaser.Physics.Arcade.Sprite)) return; // Projectile
    const playerObject = object1;
    const projectileObject = object2;

    // Find the projectile ID
    const projectileId = [...this.projectileSprites.entries()].find(
      ([, sprite]) => sprite === projectileObject
    )?.[0];

    if (!projectileId) {
      // logger.warn('Player collision with unknown projectile sprite.');
      if (projectileObject?.active) projectileObject.destroy(); // Clean up unknown projectile
      return;
    }

    // --- Check Projectile Owner ---
    const projectileOwner = this.projectileManager.getProjectileOwner(projectileId);

    // Only enemy projectiles should hit the player
    if (projectileOwner !== 'enemy') {
      // logger.debug(`Ignoring collision: Player hit projectile ${projectileId} (owner: ${projectileOwner})`);
      return;
    }
    // --- End Owner Check ---

    logger.debug(`Player hit by enemy projectile: ${projectileId}`);

    // Get damage from the projectile manager
    const damage = this.projectileManager.getProjectileDamage(projectileId) ?? 0;

    // Emit event for PlayerManager to handle taking damage
    const eventData: PlayerHitProjectileData = {
      projectileId: projectileId,
      damage: damage,
    };
    eventBus.emit(PLAYER_HIT_PROJECTILE, eventData);

    // Remove the projectile sprite immediately
    projectileObject.destroy();
    this.projectileSprites.delete(projectileId);
    // ProjectileManager state will be cleaned up via PLAYER_HIT_PROJECTILE event if needed,
    // but destroying sprite here is fine as it hit the player.
  };

  // --- Helper Methods ---

  private spawnRandomEnemy(): void {
    // TODO: Get available enemy types from config/difficulty settings
    const enemyTypes = ['triangle_scout', 'square_tank']; // Placeholder
    const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

    const spawnPadding = 50;
    const spawnX = Phaser.Math.Between(spawnPadding, this.cameras.main.width - spawnPadding);
    const spawnY = Phaser.Math.Between(spawnPadding, this.cameras.main.height / 3); // Spawn near top

    this.enemyManager.spawnEnemy(randomType, { x: spawnX, y: spawnY });
  }
}
