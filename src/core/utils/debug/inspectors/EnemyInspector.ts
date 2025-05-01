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
  // Return a simple key-value object instead of the structured EnemyInspectionData
  public getEnemyDetails(id: string, enemyEntity: EnemyEntity): { [key: string]: any } | null {
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

    if (!config) {
      Logger.warn(`Could not find config for enemy ID: ${configId}`);
      // Return basic info even if config is missing
    }

    const details: { [key: string]: any } = {
      // --- Core Identification ---
      ID: id,
      Type: `Enemy (${configId})`,
      ConfigID: configId,

      // --- Entity/Sprite Properties ---
      X: enemyEntity.x?.toFixed(1),
      Y: enemyEntity.y?.toFixed(1),
      Angle: enemyEntity.angle?.toFixed(1),
      ScaleX: enemyEntity.scaleX?.toFixed(2),
      ScaleY: enemyEntity.scaleY?.toFixed(2),
      Depth: enemyEntity.depth,
      Visible: enemyEntity.visible,
      Active: enemyEntity.active,
      Texture: enemyEntity.texture?.key,

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
      Health: health,
      AgeSeconds: this.calculateAge(creationTime),

      // --- Enemy Specific ---
      IsPaused: EnemyEntity.isPaused, // Access static property

      // --- Config Properties (Prefixed) ---
    };

    // Add config properties with prefix if config exists
    if (config) {
      const configAny = config as any; // Cast to allow dynamic key access
      for (const key in configAny) {
          if (Object.prototype.hasOwnProperty.call(configAny, key)) {
              const value = configAny[key];
              if (typeof value !== 'object' || value === null) {
                  details[`config_${key}`] = value;
              } else if (Array.isArray(value)) {
                  details[`config_${key}`] = JSON.stringify(value);
              }
              // Skip nested objects
          }
      }
    } else {
        details['config_Error'] = 'Config not found';
    }

    return details;
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
}