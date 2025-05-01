import logger from '../../utils/Logger';
import { EventBus as EventBusType } from '../../events/EventBus';
import * as Events from '../../constants/events';
import { ProjectileLike, ProjectileExplodeData } from './types/ProjectileTypes';

/**
 * Handles explosion logic for projectiles
 */
export class ProjectileExplosionHandler {
  private eventBus: EventBusType;

  constructor(eventBusInstance: EventBusType) {
    this.eventBus = eventBusInstance;
  }

  public updateExplosionTimer(projectile: ProjectileLike, deltaTime: number): boolean {
    if (projectile.timeToExplodeMs === undefined) {
      return false;
    }

    projectile.timeToExplodeMs -= deltaTime;

    if (projectile.timeToExplodeMs <= 0) {
      logger.debug(`Projectile ${projectile.id} explosion timer expired`);
      return true;
    }

    return false;
  }

  public triggerExplosion(projectile: ProjectileLike): boolean {
    if (!projectile || projectile.radius === undefined || projectile.damage === undefined) {
      logger.warn(`Attempted to explode non-bomb or invalid projectile: ${projectile?.id}`);
      return false;
    }

    logger.debug(`Projectile ${projectile.id} exploding at (${projectile.x}, ${projectile.y})`);

    const explosionData: ProjectileExplodeData = {
      id: projectile.id,
      x: projectile.x,
      y: projectile.y,
      radius: projectile.radius,
      damage: projectile.damage,
      owner: projectile.owner,
      type: projectile.type,
    };
    
    this.eventBus.emit(Events.PROJECTILE_EXPLODE, explosionData);
    return true;
  }

  public isExplosive(projectile: ProjectileLike): boolean {
    return projectile.timeToExplodeMs !== undefined &&
           projectile.radius !== undefined &&
           projectile.damage !== undefined;
  }

  public getTimeToExplode(projectile: ProjectileLike): number | undefined {
    return projectile.timeToExplodeMs;
  }

  public getExplosionRadius(projectile: ProjectileLike): number | undefined {
    return projectile.radius;
  }

  public getExplosionDamage(projectile: ProjectileLike): number | undefined {
    return projectile.damage;
  }
}