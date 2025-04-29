import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import PlayerManager from '../../core/managers/PlayerManager';
import InputManager from '../../core/managers/InputManager';
import WeaponManager from '../../core/managers/WeaponManager';
import ProjectileManager from '../../core/managers/ProjectileManager';
import EconomyManager from '../../core/managers/EconomyManager';
import EnemyManager from '../../core/managers/EnemyManager'; // Import EnemyManager instance
import { PlayerState } from '../../core/types/PlayerState'; // For event data type
import { EnemyEntity } from '../entities/EnemyEntity'; // Import EnemyEntity class
import { EnemyConfig } from '../../core/config/schemas/enemySchema'; // For event data type

// Define constants for event names (matching managers)
const PLAYER_STATE_UPDATED = 'PLAYER_STATE_UPDATED';
const PROJECTILE_CREATED = 'PROJECTILE_CREATED';
const PROJECTILE_DESTROYED = 'PROJECTILE_DESTROYED';
const ENEMY_SPAWNED = 'ENEMY_SPAWNED'; // Add enemy event names
const ENEMY_DESTROYED = 'ENEMY_DESTROYED';
const ENEMY_HEALTH_UPDATED = 'ENEMY_HEALTH_UPDATED'; // Add health update event
const PROJECTILE_HIT_ENEMY = 'PROJECTILE_HIT_ENEMY'; // Event from GameScene collision
const PLAYER_HIT_ENEMY = 'PLAYER_HIT_ENEMY'; // Event from GameScene collision

/** Defines the data expected for the PLAYER_HIT_ENEMY event */
interface PlayerHitEnemyData {
  enemyInstanceId: string;
  damage: number; // Damage dealt by the collision
}

