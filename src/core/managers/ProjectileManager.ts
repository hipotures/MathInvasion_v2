// Import singleton instances
// import eventBus from '../events/EventBus'; // Removed - instance passed in constructor
import logger from '../utils/Logger';
// Import class type for annotations
import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events'; // Import event constants
// Import config types
import { WeaponConfig } from '../config/schemas/weaponSchema';
import { EnemyShootConfig } from '../config/schemas/enemySchema'; // Import EnemyShootConfig

// Default visual properties
const DEFAULT_VISUAL_SHAPE = 'rectangle';
const DEFAULT_VISUAL_WIDTH = 5;
const DEFAULT_VISUAL_HEIGHT = 5;
const DEFAULT_VISUAL_COLOR = '0xffffff'; // White

/** Defines the data expected for the SPAWN_PROJECTILE event */
export interface SpawnProjectileData {
  type: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  damage?: number; // Added optional damage from weapon
  owner: 'player' | 'enemy';
  radius?: number; // For area effects like bombs
  timeToExplodeMs?: number; // For timed explosives
  // Pass the relevant config object directly
  weaponConfig?: WeaponConfig;
  enemyShootConfig?: NonNullable<EnemyShootConfig>; // Ensure it's not undefined if passed
}

/** Defines the data expected for the PROJECTILE_HIT_ENEMY event */
// Note: This interface might be better placed in a shared types file or events.ts
interface ProjectileHitEnemyData {
  projectileId: string;
  enemyInstanceId: string;
  // damage?: number; // Optional: Damage might be handled by EnemyManager based on projectile type
}

/** Defines the data expected for the PROJECTILE_EXPLODE event */
interface ProjectileExplodeData {
  id: string;
  x: number;
  y: number;
  radius: number;
  damage: number;
  owner: 'player' | 'enemy';
  type: string;
}

/** Defines the data payload for the PROJECTILE_CREATED event */
export interface ProjectileCreatedEventData {
  // New interface
  id: string;
  type: string; // Keep original type for potential use
  x: number;
  y: number;
  owner: 'player' | 'enemy';
  velocityX: number;
  velocityY: number;
  // Visual properties for dynamic generation
  visualShape: 'rectangle' | 'ellipse';
  visualWidth: number;
  visualHeight: number;
  visualColor: string; // Hex string '0xRRGGBB'
}

/** Placeholder type until a proper Projectile entity class is created */
export interface ProjectileLike {
  id: string;
  type: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  damage?: number;
  owner: 'player' | 'enemy';
  radius?: number;
  timeToExplodeMs?: number;
  creationTime: number; // Timestamp when created
  update: (dt: number) => void;
}

/**
 * Manages active projectiles in the game world.
 * Handles spawning, movement, collision detection (via events), and removal.
 */
// Removed duplicate SpawnProjectileData and ProjectileHitEnemyData interfaces

// Placeholder type until a proper Projectile entity class is created
export interface ProjectileLike {
  // Added export
  id: string;
  type: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  damage?: number; // Added optional damage property
  owner: 'player' | 'enemy'; // Added owner property
  radius?: number; // Optional: For area effects
  timeToExplodeMs?: number; // Optional: Countdown timer for explosion
  creationTime: number; // Timestamp when created
  update: (dt: number) => void;
}

export default class ProjectileManager {
  private eventBus: EventBusType;
  private activeProjectiles: Map<string, ProjectileLike>;
  private nextProjectileId: number = 0;
  private worldBounds: { top: number; bottom: number; left: number; right: number };

  constructor(eventBusInstance: EventBusType, worldWidth: number = 800, worldHeight: number = 600) {
    this.eventBus = eventBusInstance;
    this.activeProjectiles = new Map();
    this.worldBounds = { top: 0, bottom: worldHeight, left: 0, right: worldWidth };
    logger.log(`ProjectileManager initialized with bounds: ${JSON.stringify(this.worldBounds)}`);

    // Bind methods
    this.handleSpawnProjectile = this.handleSpawnProjectile.bind(this);
    this.handleProjectileHitEnemy = this.handleProjectileHitEnemy.bind(this); // Bind new handler

    // Subscribe to events
    this.eventBus.on(Events.SPAWN_PROJECTILE, this.handleSpawnProjectile);
    this.eventBus.on(Events.PROJECTILE_HIT_ENEMY, this.handleProjectileHitEnemy); // Subscribe to hit event
  }

