import { PowerupManager } from '../../../../core/managers/PowerupManager';
import { ActiveObjectData, DataCollector } from '../types/DebugPanelTypes';

/**
 * Extracts and formats powerup information for the debug panel
 */
export class PowerupDataCollector implements DataCollector<ActiveObjectData[]> {
  private powerupManager: PowerupManager;
  private powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>;

  constructor(
    powerupManager: PowerupManager,
    powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>
  ) {
    this.powerupManager = powerupManager;
    this.powerupSprites = powerupSprites;
  }

  /**
   * Collects debug data for all active powerups
   * @returns Array of powerup debug data
   */
  public collectData(): ActiveObjectData[] {
    const powerupData: ActiveObjectData[] = [];
    const now = Date.now();

    this.powerupSprites.forEach((powerupSprite, id) => {
      if (powerupSprite.active) {
        const creationTime = this.powerupManager.getPowerupCreationTime(id) ?? now;
        const age = Math.floor((now - creationTime) / 1000);

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