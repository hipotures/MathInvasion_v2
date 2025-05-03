import { PowerupManager } from '../../../../core/managers/PowerupManager';
import { ActiveObjectData, DataCollector } from '../types/DebugPanelTypes';

/**
 * Extracts and formats powerup information for the debug panel
 */
export class PowerupDataCollector implements DataCollector<ActiveObjectData[]> {
  private powerupManager: PowerupManager;
  private powerupSprites: Map<string, Phaser.Physics.Arcade.Sprite>; // Changed key type to string

  constructor(
    powerupManager: PowerupManager,
    powerupSprites: Map<string, Phaser.Physics.Arcade.Sprite> // Changed key type to string
  ) {
    this.powerupManager = powerupManager;
    this.powerupSprites = powerupSprites;
  }

  /**
   * Collects debug data for all active powerups
   * @param currentTime The current timestamp (potentially frozen during pause) to use for age calculation.
   * @returns Array of powerup debug data
   */
  public collectData(currentTime: number): ActiveObjectData[] {
    const powerupData: ActiveObjectData[] = [];
    // Use the provided currentTime for age calculation

    this.powerupSprites.forEach((powerupSprite, id) => {
      if (powerupSprite.active) {
        // Ensure 'id' is treated as string when calling the manager
        const creationTime = this.powerupManager.getPowerupCreationTime(id as string) ?? currentTime;
        const age = Math.floor((currentTime - creationTime) / 1000);

        powerupData.push({
          ID: id,
          T: `Pu:${powerupSprite.texture.key}`,
          A: age,
          X: Math.round(powerupSprite.x),
          Y: Math.round(powerupSprite.y),
          Vx: parseFloat(powerupSprite.body?.velocity.x.toFixed(1) ?? '0'),
          Vy: parseFloat(powerupSprite.body?.velocity.y.toFixed(1) ?? '0'),
        });
      }
    });

    return powerupData;
  }

  /**
   * Gets the number of active powerups
   * @returns The number of active powerups
   */
  public getPowerupCount(): number {
    return this.powerupSprites.size;
  }
}