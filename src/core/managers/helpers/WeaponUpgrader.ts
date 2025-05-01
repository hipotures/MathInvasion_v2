import logger from '../../utils/Logger';
import { type WeaponConfig } from '../../config/schemas/weaponSchema';
import EconomyManager from '../EconomyManager';

export interface UpgradeResult {
  success: boolean;
  newLevel?: number;
  newCooldown?: number;
  newDamage?: number;
  newProjectileSpeed?: number;
  message?: string; // Optional message for logging or UI feedback
}

export class WeaponUpgrader {
  constructor(private economyManager: EconomyManager) {}

  /**
   * Attempts to upgrade a weapon based on its config and current level.
   * @param currentWeaponConfig The configuration of the weapon being upgraded.
   * @param currentLevel The current level of the weapon *before* the upgrade attempt.
   * @returns An UpgradeResult object indicating success or failure and the new stats.
   */
  public attemptUpgrade(currentWeaponConfig: WeaponConfig, currentLevel: number): UpgradeResult {
    if (!currentWeaponConfig.upgrade) {
      logger.warn(`Weapon ${currentWeaponConfig.id} has no upgrade configuration.`);
      return { success: false, message: 'No upgrade configuration.' };
    }

    const baseCost = currentWeaponConfig.baseCost;
    const costMultiplier = currentWeaponConfig.upgrade.costMultiplier;
    // Cost to upgrade *from* currentLevel *to* currentLevel + 1
    const upgradeCost = Math.round(baseCost * Math.pow(costMultiplier, currentLevel));

    const currentCurrency = this.economyManager.getCurrentCurrency();
    if (currentCurrency < upgradeCost) {
      const message = `Insufficient currency. Need: ${upgradeCost}, Have: ${currentCurrency}`;
      logger.log(message);
      return { success: false, message: message };
    }

    if (!this.economyManager.spendCurrency(upgradeCost)) {
      // Should not happen if getCurrentCurrency check passed, but log just in case
      const message = `Failed to spend currency ${upgradeCost} despite having ${currentCurrency}.`;
      logger.error(message);
      return { success: false, message: message };
    }

    const newLevel = currentLevel + 1;
    const upgradeConfig = currentWeaponConfig.upgrade;
    const levelFactor = newLevel - 1; // Apply multiplier starting from level 2

    let newCooldown: number | undefined;
    let newDamage: number | undefined;
    let newProjectileSpeed: number | undefined;

    if (upgradeConfig.cooldownMultiplier) {
      newCooldown = Math.round(
        currentWeaponConfig.baseCooldownMs * Math.pow(upgradeConfig.cooldownMultiplier, levelFactor)
      );
    }
    // Apply damage upgrade only if baseDamage exists and multiplier exists
    if (typeof currentWeaponConfig.baseDamage === 'number' && upgradeConfig.damageMultiplier) {
      newDamage = Math.round(
        currentWeaponConfig.baseDamage * Math.pow(upgradeConfig.damageMultiplier, levelFactor)
      );
    }
    // Apply speed upgrade only if multiplier exists
    if (upgradeConfig.projectileSpeedMultiplier) {
      // Use the base speed from the config, or the default if base speed wasn't defined
      const baseSpeed = currentWeaponConfig.projectileSpeed ?? 400;
      newProjectileSpeed = Math.round(
        baseSpeed * Math.pow(upgradeConfig.projectileSpeedMultiplier, levelFactor)
      );
    }

    logger.log(
      `Calculated upgrade for ${currentWeaponConfig.id} to Level ${newLevel}. Cost: ${upgradeCost}`
    );
    logger.debug(
      `New Stats - Cooldown: ${newCooldown}, Damage: ${newDamage}, Speed: ${newProjectileSpeed}`
    );

    return {
      success: true,
      newLevel: newLevel,
      newCooldown: newCooldown,
      newDamage: newDamage,
      newProjectileSpeed: newProjectileSpeed,
    };
  }
  
  /**
   * Calculates the cost to upgrade to the next level.
   * @param currentWeaponConfig The configuration of the weapon.
   * @param currentLevel The current level of the weapon.
   * @returns The cost for the next upgrade, or null if not upgradeable.
   */
  public calculateNextUpgradeCost(
    currentWeaponConfig: WeaponConfig,
    currentLevel: number
  ): number | null {
    if (
      !currentWeaponConfig.upgrade ||
      typeof currentWeaponConfig.baseCost !== 'number' ||
      currentWeaponConfig.baseCost < 0
    ) {
      return null; // No upgrades defined or invalid base cost
    }

    const baseCost = currentWeaponConfig.baseCost;
    const costMultiplier = currentWeaponConfig.upgrade.costMultiplier;
    // Cost to upgrade *from* currentLevel *to* currentLevel + 1
    const upgradeCost = Math.round(baseCost * Math.pow(costMultiplier, currentLevel));
    return upgradeCost;
  }
}
