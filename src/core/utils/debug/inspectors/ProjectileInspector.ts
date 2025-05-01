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
   * @returns Projectile inspection data or null if data cannot be retrieved
   */
  public getProjectileDetails(
    id: string, 
    projectileShape: ProjectileShape, 
    projectileType: string
  ): ProjectileInspectionData | null {
    const projectileState = this.projectileManager.getProjectileState(id); // Get manager state
    const body = projectileShape.body as Phaser.Physics.Arcade.Body | null;
  
    if (!projectileState || !body) {
      Logger.warn(`Could not get projectile state or body for inspection. ID: ${id}`);
      return null;
    }

    // Config depends on owner
    let config: any = undefined;
    if (projectileState.owner === 'player') {
      // For player projectiles, we might not have direct access to the weapon config
      // that created this projectile. We could potentially store weaponConfigId in projectileState
      config = {
        projectileType: projectileType,
        owner: 'player',
        // Add any other known properties
      };
    } else {
      // For enemy projectiles, similar situation
      config = {
        projectileType: projectileType,
        owner: 'enemy',
        // Add any other known properties
      };
    }

    return {
      id: id,
      type: `Projectile (${projectileType})`, // Use type from specificData or state
      configData: this.extractConfigData(config), // May be limited if config link is missing
      standardProperties: {
        'Parent': projectileState.owner, // Renamed from Owner, moved here
        'Position X': projectileShape.x?.toFixed(1), // Get from shape
        'Position Y': projectileShape.y?.toFixed(1), // Get from shape
        'Velocity X': body.velocity.x?.toFixed(1), // Get from body
        'Velocity Y': body.velocity.y?.toFixed(1), // Get from body
        'Age (s)': this.calculateAge(projectileState.creationTime), // Get from manager state
        'Damage': projectileState.damage, // Moved from otherProperties
        'Radius': projectileState.radius, // Moved from otherProperties
      },
      otherProperties: {
        // Moved Damage and Radius to standard
        'Time To Explode (ms)': projectileState.timeToExplodeMs?.toFixed(0), // Get from manager state
      },
    };
  }

  /**
   * Calculates the age of an entity based on its creation time
   * @param creationTime The creation time of the entity
   * @returns The age as a string, or 'N/A' if creation time is undefined
   */
  private calculateAge(creationTime?: number): string {
    if (creationTime === undefined) return 'N/A';
    return ((Date.now() - creationTime) / 1000).toFixed(1);
  }

  /**
   * Extracts config data for display
   * @param config The config object to extract data from
   * @returns The extracted config data
   */
  private extractConfigData(config: any): any {
    if (!config) return { 'Error': 'Config not found' };
    // Simple extraction, might need refinement based on config structure
    // We could filter out complex objects/arrays if needed
    return { ...config };
  }
}