  // --- Event Handlers ---

  private handleSpawnProjectile(data: SpawnProjectileData): void {
    // Basic validation: Ensure either weaponConfig or enemyShootConfig is provided based on owner
    if (data.owner === 'player' && !data.weaponConfig) {
      logger.error('Player projectile spawned without weaponConfig!', data);
      return;
    }
    if (data.owner === 'enemy' && !data.enemyShootConfig) {
      logger.error('Enemy projectile spawned without enemyShootConfig!', data);
      return;
    }
    this.spawnProjectile(data);
  }

  private handleProjectileHitEnemy(data: ProjectileHitEnemyData): void {
    logger.debug(
      `Projectile ${data.projectileId} hit enemy ${data.enemyInstanceId}. Removing projectile.`
    );
    this.removeProjectile(data.projectileId);
  }

  // --- Core Logic ---

  public update(deltaTime: number): void {
    const projectileIds = [...this.activeProjectiles.keys()];

    for (const id of projectileIds) {
      const projectile = this.activeProjectiles.get(id);
      if (!projectile) continue;

      projectile.update(deltaTime);

      if (projectile.timeToExplodeMs !== undefined) {
        projectile.timeToExplodeMs -= deltaTime;
        if (projectile.timeToExplodeMs <= 0) {
          this.triggerExplosion(id);
          continue; // Skip boundary check if it exploded
        }
      }

      // Check for out of bounds using stored bounds
      if (
        projectile.y < this.worldBounds.top ||
        projectile.y > this.worldBounds.bottom ||
        projectile.x < this.worldBounds.left ||
        projectile.x > this.worldBounds.right
      ) {
        logger.debug(
          `Projectile ${id} went off-screen (x=${projectile.x.toFixed(1)}, y=${projectile.y.toFixed(1)})`
        );
        this.removeProjectile(id);
      }
    }
  }

  private spawnProjectile(data: SpawnProjectileData): void {
    const newId = `proj_${this.nextProjectileId++}`;
    logger.debug(`Spawning projectile: ${data.type} (ID: ${newId}) at (${data.x}, ${data.y})`);

    // Determine visual properties from config or defaults
    let visualShape: 'rectangle' | 'ellipse' = DEFAULT_VISUAL_SHAPE;
    let visualWidth: number = DEFAULT_VISUAL_WIDTH;
    let visualHeight: number = DEFAULT_VISUAL_HEIGHT;
    let visualColor: string = DEFAULT_VISUAL_COLOR;

    if (data.owner === 'player' && data.weaponConfig) {
      visualShape = data.weaponConfig.visualShape ?? visualShape;
      visualWidth = data.weaponConfig.visualWidth ?? visualWidth;
      visualHeight = data.weaponConfig.visualHeight ?? visualHeight;
      visualColor = data.weaponConfig.visualColor ?? visualColor;
    } else if (data.owner === 'enemy' && data.enemyShootConfig) {
      visualShape = data.enemyShootConfig.visualShape ?? visualShape;
      visualWidth = data.enemyShootConfig.visualWidth ?? visualWidth;
      visualHeight = data.enemyShootConfig.visualHeight ?? visualHeight;
      visualColor = data.enemyShootConfig.visualColor ?? visualColor;
    } else {
      logger.warn(
        `Could not determine visual config for projectile ${newId} (type: ${data.type}). Using defaults.`
      );
    }

    // --- Placeholder Logic for internal state ---
    const newProjectile: ProjectileLike = {
      id: newId,
      type: data.type,
      x: data.x,
      y: data.y,
      velocityX: data.velocityX,
      velocityY: data.velocityY,
      damage: data.damage,
      owner: data.owner,
      radius: data.radius,
      timeToExplodeMs: data.timeToExplodeMs,
      creationTime: Date.now(), // Record creation time
      update: (dt: number) => {
        newProjectile.x += newProjectile.velocityX * (dt / 1000);
        newProjectile.y += newProjectile.velocityY * (dt / 1000);
      },
    };
    this.activeProjectiles.set(newId, newProjectile);
    // --- End Placeholder ---

    // Emit event for the Phaser layer with visual details
    const eventPayload: ProjectileCreatedEventData = {
      // Use the new interface
      id: newId,
      type: data.type, // Pass original type
      x: data.x,
      y: data.y,
      owner: newProjectile.owner,
      velocityX: newProjectile.velocityX,
      velocityY: newProjectile.velocityY,
      // Add visual properties
      visualShape: visualShape,
      visualWidth: visualWidth,
      visualHeight: visualHeight,
      visualColor: visualColor,
    };
    this.eventBus.emit(Events.PROJECTILE_CREATED, eventPayload); // Emit typed payload
  }

