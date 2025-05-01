import { PowerupManager } from '../../../managers/PowerupManager';
import { PowerupInspectionData } from '../types/InspectionTypes';
import Logger from '../../Logger';

/**
 * Specialized inspector for powerup entities
 * Extracts powerup-specific data for debugging
 */
export class PowerupInspector {
  constructor(private powerupManager: PowerupManager) {}

  /**
   * Gets detailed inspection data for a powerup
   * @param id The unique ID of the powerup instance
   * @param powerupSprite The powerup sprite to inspect
   * @param configId The config ID of the powerup
   * @returns Powerup inspection data or null if data cannot be retrieved
   */
  // Return a simple key-value object instead of the structured PowerupInspectionData
  public getPowerupDetails(
    id: string,
    powerupSprite: Phaser.Physics.Arcade.Sprite,
    configId: string // Config ID from sprite data
  ): { [key: string]: any } | null {
    const numericId = parseInt(id, 10); // ID is still numeric for the manager map
    if (isNaN(numericId)) {
      Logger.warn(`Invalid powerup ID for inspection: ${id}`);
      return null;
    }

    const powerupState = this.powerupManager.getPowerupState(numericId); // Get manager state
    const body = powerupSprite.body as Phaser.Physics.Arcade.Body | null;

    if (!powerupState || !body) {
      Logger.warn(`Could not get powerup state or body for inspection. ID: ${id}`);
      return null;
    }

    // Use config from manager state
    const config = powerupState.config;

    if (!config) {
        Logger.warn(`Could not find config in powerup state for ID: ${id}`);
        // Return basic info even if config is missing
    }

    const details: { [key: string]: any } = {
      // --- Core Identification ---
      ID: id, // Keep original string ID from sprite data
      Type: `Powerup (${configId || config?.id || 'unknown'})`,
      ConfigID: configId || config?.id || 'unknown',

      // --- Sprite Properties ---
      X: powerupSprite.x?.toFixed(1),
      Y: powerupSprite.y?.toFixed(1),
      Angle: powerupSprite.angle?.toFixed(1),
      ScaleX: powerupSprite.scaleX?.toFixed(2),
      ScaleY: powerupSprite.scaleY?.toFixed(2),
      Depth: powerupSprite.depth,
      Visible: powerupSprite.visible,
      Active: powerupSprite.active,
      Texture: powerupSprite.texture?.key,

      // --- Physics Body Properties (Powerups might not have velocity/accel, but include if present) ---
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
      AllowGravity: body.allowGravity,
      Immovable: body.immovable,

      // --- Manager State Properties ---
      AgeSeconds: this.calculateAge(powerupState.creationTime),

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
        details['config_Error'] = 'Config not found in state';
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