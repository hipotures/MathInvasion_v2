import { type WeaponConfig } from '../../config/schemas/weaponSchema';

// Represents the dynamic state of a single weapon instance
export interface WeaponRuntimeState {
  config: WeaponConfig; // Reference to base config
  level: number;
  // Calculated stats for current level
  costForNextLevel: number | null;
  currentCooldownMs: number; // Calculated cooldown for this level
  currentDamage: number;
  currentDamagePerSec: number;
  currentRange: number;
  currentProjectileSpeed?: number;
  currentSlowFactor?: number;
  currentDurationMs?: number;
  // Energy system stats
  isEnergyBased: boolean;
  currentEnergy: number; // Current energy level
  maxEnergy: number; // Max energy for this level
  energyDrainPerSec: number;
  energyRefillPerSec: number;
  // Timers
  cooldownTimer: number; // Remaining cooldown
}

// Payload for the updated WEAPON_STATE_UPDATED event
export interface AllWeaponStatesUpdateData {
  activeWeaponId: string;
  // Include progress for all weapons for UI bars
  progress: { [weaponId: string]: number }; // Key: weaponId, Value: progress (0-1)
  // Include costs for UI buttons
  nextUpgradeCosts: { [weaponId: string]: number | null };
  // Include levels for UI display
  levels: { [weaponId: string]: number };
}

// Payload for REQUEST_FIRE_WEAPON
export interface RequestFireWeaponData {
  weaponConfig: WeaponConfig;
  damage: number; // Use appropriate damage (per shot or per sec)
  projectileSpeed: number;
}