  private triggerExplosion(projectileId: string): void {
    const projectile = this.activeProjectiles.get(projectileId);
    if (!projectile || projectile.radius === undefined || projectile.damage === undefined) {
      logger.warn(`Attempted to explode non-bomb or invalid projectile: ${projectileId}`);
      this.removeProjectile(projectileId); // Clean up anyway
      return;
    }

    logger.debug(`Projectile ${projectileId} exploding at (${projectile.x}, ${projectile.y})`);

    // Emit explosion event for collision handler/scene to process area damage
    this.eventBus.emit(Events.PROJECTILE_EXPLODE, {
      id: projectile.id,
      x: projectile.x, // Use the final position before explosion
      y: projectile.y, // Use the final position before explosion
      radius: projectile.radius,
      damage: projectile.damage,
      owner: projectile.owner,
      type: projectile.type, // Include type property to match test expectations
    } as ProjectileExplodeData);

    // Remove the projectile after explosion
    this.removeProjectile(projectileId);
  }

  private removeProjectile(projectileId: string): void {
    if (this.activeProjectiles.has(projectileId)) {
      logger.debug(`Removing projectile: ${projectileId}`);
      this.activeProjectiles.delete(projectileId);
      this.eventBus.emit(Events.PROJECTILE_DESTROYED, { id: projectileId });
    }
  }

  /**
   * Retrieves the damage value associated with a specific projectile instance.
   * @param projectileId The unique ID of the projectile.
   * @returns The damage value, or undefined if the projectile doesn't exist or has no damage.
   */
  public getProjectileDamage(projectileId: string): number | undefined {
    return this.activeProjectiles.get(projectileId)?.damage;
  }

  /**
   * Retrieves the owner ('player' or 'enemy') of a specific projectile instance.
   * @param projectileId The unique ID of the projectile.
   * @returns The owner, or undefined if the projectile doesn't exist.
   */
  /**
   * Retrieves the creation timestamp of a specific projectile instance.
   * @param projectileId The unique ID of the projectile.
   * @returns The creation timestamp (milliseconds since epoch), or undefined if not found.
   */
  public getProjectileCreationTime(projectileId: string): number | undefined {
    return this.activeProjectiles.get(projectileId)?.creationTime;
  }
  public getProjectileOwner(projectileId: string): 'player' | 'enemy' | undefined {
    return this.activeProjectiles.get(projectileId)?.owner;
  }

  /** Clean up event listeners when the manager is destroyed */
  public destroy(): void {
    this.eventBus.off(Events.SPAWN_PROJECTILE, this.handleSpawnProjectile);
    this.eventBus.off(Events.PROJECTILE_HIT_ENEMY, this.handleProjectileHitEnemy); // Unsubscribe from hit event
    this.activeProjectiles.clear(); // Clear any remaining projectiles
    logger.log('ProjectileManager destroyed and listeners removed');
  }
}
