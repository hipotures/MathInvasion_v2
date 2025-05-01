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

      if (this.explosionHandler.updateExplosionTimer(projectile, deltaTime)) {
        this.explosionHandler.triggerExplosion(projectile);
        this.removeProjectile(id);
        continue;
      }

      if (!this.physicsHandler.updateProjectilePhysics(projectile, deltaTime)) {
        this.removeProjectile(id);
      }
    }
  }

  private removeProjectile(projectileId: string): void {
    if (this.stateManager.hasProjectile(projectileId)) {
      logger.debug(`Removing projectile: ${projectileId}`);
      this.stateManager.removeProjectile(projectileId);
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
