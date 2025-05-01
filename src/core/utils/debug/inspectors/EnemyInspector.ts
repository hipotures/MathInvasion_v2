import { EnemyManager } from '../../../managers/EnemyManager';
import ConfigLoader from '../../../config/ConfigLoader';
import { EnemyInspectionData } from '../types/InspectionTypes';
import Logger from '../../Logger';
import { EnemyEntity } from '../../../../phaser/entities/EnemyEntity';

/**
 * Specialized inspector for enemy entities
 * Extracts enemy-specific data for debugging
 */
export class EnemyInspector {
  constructor(private enemyManager: EnemyManager) {}

  /**
   * Gets detailed inspection data for an enemy
   * @param id The unique ID of the enemy instance
   * @param enemyEntity The enemy entity to inspect
   * @returns Enemy inspection data or null if data cannot be retrieved
   */
  public getEnemyDetails(id: string, enemyEntity: EnemyEntity): EnemyInspectionData | null {
    const configId = enemyEntity.configId; // Get from entity
    const health = this.enemyManager.getEnemyHealth(id); // Get from manager
    const creationTime = this.enemyManager.getEnemyCreationTime(id); // Get from manager
    const body = enemyEntity.body as Phaser.Physics.Arcade.Body | null;
  
    // Use configId from entity, check health/time from manager, check body
    if (!configId || health === undefined || creationTime === undefined || !body) {
      Logger.warn(`Could not get complete enemy data for inspection. ID: ${id}`);
      return null;
    }

    const config = ConfigLoader.getEnemiesConfig().find(c => c.id === configId);

    return {
      id: id,
      type: `Enemy (${configId})`,
      configData: this.extractConfigData(config),
      standardProperties: {
        'Position X': enemyEntity.x?.toFixed(1), // Get from entity
        'Position Y': enemyEntity.y?.toFixed(1), // Get from entity
        'Velocity X': body.velocity.x?.toFixed(1), // Get from body
        'Velocity Y': body.velocity.y?.toFixed(1), // Get from body
        'Health': health, // Get from manager
        'Age (s)': this.calculateAge(creationTime), // Get from manager
      },
      otherProperties: {
        // Add any additional enemy-specific properties here
        'Movement Pattern': config?.movementPattern || 'unknown',
        'Can Shoot': config?.canShoot || false,
        'Score Value': config?.scoreValue || 0,
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