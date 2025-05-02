import Phaser from 'phaser';
import eventBus from '../../../core/events/EventBus';
import logger from '../../../core/utils/Logger';
import debugState from '../../../core/utils/DebugState'; // Import the shared debug state
import { WeaponConfig } from '../../../core/config/schemas/weaponSchema';
import { EnemyShootConfig } from '../../../core/config/schemas/enemySchema'; // Import EnemyShootConfig (Removed unused EnemyConfig)
import * as Events from '../../../core/constants/events'; // Correct path
// import * as Assets from '../../../core/constants/assets'; // No longer needed for projectile textures
// Import the event data interfaces correctly
import {
  ProjectileCreatedEventData,
  SpawnProjectileData,
} from '../../../core/managers/projectiles/types/ProjectileTypes'; // Correct path

// Define payload for the new AoE event
interface RequestAreaEffectData {
  weaponId: string;
  x: number;
  y: number;
  range: number;
  durationMs: number;
  // Specific effect properties
  slowFactor?: number;
  // Add other potential AoE effects here (e.g., damageOverTime)
}

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

    // Create shape based on config and projectile type
    const isLaser = data.type.includes('laser') || data.type.includes('beam');
    const isBullet = data.type.includes('bullet');

    if (isLaser) {
      // Rectangle for lasers/beams
      projectileShape = this.scene.add.rectangle(
        data.x,
        data.y,
        data.visualWidth,
        data.visualHeight,
        color
      ) as ProjectileShape;
    } else if (isBullet || data.visualShape === 'ellipse') {
      // Circle for bullets or explicitly ellipse shapes
      // Use half of the largest dimension as radius for the circle
      const radius = Math.max(data.visualWidth, data.visualHeight) / 2;
      projectileShape = this.scene.add.circle(
        data.x,
        data.y,
        radius,
        color
      ) as ProjectileShape;
    } else {
      // Default to rectangle for other shapes
      projectileShape = this.scene.add.rectangle(
        data.x,
        data.y,
        data.visualWidth,
        data.visualHeight,
        color
      ) as ProjectileShape;
    }

    // Enable physics
    this.physics.add.existing(projectileShape);

    // Set appropriate collision shape based on type
    const body = projectileShape.body as Phaser.Physics.Arcade.Body;
    if (isBullet || data.visualShape === 'ellipse') {
      // Set circular collision body for bullets/ellipses
      const radius = Math.max(data.visualWidth, data.visualHeight) / 2;
      body.setCircle(radius);
    }
    // Rectangular bodies are the default, no need to explicitly set for lasers/rectangles

    // Add to group and map
    this.projectileGroup.add(projectileShape);
    this.projectileShapes.set(data.id, projectileShape);
    // Store instanceId, type, and owner on the shape itself for easy retrieval
    projectileShape.setData('instanceId', data.id);
    projectileShape.setData('objectType', 'projectile');
    projectileShape.setData('owner', data.owner); // Store owner for collision checks
    projectileShape.setName(data.id); // Also set name for potential map key check

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

    // Check if it's the slow_field weapon by ID
    if (weaponConfig.id === 'slow_field') {
      // It's the slow field - emit REQUEST_AREA_EFFECT
      logger.debug(`Requesting Area Effect: ${weaponConfig.id}`);

      // TODO: This calculation ideally happens in WeaponManager or WeaponUpgrader and is passed in `data`.
      // For now, we'll use base values from config as a placeholder.
      // This needs refinement to use upgraded values.
      // Add checks for undefined and provide defaults or log errors
      const currentRange = weaponConfig.baseRange ?? 0; // Use 0 if undefined
      const currentDuration = weaponConfig.baseDurationMs ?? 0; // Use 0 if undefined
      const currentSlowFactor = weaponConfig.baseSlowFactor; // Keep as potentially undefined

      if (currentRange <= 0 || currentDuration <= 0 || currentSlowFactor === undefined) {
         logger.error(`Slow field config missing or invalid base values: Range=${currentRange}, Duration=${currentDuration}, Factor=${currentSlowFactor}`);
         return; // Don't emit if config is invalid
      }

      const aoeData: RequestAreaEffectData = {
        weaponId: weaponConfig.id,
        x: this.playerSprite.x, // Center on player
        y: this.playerSprite.y, // Center on player
        range: currentRange,
        durationMs: currentDuration,
        slowFactor: currentSlowFactor, // Pass the factor itself
      };
      eventBus.emit(Events.REQUEST_AREA_EFFECT, aoeData);

    } else { // Handle all other weapons as standard projectiles
      // It's a standard projectile weapon
      const spawnPoint = this.playerSprite.getTopCenter();
      const velocityY = -projectileSpeed; // projectileSpeed is now guaranteed non-zero (due to WeaponManager workaround)
      const spawnData: SpawnProjectileData = {
        type: weaponConfig.projectileType,
        x: spawnPoint.x,
        y: spawnPoint.y,
        velocityX: 0, // Player projectiles always fire straight up for now
        velocityY: velocityY,
        damage: damage,
        owner: 'player',
        weaponConfig: weaponConfig, // Pass weapon config for visual properties
      };
      eventBus.emit(Events.SPAWN_PROJECTILE, spawnData);
    }
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
