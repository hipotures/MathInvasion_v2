// Import singleton instances
// import eventBus from '../events/EventBus'; // Removed - instance passed in constructor
import logger from '../utils/Logger';
// Import class type for annotations
import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events'; // Import event constants
// TODO: Import projectile configuration types/interfaces when defined
// TODO: Import projectile entity class when defined

/** Defines the data expected for the SPAWN_PROJECTILE event */
// Note: This interface might be better placed in a shared types file or events.ts
interface SpawnProjectileData {
  type: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  damage?: number; // Added optional damage from weapon
  owner: 'player' | 'enemy'; // Added owner property
  radius?: number; // Optional: For area effects like bombs
  timeToExplodeMs?: number; // Optional: For timed explosives
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
}

/**
 * Manages active projectiles in the game world.
 * Handles spawning, movement, collision detection (via events), and removal.
 */
/** Defines the data expected for the SPAWN_PROJECTILE event */
interface SpawnProjectileData {
  type: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  // ownerId?: string; // Optional: To distinguish player/enemy projectiles
}

/** Defines the data expected for the PROJECTILE_HIT_ENEMY event */
interface ProjectileHitEnemyData {
  projectileId: string;
  enemyInstanceId: string;
  // damage?: number; // Optional: Damage might be handled by EnemyManager based on projectile type
}

// Placeholder type until a proper Projectile entity class is created
interface ProjectileLike {
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
  update: (dt: number) => void;
}

export default class ProjectileManager {
  private eventBus: EventBusType;
  private activeProjectiles: Map<string, ProjectileLike>; // Use placeholder type
  private nextProjectileId: number = 0;

  constructor(eventBusInstance: EventBusType) {
    this.eventBus = eventBusInstance;
    this.activeProjectiles = new Map();
    logger.log('ProjectileManager initialized');

    // Bind methods
    this.handleSpawnProjectile = this.handleSpawnProjectile.bind(this);
    this.handleProjectileHitEnemy = this.handleProjectileHitEnemy.bind(this); // Bind new handler

    // Subscribe to events
    this.eventBus.on(Events.SPAWN_PROJECTILE, this.handleSpawnProjectile);
    this.eventBus.on(Events.PROJECTILE_HIT_ENEMY, this.handleProjectileHitEnemy); // Subscribe to hit event
  }

  // --- Event Handlers ---

  private handleSpawnProjectile(data: SpawnProjectileData): void {
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
    // Iterate over a copy of the keys to avoid issues if projectiles are removed during iteration
    const projectileIds = [...this.activeProjectiles.keys()];

    for (const id of projectileIds) {
      const projectile = this.activeProjectiles.get(id); // Remove 'as any' cast
      if (!projectile) continue;

      // Update projectile position (using placeholder logic)
      projectile.update(deltaTime);

      // Handle explosion timer if present
      if (projectile.timeToExplodeMs !== undefined) {
        projectile.timeToExplodeMs -= deltaTime;
        if (projectile.timeToExplodeMs <= 0) {
          this.triggerExplosion(id);
          continue; // Skip boundary check if it exploded
        }
      }

      // Check for out of bounds (top of screen)
      // TODO: Get bounds from config or scene dimensions event
      const worldTopBound = 0;
      if (projectile.y < worldTopBound) {
        logger.debug(`Projectile ${id} went off-screen (y=${projectile.y})`);
        this.removeProjectile(id); // Call internal remove method
      }
      // TODO: Add checks for other bounds (bottom, left, right) if necessary
    }
  }

  private spawnProjectile(data: SpawnProjectileData): void {
    const newId = `proj_${this.nextProjectileId++}`;
    logger.debug(`Spawning projectile: ${data.type} (ID: ${newId}) at (${data.x}, ${data.y})`);

    // --- Placeholder Logic ---
    // TODO: Replace with actual projectile entity creation
    const newProjectile: ProjectileLike = {
      // Ensure object matches interface
      id: newId,
      type: data.type,
      x: data.x,
      y: data.y,
      velocityX: data.velocityX,
      velocityY: data.velocityY,
      damage: data.damage, // Store damage from spawn data
      owner: data.owner, // Store owner from spawn data
      radius: data.radius, // Store radius if provided
      timeToExplodeMs: data.timeToExplodeMs, // Store explosion timer if provided
      update: (dt: number) => {
        // Basic movement logic (will be in the entity itself later)
        newProjectile.x += newProjectile.velocityX * (dt / 1000);
        newProjectile.y += newProjectile.velocityY * (dt / 1000);
        // TODO: Add boundary checks here or in update loop
      },
    };
    this.activeProjectiles.set(newId, newProjectile);
    // --- End Placeholder ---

    // Emit event for the Phaser layer to create the visual sprite
    this.eventBus.emit(Events.PROJECTILE_CREATED, {
      id: newId,
      type: data.type,
      x: data.x,
      y: data.y,
      owner: newProjectile.owner, // Pass owner to the scene
      // Pass any other necessary visual info (e.g., texture key)
    });
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
      x: projectile.x,
      y: projectile.y,
      radius: projectile.radius,
      damage: projectile.damage,
      owner: projectile.owner,
    } as ProjectileExplodeData);

    // Remove the projectile after explosion
    this.removeProjectile(projectileId);
  }

  private removeProjectile(projectileId: string): void {
    if (this.activeProjectiles.has(projectileId)) {
      logger.debug(`Removing projectile: ${projectileId}`);
      this.activeProjectiles.delete(projectileId);
      // Emit event for the Phaser layer to remove the visual sprite
      this.eventBus.emit(Events.PROJECTILE_DESTROYED, { id: projectileId });
    } else {
      // logger.warn(`Attempted to remove non-existent projectile: ${projectileId}`); // Can be noisy if hit happens same frame as boundary check
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
