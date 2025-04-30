import Phaser from 'phaser';
import eventBus from '../../../core/events/EventBus';
import logger from '../../../core/utils/Logger';
import debugState from '../../../core/utils/DebugState'; // Import the shared debug state
import { WeaponConfig } from '../../../core/config/schemas/weaponSchema';
import { EnemyShootConfig } from '../../../core/config/schemas/enemySchema'; // Import EnemyShootConfig (Removed unused EnemyConfig)
import * as Events from '../../../core/constants/events';
// import * as Assets from '../../../core/constants/assets'; // No longer needed for projectile textures
// Import the new event data interface
import {
  ProjectileCreatedEventData,
  SpawnProjectileData,
} from '../../../core/managers/ProjectileManager';

// Keep this for handleEnemyRequestFire parameter type
interface EnemyRequestFireData {
  instanceId: string;
  x: number;
  y: number;
  shootConfig: NonNullable<EnemyShootConfig>; // Use imported type
}

// Define the type for the map storing projectile shapes
export type ProjectileShape = Phaser.GameObjects.Shape & { body: Phaser.Physics.Arcade.Body }; // Added export

export class ProjectileEventHandler {
  private physics: Phaser.Physics.Arcade.ArcadePhysics;
  private scene: Phaser.Scene; // Store scene reference
  private playerSprite: Phaser.Physics.Arcade.Sprite;
  private projectileGroup: Phaser.GameObjects.Group;
  // Update map type to store Shapes with Arcade Bodies
  private projectileShapes: Map<string, ProjectileShape>;

  constructor(
    scene: Phaser.Scene,
    playerSprite: Phaser.Physics.Arcade.Sprite,
    projectileGroup: Phaser.GameObjects.Group,
    // Update parameter type for the map
    projectileShapes: Map<string, ProjectileShape>
  ) {
    this.scene = scene; // Store scene reference
    this.physics = scene.physics;
    this.playerSprite = playerSprite;
    this.projectileGroup = projectileGroup;
    this.projectileShapes = projectileShapes; // Assign the map

    // Bind methods
    this.handleProjectileCreated = this.handleProjectileCreated.bind(this);
    this.handleProjectileDestroyed = this.handleProjectileDestroyed.bind(this);
    this.handleRequestFireWeapon = this.handleRequestFireWeapon.bind(this);
    this.handleEnemyRequestFire = this.handleEnemyRequestFire.bind(this);

    // Register listeners
    eventBus.on(Events.PROJECTILE_CREATED, this.handleProjectileCreated);
    eventBus.on(Events.PROJECTILE_DESTROYED, this.handleProjectileDestroyed);
    eventBus.on(Events.REQUEST_FIRE_WEAPON, this.handleRequestFireWeapon);
    eventBus.on(Events.ENEMY_REQUEST_FIRE, this.handleEnemyRequestFire);
  }

  // --- Event Handlers ---

  // Update parameter type to use the new interface
  public handleProjectileCreated(data: ProjectileCreatedEventData): void {
    let projectileShape: ProjectileShape;
    const color = Phaser.Display.Color.HexStringToColor(data.visualColor).color; // Parse hex string

    // Create shape based on config
    if (data.visualShape === 'ellipse') {
      projectileShape = this.scene.add.ellipse(
        data.x,
        data.y,
        data.visualWidth,
        data.visualHeight,
        color
      ) as ProjectileShape; // Cast needed as add.ellipse returns base Shape
    } else {
      // Default to rectangle
      projectileShape = this.scene.add.rectangle(
        data.x,
        data.y,
        data.visualWidth,
        data.visualHeight,
        color
      ) as ProjectileShape; // Cast needed as add.rectangle returns base Shape
    }

    // Enable physics
    this.physics.add.existing(projectileShape);

    // Add to group and map
    this.projectileGroup.add(projectileShape);
    this.projectileShapes.set(data.id, projectileShape);

    // Set initial visibility based on debug mode
    projectileShape.setVisible(!debugState.isDebugMode);

    // Apply initial velocity - Ensure body exists before setting velocity
    if (projectileShape.body) {
      // No need to cast here as physics.add.existing guarantees an Arcade Body
      projectileShape.body.setVelocity(data.velocityX, data.velocityY);
    } else {
      logger.error(`Failed to get physics body for projectile shape: ID ${data.id}`);
    }
  }

  public handleProjectileDestroyed(data: { id: string }): void {
    // Retrieve shape from the updated map
    const projectileShape = this.projectileShapes.get(data.id);
    if (projectileShape) {
      // Remove from group, destroy the shape, and remove from map
      this.projectileGroup.remove(projectileShape, true, true);
      this.projectileShapes.delete(data.id);
    } else {
      // Warning might still be valid if destruction happens rapidly
      // logger.warn(`Could not find projectile shape to destroy: ID ${data.id}`);
    }
  }

  // Update the type hint to match the actual event data from WeaponManager
  public handleRequestFireWeapon(data: {
    weaponConfig: WeaponConfig;
    damage: number;
    projectileSpeed: number;
  }): void {
    if (!this.playerSprite?.active) return;
    const { weaponConfig, damage, projectileSpeed } = data;
    const spawnPoint = this.playerSprite.getTopCenter();
    const velocityY = -projectileSpeed;

    // Create the payload for SPAWN_PROJECTILE event
    const spawnData: SpawnProjectileData = {
      // Use imported type
      type: weaponConfig.projectileType, // Keep original type
      x: spawnPoint.x,
      y: spawnPoint.y,
      velocityX: 0,
      velocityY: velocityY,
      damage: damage,
      owner: 'player',
      weaponConfig: weaponConfig, // Pass the weapon config
    };
    eventBus.emit(Events.SPAWN_PROJECTILE, spawnData);
  }

  public handleEnemyRequestFire(data: EnemyRequestFireData): void {
    // Note: We don't need the enemy sprite itself here, just its position and config
    const { shootConfig } = data;
    const projectileSpeed = shootConfig.speed ?? 150;
    let velocityX = 0,
      velocityY = projectileSpeed;

    // Aiming logic requires player sprite position
    if (this.playerSprite?.active) {
      const angle = Phaser.Math.Angle.Between(
        data.x,
        data.y,
        this.playerSprite.x,
        this.playerSprite.y
      );
      const velocity = this.physics.velocityFromAngle(Phaser.Math.RadToDeg(angle), projectileSpeed);
      velocityX = velocity.x;
      velocityY = velocity.y;
    }

    // Create the payload for SPAWN_PROJECTILE event
    const spawnData: SpawnProjectileData = {
      // Use imported type
      type: shootConfig.projectileType, // Keep original type
      x: data.x,
      y: data.y,
      velocityX: velocityX,
      velocityY: velocityY,
      damage: shootConfig.damage ?? 0,
      owner: 'enemy',
      enemyShootConfig: shootConfig, // Pass the enemy shoot config
    };
    eventBus.emit(Events.SPAWN_PROJECTILE, spawnData);
  }

  /** Clean up event listeners */
  public destroy(): void {
    eventBus.off(Events.PROJECTILE_CREATED, this.handleProjectileCreated);
    eventBus.off(Events.PROJECTILE_DESTROYED, this.handleProjectileDestroyed);
    eventBus.off(Events.REQUEST_FIRE_WEAPON, this.handleRequestFireWeapon);
    eventBus.off(Events.ENEMY_REQUEST_FIRE, this.handleEnemyRequestFire);
    logger.log('ProjectileEventHandler destroyed and listeners removed');
  }
}
