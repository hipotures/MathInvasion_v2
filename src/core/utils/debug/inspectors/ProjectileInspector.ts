import ProjectileManager from '../../../managers/ProjectileManager';
import { ProjectileInspectionData } from '../types/InspectionTypes';
import Logger from '../../Logger';
import { ProjectileShape } from '../../../../phaser/handlers/event/ProjectileEventHandler';

/**
 * Specialized inspector for projectile entities
 * Extracts projectile-specific data for debugging
 */
export class ProjectileInspector {
  constructor(private projectileManager: ProjectileManager) {}

  /**
   * Gets detailed inspection data for a projectile
   * @param id The unique ID of the projectile
   * @param projectileShape The projectile shape to inspect
   * @param projectileType The type of the projectile
   * @param currentTime The current timestamp (potentially frozen during pause) to use for age calculation.
   * @returns Projectile inspection data or null if data cannot be retrieved
   */
  // Return a simple key-value object instead of the structured ProjectileInspectionData
  public getProjectileDetails(
    id: string,
    projectileShape: ProjectileShape,
    projectileType: string, // Type might be redundant if stored in state
    currentTime: number
  ): { [key: string]: any } | null {
    const projectileState = this.projectileManager.getProjectileState(id); // Get manager state
    const body = projectileShape.body as Phaser.Physics.Arcade.Body | null;

    if (!projectileState || !body) {
      Logger.warn(`Could not get projectile state or body for inspection. ID: ${id}`);
      return null;
    }

    const details: { [key: string]: any } = {
      // --- Core Identification ---
      ID: id,
      Type: `Projectile (${projectileType || 'unknown'})`, // Rely on passed argument
      Parent: projectileState.owner, // Use Parent for consistency

      // --- Shape Properties ---
      X: projectileShape.x?.toFixed(1),
      Y: projectileShape.y?.toFixed(1),
      // Angle might not be relevant for simple shapes, but include if needed
      // Angle: projectileShape.angle?.toFixed(1),
      ScaleX: projectileShape.scaleX?.toFixed(2),
      ScaleY: projectileShape.scaleY?.toFixed(2),
      Depth: projectileShape.depth,
      Visible: projectileShape.visible,
      Active: projectileShape.active,
      // Texture might not apply to shapes, but check data if needed
      // Texture: projectileShape.texture?.key,

      // --- Physics Body Properties ---
      Vx: body.velocity.x?.toFixed(1),
      Vy: body.velocity.y?.toFixed(1),
      Ax: body.acceleration.x?.toFixed(1),
      Ay: body.acceleration.y?.toFixed(1),
      BodyWidth: body.width?.toFixed(0),
      BodyHeight: body.height?.toFixed(0),
      BodyX: body.x?.toFixed(1),
      BodyY: body.y?.toFixed(1),
      Mass: body.mass?.toFixed(2),
      BounceX: body.bounce.x?.toFixed(2),
      BounceY: body.bounce.y?.toFixed(2),
      OnFloor: body.onFloor(),
      OnWall: body.onWall(),
      AllowGravity: body.allowGravity,
      Immovable: body.immovable,

      // --- Manager State Properties ---
      Damage: projectileState.damage,
      Radius: projectileState.radius,
      TimeToExplodeMs: projectileState.timeToExplodeMs?.toFixed(0),
      AgeSeconds: this.calculateAge(projectileState.creationTime, currentTime), // Pass currentTime
      
      // --- Config Properties (Placeholder) ---
      // Config is tricky here as it depends on the weapon/enemy that fired it.
      // We might need to enhance ProjectileState to store the source config ID.
      config_Note: 'Specific config details depend on source (weapon/enemy)',
      config_OwnerType: projectileState.owner,
      config_ProjectileType: projectileType || 'unknown', // Rely on passed argument
    };

    return details;
  }

  /**
   * Calculates the age of an entity based on its creation time and the provided current time
   * @param creationTime The creation time of the entity
   * @param currentTime The current timestamp (potentially frozen during pause)
   * @returns The age as a string, or 'N/A' if creation time is undefined
   */
  private calculateAge(creationTime: number | undefined, currentTime: number): string {
    if (creationTime === undefined) return 'N/A';
    // Use currentTime instead of Date.now()
    return ((currentTime - creationTime) / 1000).toFixed(1);
  }
}