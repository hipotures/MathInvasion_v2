import ProjectileManager from '../../../../core/managers/ProjectileManager';
import { ProjectileShape } from '../../event/ProjectileEventHandler';
import { ActiveObjectData, DataCollector } from '../types/DebugPanelTypes';

/**
 * Extracts and formats projectile information for the debug panel
 */
export class ProjectileDataCollector implements DataCollector<ActiveObjectData[]> {
  private projectileManager: ProjectileManager;
  private projectileShapes: Map<string, ProjectileShape>;

  constructor(projectileManager: ProjectileManager, projectileShapes: Map<string, ProjectileShape>) {
    this.projectileManager = projectileManager;
    this.projectileShapes = projectileShapes;
  }

  /**
   * Collects debug data for all active projectiles
   * @returns Array of projectile debug data
   */
  public collectData(): ActiveObjectData[] {
    const projectileData: ActiveObjectData[] = [];
    const now = Date.now();

    this.projectileShapes.forEach((projectile, id) => {
      // ProjectileShape might be Graphics or Sprite, handle accordingly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (projectile as any).body as Phaser.Physics.Arcade.Body; // Need to cast to access body
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const position = { x: (projectile as any).x ?? 0, y: (projectile as any).y ?? 0 }; // Access position safely
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textureKey = (projectile as any).texture?.key ?? 'shape'; // Get texture key if sprite

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((projectile as any).active) {
        const creationTime = this.projectileManager.getProjectileCreationTime(id as string) ?? now; // Assuming id is string here
        const age = Math.floor((now - creationTime) / 1000);

        projectileData.push({
          ID: id,
          T: `Pr:${textureKey}`,
          A: age,
          X: Math.round(position.x),
          Y: Math.round(position.y),
          Vx: parseFloat(body?.velocity.x.toFixed(1) ?? '0'),
          Vy: parseFloat(body?.velocity.y.toFixed(1) ?? '0'),
        });
      }
    });

    return projectileData;
  }

  /**
   * Gets the number of active projectiles
   * @returns The number of active projectiles
   */
  public getProjectileCount(): number {
    return this.projectileShapes.size;
  }
}