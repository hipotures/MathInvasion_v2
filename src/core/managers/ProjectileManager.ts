// Import singleton instances
// import eventBus from '../events/EventBus'; // Removed - instance passed in constructor
import logger from '../utils/Logger';
// Import class type for annotations
import { EventBus as EventBusType } from '../events/EventBus';
// TODO: Import projectile configuration types/interfaces when defined
// TODO: Import projectile entity class when defined

// Define constants for event names
const SPAWN_PROJECTILE = 'SPAWN_PROJECTILE';
const PROJECTILE_CREATED = 'PROJECTILE_CREATED'; // Event for Phaser layer
const PROJECTILE_DESTROYED = 'PROJECTILE_DESTROYED'; // Event for Phaser layer
const PROJECTILE_HIT_ENEMY = 'PROJECTILE_HIT_ENEMY'; // Event from GameScene collision

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
    this.eventBus.on(SPAWN_PROJECTILE, this.handleSpawnProjectile);
    this.eventBus.on(PROJECTILE_HIT_ENEMY, this.handleProjectileHitEnemy); // Subscribe to hit event
  }

  // --- Event Handlers ---

  private handleSpawnProjectile(data: SpawnProjectileData): void {
    this.spawnProjectile(data);
  }

  private handleProjectileHitEnemy(data: ProjectileHitEnemyData): void {
    logger.debug(`Projectile ${data.projectileId} hit enemy ${data.enemyInstanceId}. Removing projectile.`);
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
    const newProjectile: ProjectileLike = { // Ensure object matches interface
      id: newId,
      type: data.type,
      x: data.x,
      y: data.y,
      velocityX: data.velocityX,
      velocityY: data.velocityY,
      // ownerId: data.ownerId,
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
    this.eventBus.emit(PROJECTILE_CREATED, {
      id: newId,
      type: data.type,
      x: data.x,
      y: data.y,
      // Pass any other necessary visual info (e.g., texture key)
    });
  }

  private removeProjectile(projectileId: string): void {
    if (this.activeProjectiles.has(projectileId)) {
      logger.debug(`Removing projectile: ${projectileId}`);
      this.activeProjectiles.delete(projectileId);
      // Emit event for the Phaser layer to remove the visual sprite
      this.eventBus.emit(PROJECTILE_DESTROYED, { id: projectileId });
    } else {
      logger.warn(`Attempted to remove non-existent projectile: ${projectileId}`);
    }
  }

  /** Clean up event listeners when the manager is destroyed */
  public destroy(): void {
    this.eventBus.off(SPAWN_PROJECTILE, this.handleSpawnProjectile);
    this.eventBus.off(PROJECTILE_HIT_ENEMY, this.handleProjectileHitEnemy); // Unsubscribe from hit event
    this.activeProjectiles.clear(); // Clear any remaining projectiles
    logger.log('ProjectileManager destroyed and listeners removed');
  }
}
