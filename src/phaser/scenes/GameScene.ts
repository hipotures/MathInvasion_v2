import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import PlayerManager from '../../core/managers/PlayerManager';
import InputManager from '../../core/managers/InputManager';
import WeaponManager from '../../core/managers/WeaponManager';
import ProjectileManager from '../../core/managers/ProjectileManager';
import EconomyManager from '../../core/managers/EconomyManager';
import { PlayerState } from '../../core/types/PlayerState'; // For event data type

// Define constants for event names (matching managers)
const PLAYER_STATE_UPDATED = 'PLAYER_STATE_UPDATED';
const PROJECTILE_CREATED = 'PROJECTILE_CREATED';
const PROJECTILE_DESTROYED = 'PROJECTILE_DESTROYED';

// Define asset keys
const PLAYER_KEY = 'player_ship';
const BULLET_KEY = 'bullet';

export default class GameScene extends Phaser.Scene {
  // Core Managers
  private playerManager!: PlayerManager;
  private inputManager!: InputManager;
  private weaponManager!: WeaponManager;
  private projectileManager!: ProjectileManager;
  private economyManager!: EconomyManager;

  // Game Objects
  private playerSprite!: Phaser.Physics.Arcade.Sprite;
  private projectileGroup!: Phaser.GameObjects.Group;
  // Map to link projectile IDs from ProjectileManager to Phaser Sprites
  private projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    logger.log('GameScene preload');
    // Load placeholder assets
    // TODO: Replace with actual assets later
    this.load.image(PLAYER_KEY, 'public/vite.svg'); // Using vite logo as placeholder
    this.load.image(BULLET_KEY, 'public/vite.svg'); // Using vite logo as placeholder
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

    // --- Create Player Sprite ---
    const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
    // Position player near the bottom center
    const playerY = this.cameras.main.height - 50;
    this.playerSprite = this.physics.add.sprite(screenCenterX, playerY, PLAYER_KEY);
    this.playerSprite.setCollideWorldBounds(true); // Keep player on screen
    // TODO: Set player physics properties (size, offset) if needed

    // --- Create Projectile Group ---
    this.projectileGroup = this.add.group({
      runChildUpdate: true, // Allows projectiles to update themselves (optional)
    });

    // --- Bind Event Handlers ---
    this.handlePlayerStateUpdate = this.handlePlayerStateUpdate.bind(this);
    this.handleProjectileCreated = this.handleProjectileCreated.bind(this);
    this.handleProjectileDestroyed = this.handleProjectileDestroyed.bind(this);

    // --- Subscribe to Core Events ---
    eventBus.on(PLAYER_STATE_UPDATED, this.handlePlayerStateUpdate);
    eventBus.on(PROJECTILE_CREATED, this.handleProjectileCreated);
    eventBus.on(PROJECTILE_DESTROYED, this.handleProjectileDestroyed);

    // --- Scene Shutdown Cleanup ---
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      logger.log('GameScene shutdown, cleaning up managers and listeners');
      // Destroy managers to remove their global listeners
      this.inputManager.destroy();
      this.playerManager.destroy();
      this.weaponManager.destroy();
      this.projectileManager.destroy();
      // EconomyManager doesn't have global listeners currently

      // Remove scene-specific listeners
      eventBus.off(PLAYER_STATE_UPDATED, this.handlePlayerStateUpdate);
      eventBus.off(PROJECTILE_CREATED, this.handleProjectileCreated);
      eventBus.off(PROJECTILE_DESTROYED, this.handleProjectileDestroyed);
      this.projectileSprites.clear();
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

  private handleProjectileCreated(data: { id: string; type: string; x: number; y: number }): void {
    logger.debug(`GameScene creating projectile sprite: ID ${data.id}, Type ${data.type}`);
    // TODO: Use data.type to determine texture key, velocity, etc. if needed here
    const projectileSprite = this.physics.add.sprite(data.x, data.y, BULLET_KEY);
    this.projectileGroup.add(projectileSprite);
    this.projectileSprites.set(data.id, projectileSprite);

    // Apply velocity (ProjectileManager already calculated it)
    // We might need the velocity in the event data if not handled by the manager's update
    // projectileSprite.setVelocity(data.velocityX, data.velocityY);

    // TODO: Set up collision detection for the projectile sprite
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

  // --- Game Loop Update ---

  update(time: number, delta: number): void {
    // Update core managers
    // Pass delta in milliseconds
    this.playerManager.update(delta);
    this.weaponManager.update(delta);
    this.projectileManager.update(delta);
    // InputManager update might be needed for polling, but currently event-driven
    // EconomyManager update likely not needed per frame

    // Update projectile sprites based on ProjectileManager state (if needed)
    // This is an alternative to having ProjectileManager emit position updates constantly
    this.projectileSprites.forEach((sprite, id) => {
      // const projectileState = this.projectileManager.getProjectileState(id); // Need method in manager
      // if (projectileState) {
      //   sprite.setPosition(projectileState.x, projectileState.y);
      // }
      // Boundary check is now handled within ProjectileManager.update()
    });

    // --- Collision Detection ---
    // TODO: Add physics overlaps/colliders here
    // e.g., this.physics.overlap(this.playerSprite, enemyGroup, this.handlePlayerEnemyCollision, undefined, this);
    // e.g., this.physics.overlap(this.projectileGroup, enemyGroup, this.handleProjectileEnemyCollision, undefined, this);
  }

  // --- Collision Handlers ---
  // TODO: Implement collision handler methods
  // private handlePlayerEnemyCollision(player: Phaser.Types.Physics.Arcade.GameObjectWithBody, enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody): void {
  //   logger.debug('Player hit enemy');
  //   // Emit event for PlayerManager to take damage
  //   // eventBus.emit('PLAYER_HIT', { damage: 10 }); // Example
  //   // Handle enemy destruction or damage
  // }

  // private handleProjectileEnemyCollision(projectile: Phaser.Types.Physics.Arcade.GameObjectWithBody, enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody): void {
  //   logger.debug('Projectile hit enemy');
  //   // Find projectile ID from sprite? Or pass it somehow.
  //   // const projectileId = /* find ID */;
  //   // Emit event for ProjectileManager to remove projectile
  //   // eventBus.emit('PROJECTILE_HIT_ENEMY', { projectileId: projectileId, enemyId: enemy.name }); // Example
  //   // Handle enemy destruction or damage
  //   // projectile.destroy(); // Destroy sprite immediately or wait for manager event?
  //   // enemy.destroy();
  // }
}
