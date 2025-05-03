import logger from '../../utils/Logger';
import { type WeaponConfig, type WeaponsConfig } from '../../config/schemas/weaponSchema';
import { type WeaponRuntimeState } from '../types/WeaponManager.types';
import { WeaponUpgrader } from '../helpers/WeaponUpgrader'; // Needed for calculateNextUpgradeCost

/**
 * Calculates the complete runtime state for a given weapon config and level.
 */
export function calculateWeaponStateForLevel(
  config: WeaponConfig,
  level: number,
  weaponUpgrader: WeaponUpgrader // Pass WeaponUpgrader instance
): WeaponRuntimeState {
  // Start with base stats
  let costForNextLevel: number | null = config.baseCost; // Cost to reach level 2 initially
  let currentCooldownMs = config.baseCooldownMs;
  let currentDamage = config.baseDamage || 0;
  let currentDamagePerSec = config.baseDamagePerSec || 0;
  let currentRange = config.baseRange;
  let currentProjectileSpeed = config.projectileSpeed;
  let currentSlowFactor = config.baseSlowFactor;
  let currentDurationMs = config.baseDurationMs;
  let isEnergyBased = config.baseEnergyCapacity !== undefined && config.baseEnergyCapacity > 0;
  let maxEnergy = config.baseEnergyCapacity || 0;
  let energyDrainPerSec = config.baseEnergyDrainPerSec || 0;
  let energyRefillPerSec = config.baseEnergyRefillPerSec || 0;

  // Apply upgrades iteratively up to the target level (level 1 has no upgrades applied)
  let currentUpgradeCost = config.baseCost; // Cost to reach level 2
  for (let i = 1; i < level; i++) {
      // Apply upgrades for reaching level i+1
      currentCooldownMs = Math.floor(currentCooldownMs * (config.upgrade.cooldownMultiplier || 1));
      currentDamage = Math.floor(currentDamage * (config.upgrade.damageMultiplier || 1));
      currentDamagePerSec = Math.floor(currentDamagePerSec * (config.upgrade.damageMultiplier || 1));
      currentRange += config.upgrade.rangeAdd || 0;
      if (currentProjectileSpeed && config.upgrade.projectileSpeedMultiplier) {
          currentProjectileSpeed = Math.floor(currentProjectileSpeed * config.upgrade.projectileSpeedMultiplier);
      }
      if (currentSlowFactor && config.upgrade.slowFactorMultiplier) {
          currentSlowFactor *= config.upgrade.slowFactorMultiplier;
      }
      if (currentDurationMs && config.upgrade.durationAddMs) {
          currentDurationMs += config.upgrade.durationAddMs;
      }
      if (isEnergyBased) {
          maxEnergy = Math.floor(maxEnergy * (config.upgrade.energyCapacityMultiplier || 1));
          energyRefillPerSec = Math.floor(energyRefillPerSec * (config.upgrade.energyRefillMultiplier || 1));
      }
      // Calculate cost for the *next* level (i+2)
      currentUpgradeCost = Math.floor(currentUpgradeCost * (config.upgrade.costMultiplier || 1));
  }
  // Use calculateNextUpgradeCost to determine the cost for the next level (or null if maxed)
  costForNextLevel = weaponUpgrader.calculateNextUpgradeCost(config, level);


  return {
    config: config,
    level: level,
    costForNextLevel: costForNextLevel,
    currentCooldownMs: currentCooldownMs,
    currentDamage: currentDamage,
    currentDamagePerSec: currentDamagePerSec,
    currentRange: currentRange,
    currentProjectileSpeed: currentProjectileSpeed,
    currentSlowFactor: currentSlowFactor,
    currentDurationMs: currentDurationMs,
    isEnergyBased: isEnergyBased,
    currentEnergy: maxEnergy, // Start full
    maxEnergy: maxEnergy,
    energyDrainPerSec: energyDrainPerSec,
    energyRefillPerSec: energyRefillPerSec,
    cooldownTimer: 0, // Start ready
  };
}


/**
 * Initializes the runtime state for all weapons defined in the config.
 */
export function initializeAllWeaponStates(
    weaponsConfig: WeaponsConfig,
    weaponUpgrader: WeaponUpgrader // Pass WeaponUpgrader instance
): Map<string, WeaponRuntimeState> {
    const weaponRuntimeState: Map<string, WeaponRuntimeState> = new Map();
    weaponsConfig.forEach(config => {
        // Calculate initial stats for level 1
        const initialState = calculateWeaponStateForLevel(config, 1, weaponUpgrader);
        weaponRuntimeState.set(config.id, initialState);
    });
    logger.debug(`Initialized runtime state for ${weaponRuntimeState.size} weapons.`);
    return weaponRuntimeState;
}