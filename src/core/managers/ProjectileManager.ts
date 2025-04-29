// Import singleton instances
import eventBus from '../events/EventBus';
import logger from '../utils/Logger';
// Import class type for annotations
import { EventBus as EventBusType } from '../events/EventBus';
// TODO: Import projectile configuration types/interfaces when defined
// TODO: Import projectile entity class when defined

// Define constants for event names
const SPAWN_PROJECTILE = 'SPAWN_PROJECTILE';
const PROJECTILE_CREATED = 'PROJECTILE_CREATED'; // Event for Phaser layer
const PROJECTILE_DESTROYED = 'PROJECTILE_DESTROYED'; // Event for Phaser layer
// TODO: Add collision event constants later (e.g., PROJECTILE_HIT_ENEMY)

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

export default class ProjectileManager {
  private eventBus: EventBusType;
  private activeProjectiles: Map<string, unknown>; // Placeholder: Replace 'unknown' with ProjectileEntity type later
  private nextProjectileId: number = 0;

  constructor(eventBusInstance: EventBusType) {
    this.eventBus = eventBusInstance;
    this.activeProjectiles = new Map();
    logger.log('ProjectileManager initialized');

    // Bind methods
    this.handleSpawnProjectile = this.handleSpawnProjectile.bind(this);

    // Subscribe to events
    this.eventBus.on(SPAWN_PROJECTILE, this.handleSpawnProjectile);
    // TODO: Subscribe to collision events
  }

  // --- Event Handlers ---

  private handleSpawnProjectile(data: SpawnProjectileData): void {
    this.spawnProjectile(data);
  }

  // --- Core Logic ---

  public update(deltaTime: number): void {
    // Iterate over a copy of the keys to avoid issues if projectiles are removed during iteration
    const projectileIds = [...this.activeProjectiles.keys()];

    for (const id of projectileIds) {
      const projectile = this.activeProjectiles.get(id) as any; // Cast to 'any' for placeholder access
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
    const newProjectile = {
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
    // TODO: Unsubscribe from collision events
    this.activeProjectiles.clear(); // Clear any remaining projectiles
    logger.log('ProjectileManager destroyed and listeners removed');
  }
}
