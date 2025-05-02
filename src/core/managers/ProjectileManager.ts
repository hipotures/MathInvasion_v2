import logger from '../utils/Logger';
import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events';
import {
  ProjectileHitEnemyData,
  SpawnProjectileData,
  ProjectileLike,
  ProjectileCreatedEventData,
  ProjectileExplodeData
} from './projectiles/types/ProjectileTypes';

// Re-export types for backward compatibility
export type {
  SpawnProjectileData,
  ProjectileLike,
  ProjectileCreatedEventData,
  ProjectileExplodeData,
  ProjectileHitEnemyData
};

import { ProjectileFactory } from './projectiles/ProjectileFactory';
import { ProjectilePhysicsHandler } from './projectiles/ProjectilePhysicsHandler';
import { ProjectileExplosionHandler } from './projectiles/ProjectileExplosionHandler';
import { ProjectileStateManager } from './projectiles/ProjectileStateManager';

export default class ProjectileManager {
  private eventBus: EventBusType;
  private factory: ProjectileFactory;
  private physicsHandler: ProjectilePhysicsHandler;
  private explosionHandler: ProjectileExplosionHandler;
  private stateManager: ProjectileStateManager;

  // For stale projectile detection
  private lastPositions: Map<string, { x: number; y: number }> = new Map();
  private staleCounters: Map<string, number> = new Map();
  private readonly STALE_UPDATE_THRESHOLD = 60; // Number of updates before removing a stale projectile (e.g., ~1 second at 60fps)
  private readonly POSITION_CHANGE_THRESHOLD = 0.1; // Minimum position change to be considered "moved"

  constructor(eventBusInstance: EventBusType, worldWidth: number = 800, worldHeight: number = 600) {
    this.eventBus = eventBusInstance;
    
    this.factory = new ProjectileFactory(eventBusInstance);
    this.physicsHandler = new ProjectilePhysicsHandler(worldWidth, worldHeight);
    this.explosionHandler = new ProjectileExplosionHandler(eventBusInstance);
    this.stateManager = new ProjectileStateManager();
    
    logger.log(`ProjectileManager initialized with bounds: ${worldWidth}x${worldHeight}`);

    this.handleSpawnProjectile = this.handleSpawnProjectile.bind(this);
    this.handleProjectileHitEnemy = this.handleProjectileHitEnemy.bind(this);

    this.eventBus.on(Events.SPAWN_PROJECTILE, this.handleSpawnProjectile);
    this.eventBus.on(Events.PROJECTILE_HIT_ENEMY, this.handleProjectileHitEnemy);
  }

  private handleSpawnProjectile(data: SpawnProjectileData): void {
    if (data.owner === 'player' && !data.weaponConfig) {
      logger.error('Player projectile spawned without weaponConfig!', data);
      return;
    }
    if (data.owner === 'enemy' && !data.enemyShootConfig) {
      logger.error('Enemy projectile spawned without enemyShootConfig!', data);
      return;
    }
    
    const projectile = this.factory.createProjectile(data);
    this.stateManager.addProjectile(projectile);
    // Initialize tracking for stale detection
    this.lastPositions.set(projectile.id, { x: projectile.x, y: projectile.y });
    this.staleCounters.set(projectile.id, 0);
  }

  private handleProjectileHitEnemy(data: ProjectileHitEnemyData): void {
    logger.debug(
      `Projectile ${data.projectileId} hit enemy ${data.enemyInstanceId}. Removing projectile.`
    );
    this.removeProjectile(data.projectileId);
  }

