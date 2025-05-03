import { EnemyManager } from '../../../../core/managers/EnemyManager';
import { EnemyEntity } from '../../../entities/EnemyEntity';
import { ActiveObjectData, DataCollector } from '../types/DebugPanelTypes';

/**
 * Extracts and formats enemy information for the debug panel
 */
export class EnemyDataCollector implements DataCollector<ActiveObjectData[]> {
  private enemyManager: EnemyManager;
  private enemySprites: Map<string, EnemyEntity>;

  constructor(enemyManager: EnemyManager, enemySprites: Map<string, EnemyEntity>) {
    this.enemyManager = enemyManager;
    this.enemySprites = enemySprites;
  }

  /**
   * Collects debug data for all active enemies
   * @param currentTime The current timestamp (potentially frozen during pause) to use for age calculation.
   * @returns Array of enemy debug data
   */
  public collectData(currentTime: number): ActiveObjectData[] {
    const enemyData: ActiveObjectData[] = [];
    // Use the provided currentTime for age calculation

    this.enemySprites.forEach((enemyEntity, id) => {
      if (enemyEntity.active) {
        const health = this.enemyManager.getEnemyHealth(enemyEntity.instanceId);
        const creationTime = this.enemyManager.getEnemyCreationTime(enemyEntity.instanceId) ?? currentTime;
        const age = Math.floor((currentTime - creationTime) / 1000);

        enemyData.push({
          ID: enemyEntity.instanceId,
          T: `En:${enemyEntity.configId}`,
          A: age,
          X: Math.round(enemyEntity.x),
          Y: Math.round(enemyEntity.y),
          H: health,
          Vx: parseFloat(enemyEntity.body?.velocity.x.toFixed(1) ?? '0'),
          Vy: parseFloat(enemyEntity.body?.velocity.y.toFixed(1) ?? '0'),
        });
      }
    });

    return enemyData;
  }

  /**
   * Gets the number of active enemies
   * @returns The number of active enemies
   */
  public getEnemyCount(): number {
    return this.enemySprites.size;
  }

  /**
   * Gets the current wave number
   * @returns The current wave number
   */
  public getCurrentWave(): number {
    return this.enemyManager.getCurrentWave();
  }
}