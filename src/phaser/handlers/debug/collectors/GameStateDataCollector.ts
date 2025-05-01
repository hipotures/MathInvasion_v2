import WeaponManager from '../../../../core/managers/WeaponManager';
import EconomyManager from '../../../../core/managers/EconomyManager';
import { GameData, WeaponData, DataCollector } from '../types/DebugPanelTypes';

/**
 * Extracts and formats general game state information for the debug panel
 * Includes entity counts, score, currency, and weapon status
 */
export class GameStateDataCollector implements DataCollector<GameData> {
  private weaponManager: WeaponManager;
  private economyManager: EconomyManager;
  private enemyCount: number;
  private projectileCount: number;
  private powerupCount: number;
  private currentWave: number;

  constructor(
    weaponManager: WeaponManager,
    economyManager: EconomyManager,
    enemyCount: number,
    projectileCount: number,
    powerupCount: number,
    currentWave: number
  ) {
    this.weaponManager = weaponManager;
    this.economyManager = economyManager;
    this.enemyCount = enemyCount;
    this.projectileCount = projectileCount;
    this.powerupCount = powerupCount;
    this.currentWave = currentWave;
  }

  /**
   * Collects debug data for the game state
   * @returns The game state debug data
   */
  public collectData(): GameData {
    return {
      enemyCount: this.enemyCount,
      projectileCount: this.projectileCount,
      powerupCount: this.powerupCount,
      currentWave: this.currentWave,
      score: this.economyManager.getCurrentScore(),
      currency: this.economyManager.getCurrentCurrency(),
    };
  }

  /**
   * Updates the entity counts
   * @param enemyCount The number of active enemies
   * @param projectileCount The number of active projectiles
   * @param powerupCount The number of active powerups
   * @param currentWave The current wave number
   */
  public updateCounts(
    enemyCount: number,
    projectileCount: number,
    powerupCount: number,
    currentWave: number
  ): void {
    this.enemyCount = enemyCount;
    this.projectileCount = projectileCount;
    this.powerupCount = powerupCount;
    this.currentWave = currentWave;
  }

  /**
   * Collects weapon data
   * @returns The weapon debug data
   */
  public collectWeaponData(): WeaponData {
    return {
      currentWeapon: this.getCurrentWeaponId(),
      level: this.getCurrentWeaponLevel(),
      cooldown: this.getCurrentCooldown().toFixed(0),
    };
  }

  /**
   * Gets the current weapon ID
   * @returns The current weapon ID
   */
  private getCurrentWeaponId(): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.weaponManager as any).currentWeaponId ?? 'unknown';
  }

  /**
   * Gets the current weapon level
   * @returns The current weapon level
   */
  private getCurrentWeaponLevel(): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.weaponManager as any).currentWeaponLevel ?? 1;
  }

  /**
   * Gets the current cooldown
   * @returns The current cooldown
   */
  private getCurrentCooldown(): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.weaponManager as any).cooldownTimer ?? 0;
  }
}