  public update(deltaTime: number): void {
    const projectileIds = this.stateManager.getAllProjectileIds();

    for (const id of projectileIds) {
      const projectile = this.stateManager.getProjectile(id);
      if (!projectile) continue;

      const lastPos = this.lastPositions.get(id);

      // Update physics *before* checking staleness
      const isInBounds = this.physicsHandler.updateProjectilePhysics(projectile, deltaTime);

      if (!isInBounds) {
        this.removeProjectile(id);
        continue; // Already removed, skip further checks
      }

      // Check for staleness
      if (lastPos) {
        const dx = Math.abs(projectile.x - lastPos.x);
        const dy = Math.abs(projectile.y - lastPos.y);

        if (dx < this.POSITION_CHANGE_THRESHOLD && dy < this.POSITION_CHANGE_THRESHOLD) {
          // Position hasn't changed significantly, increment stale counter
          const currentStaleCount = (this.staleCounters.get(id) || 0) + 1;
          this.staleCounters.set(id, currentStaleCount);

          if (currentStaleCount >= this.STALE_UPDATE_THRESHOLD) {
            logger.warn(`Removing stale projectile ${id} (no movement for ${currentStaleCount} updates).`);
            this.removeProjectile(id);
            continue; // Removed, skip explosion check
          }
        } else {
          // Projectile moved, reset stale counter and update last position
          this.staleCounters.set(id, 0);
          this.lastPositions.set(id, { x: projectile.x, y: projectile.y });
        }
      } else {
         // Should not happen if initialized correctly, but good to handle
         this.lastPositions.set(id, { x: projectile.x, y: projectile.y });
         this.staleCounters.set(id, 0);
      }


      // Check for explosion *after* staleness check
      if (this.explosionHandler.updateExplosionTimer(projectile, deltaTime)) {
        this.explosionHandler.triggerExplosion(projectile);
        this.removeProjectile(id);
        continue;
      }

      // Note: Boundary check is handled above by physicsHandler returning false
    }
  }

  private removeProjectile(projectileId: string): void {
    if (this.stateManager.hasProjectile(projectileId)) {
      logger.debug(`Removing projectile: ${projectileId}`);
      this.stateManager.removeProjectile(projectileId);
      // Clean up tracking maps
      this.lastPositions.delete(projectileId);
      this.staleCounters.delete(projectileId);
      this.eventBus.emit(Events.PROJECTILE_DESTROYED, { id: projectileId });
    }
  }

  public setWorldBounds(width: number, height: number): void {
    this.physicsHandler.setWorldBounds(width, height);
  }

  public getProjectileDamage(projectileId: string): number | undefined {
    return this.stateManager.getProjectileDamage(projectileId);
  }

  public getProjectileOwner(projectileId: string): 'player' | 'enemy' | undefined {
    return this.stateManager.getProjectileOwner(projectileId);
  }

  public getProjectileCreationTime(projectileId: string): number | undefined {
    return this.stateManager.getProjectileCreationTime(projectileId);
  }

  public getProjectileState(projectileId: string): ProjectileLike | undefined {
    return this.stateManager.getProjectileState(projectileId);
  }

  public getProjectileCount(): number {
    return this.stateManager.getProjectileCount();
  }

  public destroy(): void {
    this.eventBus.off(Events.SPAWN_PROJECTILE, this.handleSpawnProjectile);
    this.eventBus.off(Events.PROJECTILE_HIT_ENEMY, this.handleProjectileHitEnemy);
    this.stateManager.clearAllProjectiles();
    // Clear tracking maps on destroy
    this.lastPositions.clear();
    this.staleCounters.clear();
    logger.log('ProjectileManager destroyed and listeners removed');
  }

  /**
   * INTERNAL USE ONLY - FOR TESTING PURPOSES
   * Provides access to the active projectiles map for testing
   * @returns The active projectiles map
   * @internal
   */
  public get activeProjectiles(): Map<string, ProjectileLike> {
    const projectiles = new Map<string, ProjectileLike>();
    this.stateManager.getAllProjectileIds().forEach(id => {
      const projectile = this.stateManager.getProjectile(id);
      if (projectile) {
        projectiles.set(id, projectile);
      }
    });
    return projectiles;
  }
}
