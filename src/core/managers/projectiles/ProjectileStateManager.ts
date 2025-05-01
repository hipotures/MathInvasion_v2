import logger from '../../utils/Logger';
import { ProjectileLike } from './types/ProjectileTypes';

export class ProjectileStateManager {
  private activeProjectiles: Map<string, ProjectileLike>;

  constructor() {
    this.activeProjectiles = new Map<string, ProjectileLike>();
    logger.debug('ProjectileStateManager initialized');
  }

  public addProjectile(projectile: ProjectileLike): void {
    this.activeProjectiles.set(projectile.id, projectile);
  }

  public removeProjectile(projectileId: string): boolean {
    if (this.activeProjectiles.has(projectileId)) {
      this.activeProjectiles.delete(projectileId);
      return true;
    }
    return false;
  }

  public getProjectile(projectileId: string): ProjectileLike | undefined {
    return this.activeProjectiles.get(projectileId);
  }

  public getAllProjectiles(): ProjectileLike[] {
    return Array.from(this.activeProjectiles.values());
  }

  public getAllProjectileIds(): string[] {
    return Array.from(this.activeProjectiles.keys());
  }

  public getProjectileCount(): number {
    return this.activeProjectiles.size;
  }

  public hasProjectile(projectileId: string): boolean {
    return this.activeProjectiles.has(projectileId);
  }

  public getProjectileDamage(projectileId: string): number | undefined {
    return this.activeProjectiles.get(projectileId)?.damage;
  }

  public getProjectileOwner(projectileId: string): 'player' | 'enemy' | undefined {
    return this.activeProjectiles.get(projectileId)?.owner;
  }

  public getProjectileCreationTime(projectileId: string): number | undefined {
    return this.activeProjectiles.get(projectileId)?.creationTime;
  }

  public getProjectileState(projectileId: string): ProjectileLike | undefined {
    return this.activeProjectiles.get(projectileId);
  }

  public clearAllProjectiles(): void {
    this.activeProjectiles.clear();
    logger.debug('All projectiles cleared from state manager');
  }
}