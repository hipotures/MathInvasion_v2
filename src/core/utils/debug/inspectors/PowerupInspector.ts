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
  public getPowerupDetails(
    id: string, 
    powerupSprite: Phaser.Physics.Arcade.Sprite, 
    configId: string
  ): PowerupInspectionData | null {
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

    return {
      id: id, // Keep original string ID for consistency
      type: `Powerup (${config.id})`, // Use config from state
      configData: this.extractConfigData(config),
      standardProperties: {
        'Position X': powerupSprite.x?.toFixed(1), // Get from sprite
        'Position Y': powerupSprite.y?.toFixed(1), // Get from sprite
        'Age (s)': this.calculateAge(powerupState.creationTime), // Get from state
      },
      otherProperties: {
        'Effect Type': config.effect || 'unknown',
        'Duration (ms)': config.durationMs || 'N/A',
        'Multiplier': config.multiplier || 'N/A',
        'Drop Chance': config.dropChance || 'N/A',
        // Removed expiresAt property as it doesn't exist in the current implementation
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