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
   * @param currentTime The current timestamp (potentially frozen during pause) to use for age calculation.
   * @returns Powerup inspection data or null if data cannot be retrieved
   */
  // Return a simple key-value object instead of the structured PowerupInspectionData
  public getPowerupDetails(
    id: string,
    powerupSprite: Phaser.Physics.Arcade.Sprite,
    configId: string, // Config ID from sprite data
    currentTime: number
  ): { [key: string]: any } | null {
    // No longer need to extract numeric part, PowerupManager now uses string ID 'powerup_X'
    // const numericPart = id.startsWith('powerup_') ? id.substring(8) : id;
    // const numericId = parseInt(numericPart, 10);
    // if (isNaN(numericId)) {
    //   Logger.warn(`Invalid powerup ID for inspection (could not parse number): ${id}`);
    //   return null;
    // }

    // Attempt to get state using the string ID 'powerup_X'
    const powerupState = this.powerupManager.getPowerupState(id); // Pass the string ID directly
    const body = powerupSprite.body as Phaser.Physics.Arcade.Body | null;

    // Use config from manager state if available, otherwise use configId passed from sprite data
    const config = powerupState?.config;
    const effectiveConfigId = configId || config?.id || 'unknown';

    // Log if state is missing, but continue
    if (!powerupState) {
      Logger.warn(`Powerup state not found in manager for ID: ${id} (likely collected). Returning sprite data only.`);
    }
    if (!body) {
        Logger.warn(`Powerup physics body not found for ID: ${id}.`);
        // Continue without body info
    }


    const details: { [key: string]: any } = {
      // --- Core Identification ---
      ID: id, // Keep original string ID from sprite data
      Type: `Powerup (${effectiveConfigId})`,
      ConfigID: effectiveConfigId,

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

      // --- Physics Body Properties (Only if body exists) ---
    };
    if (body) {
        details.Vx = body.velocity.x?.toFixed(1);
        details.Vy = body.velocity.y?.toFixed(1);
        details.Ax = body.acceleration.x?.toFixed(1);
        details.Ay = body.acceleration.y?.toFixed(1);
        details.BodyWidth = body.width?.toFixed(0);
        details.BodyHeight = body.height?.toFixed(0);
        details.BodyX = body.x?.toFixed(1);
        details.BodyY = body.y?.toFixed(1);
        details.Mass = body.mass?.toFixed(2);
        details.BounceX = body.bounce.x?.toFixed(2);
        details.BounceY = body.bounce.y?.toFixed(2);
        details.AllowGravity = body.allowGravity;
        details.Immovable = body.immovable;
    } else {
        details.PhysicsBody = 'Not Found';
    }


    // --- Manager State Properties (Only if state exists) ---
    if (powerupState) {
        details.AgeSeconds = this.calculateAge(powerupState.creationTime, currentTime); // Pass currentTime
    } else {
        details.ManagerState = 'Not Found (Collected?)';
    }

    // --- Config Properties (Prefixed, only if config exists) ---
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
    } else if (!configId) { // Only show error if configId wasn't passed either
        details['config_Error'] = 'Config not found';
    }

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