// Define asset keys
const PLAYER_KEY = 'player_ship';
const BULLET_KEY = 'bullet';
const ENEMY_KEY = 'enemy_placeholder'; // Add placeholder enemy key

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

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    logger.log('GameScene preload');
    // Load placeholder assets
    // TODO: Replace with actual assets later
    this.load.image(PLAYER_KEY, 'public/vite.svg');
    this.load.image(BULLET_KEY, 'public/vite.svg');
    this.load.image(ENEMY_KEY, 'public/vite.svg'); // Load placeholder enemy asset
  }

  create(): void {
    logger.log('GameScene create');

    // --- Instantiate Core Managers ---
    // Pass the singleton eventBus instance to each manager
    this.economyManager = new EconomyManager(eventBus, 0); // Start with 0 currency
    this.playerManager = new PlayerManager(eventBus);
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

    // --- Subscribe to Core Events ---
    eventBus.on(PLAYER_STATE_UPDATED, this.handlePlayerStateUpdate);
    eventBus.on(PROJECTILE_CREATED, this.handleProjectileCreated);
    eventBus.on(PROJECTILE_DESTROYED, this.handleProjectileDestroyed);
    eventBus.on(ENEMY_SPAWNED, this.handleEnemySpawned); // Subscribe to enemy events
    eventBus.on(ENEMY_DESTROYED, this.handleEnemyDestroyed);
    eventBus.on(ENEMY_HEALTH_UPDATED, this.handleEnemyHealthUpdate);

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

  private handleProjectileCreated(data: {
    id: string;
    type: string;
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
  }): void {
    logger.debug(`GameScene creating projectile sprite: ID ${data.id}, Type ${data.type}`);
    // TODO: Use data.type to determine texture key if different bullet types exist
    const projectileSprite = this.physics.add.sprite(data.x, data.y, BULLET_KEY);
    this.projectileGroup.add(projectileSprite);
    this.projectileSprites.set(data.id, projectileSprite);

    // Apply velocity provided by the ProjectileManager event
    projectileSprite.setVelocity(data.velocityX, data.velocityY);

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
    logger.debug(`GameScene creating enemy entity: ID ${data.instanceId}, Config ${data.config.id}`);
    const enemyEntity = new EnemyEntity(
      this,
      data.position.x,
      data.position.y,
      ENEMY_KEY, // Use placeholder key for now
      data.instanceId,
      data.config,
    );
    this.enemyGroup.add(enemyEntity);
    this.enemySprites.set(data.instanceId, enemyEntity);
  }

  private handleEnemyDestroyed(data: { instanceId: string; configId: string; reward: number }): void {
    logger.debug(`GameScene destroying enemy entity: ID ${data.instanceId}`);
    const enemyEntity = this.enemySprites.get(data.instanceId);
    if (enemyEntity) {
      enemyEntity.destroySelf(); // Trigger visual destruction in the entity
      // Note: Group removal happens automatically when the entity is destroyed
      this.enemySprites.delete(data.instanceId);
      // EconomyManager listens for this event directly to grant reward
    } else {
      logger.warn(`GameScene could not find enemy entity to destroy: ID ${data.instanceId}`);
    }
  }

  // Handle visual updates based on health changes (e.g., flashing)
  private handleEnemyHealthUpdate(data: { instanceId: string; currentHealth: number; maxHealth: number }): void {
    const enemyEntity = this.enemySprites.get(data.instanceId);
    if (enemyEntity) {
      // Example: Trigger a visual effect on the entity
      enemyEntity.takeDamage(0); // Call takeDamage for visual effect (amount doesn't matter here)
      // Could also update a health bar if enemies had one
    }
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
    this.projectileSprites.forEach((_sprite, _id) => { // Prefix unused parameters
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
      this, // Context for the callback
    );

    this.physics.overlap(
      this.projectileGroup,
      this.enemyGroup,
      this.handleProjectileEnemyCollision,
      undefined,
      this,
    );
  }

  // --- Collision Handlers ---

  // Use 'any' for callback parameters and cast inside
  private handlePlayerEnemyCollision(
    playerObject: any, // Use any
    enemyObject: any, // Use any
  ): void {
    // Cast to expected types within the handler
    const enemyEntity = enemyObject as EnemyEntity;
    if (!enemyEntity?.instanceId) return; // Ignore if not a valid enemy entity

    logger.debug(`Player collided with enemy: ${enemyEntity.instanceId}`);

    // Emit event for PlayerManager to handle taking damage
    // TODO: Get actual collision damage from enemy config
    const collisionDamage = 10; // Placeholder damage
    const eventData: PlayerHitEnemyData = {
      enemyInstanceId: enemyEntity.instanceId,
      damage: collisionDamage,
    };
    eventBus.emit(PLAYER_HIT_ENEMY, eventData);

    // Optional: Destroy the enemy immediately upon collision with the player?
    // Or let the PlayerManager decide if the player takes damage and the enemy survives?
    // For now, let's destroy the enemy as well for simplicity.
    this.enemyManager.handleDamage(enemyEntity.instanceId, 9999); // Instant kill on player collision
  }

  // Use 'any' for callback parameters and cast inside
  private handleProjectileEnemyCollision(
    projectileObject: any, // Use any
    enemyObject: any, // Use any
  ): void {
    // Cast to expected types within the handler
    // Ensure the objects have expected properties before casting/using
    const projectileSprite = projectileObject as Phaser.Physics.Arcade.Sprite;
    const enemyEntity = enemyObject as EnemyEntity;

    // Find the corresponding IDs managed by our core managers
    const projectileId = [...this.projectileSprites.entries()].find(
      ([, sprite]) => sprite === projectileSprite,
    )?.[0];
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
    // ProjectileManager will listen and destroy the projectile state
    // EnemyManager will listen and apply damage to the enemy state
    eventBus.emit('PROJECTILE_HIT_ENEMY', {
      projectileId: projectileId,
      enemyInstanceId: enemyInstanceId,
      // damage: projectileConfig.damage // Damage should ideally come from projectile config via ProjectileManager
    });

    // Remove the projectile sprite immediately for visual feedback
    // The manager will handle the state removal via the event
    projectileSprite.destroy();
    this.projectileSprites.delete(projectileId);

    // Don't destroy the enemy sprite here; wait for the ENEMY_DESTROYED event from EnemyManager
  }

  // --- Helper Methods ---

  private spawnRandomEnemy(): void {
    // TODO: Get available enemy types from config/difficulty settings
    const enemyTypes = ['triangle_scout', 'square_tank']; // Placeholder
    const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

    const spawnPadding = 50;
    const spawnX = Phaser.Math.Between(
      spawnPadding,
      this.cameras.main.width - spawnPadding,
    );
    const spawnY = Phaser.Math.Between(spawnPadding, this.cameras.main.height / 3); // Spawn near top

    this.enemyManager.spawnEnemy(randomType, { x: spawnX, y: spawnY });
  }
}
