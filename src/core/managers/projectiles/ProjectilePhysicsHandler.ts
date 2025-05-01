import logger from '../../utils/Logger';
import { ProjectileLike } from './types/ProjectileTypes';

/**
 * Handles physics updates for projectiles
 */
export class ProjectilePhysicsHandler {
  private worldBounds: { top: number; bottom: number; left: number; right: number };

  constructor(worldWidth: number = 800, worldHeight: number = 600) {
    this.worldBounds = {
      top: 0,
      bottom: worldHeight,
      left: 0,
      right: worldWidth
    };
    
    logger.debug(`ProjectilePhysicsHandler initialized with bounds: ${JSON.stringify(this.worldBounds)}`);
  }

  public updateProjectilePhysics(projectile: ProjectileLike, deltaTime: number): boolean {
    projectile.x += projectile.velocityX * (deltaTime / 1000);
    projectile.y += projectile.velocityY * (deltaTime / 1000);

    return this.isWithinBounds(projectile);
  }

  public isWithinBounds(projectile: ProjectileLike): boolean {
    if (
      projectile.y < this.worldBounds.top ||
      projectile.y > this.worldBounds.bottom ||
      projectile.x < this.worldBounds.left ||
      projectile.x > this.worldBounds.right
    ) {
      logger.debug(
        `Projectile ${projectile.id} went off-screen (x=${projectile.x.toFixed(1)}, y=${projectile.y.toFixed(1)})`
      );
      return false;
    }
    
    return true;
  }

  public setWorldBounds(width: number, height: number): void {
    this.worldBounds = {
      top: 0,
      bottom: height,
      left: 0,
      right: width
    };
    
    logger.debug(`ProjectilePhysicsHandler bounds updated: ${JSON.stringify(this.worldBounds)}`);
  }

  public setCustomWorldBounds(bounds: { top: number; bottom: number; left: number; right: number }): void {
    this.worldBounds = bounds;
    logger.debug(`ProjectilePhysicsHandler custom bounds set: ${JSON.stringify(this.worldBounds)}`);
  }

  public getWorldBounds(): { top: number; bottom: number; left: number; right: number } {
    return { ...this.worldBounds };
  }
}