import logger from '../utils/Logger';
import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events';
import configLoader from '../config/ConfigLoader';
import { type WeaponsConfig, type WeaponConfig } from '../config/schemas/weaponSchema';
import EconomyManager from './EconomyManager';
import { WeaponUpgrader } from './helpers/WeaponUpgrader';
import { WeaponPowerupHandler } from './helpers/WeaponPowerupHandler';

// --- Interfaces ---

// Represents the dynamic state of a single weapon instance
interface WeaponRuntimeState {
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
interface AllWeaponStatesUpdateData {
  activeWeaponId: string;
  // Include progress for all weapons for UI bars
  progress: { [weaponId: string]: number }; // Key: weaponId, Value: progress (0-1)
  // Include costs for UI buttons
  nextUpgradeCosts: { [weaponId: string]: number | null };
  // Include levels for UI display
  levels: { [weaponId: string]: number };
}

// Payload for REQUEST_FIRE_WEAPON (remains mostly the same)
interface RequestFireWeaponData {
  weaponConfig: WeaponConfig;
  damage: number; // Use appropriate damage (per shot or per sec)
  projectileSpeed: number;
}

// --- WeaponManager Class ---

export default class WeaponManager {
  private eventBus: EventBusType;
  private economyManager: EconomyManager;
  private weaponUpgrader: WeaponUpgrader;
  private weaponPowerupHandler: WeaponPowerupHandler;
  private weaponsConfig: WeaponsConfig;

  // New state: Map storing runtime state for all weapons
  private weaponRuntimeState: Map<string, WeaponRuntimeState> = new Map();
  private currentWeaponId: string = 'bullet'; // ID of the currently selected weapon

  // Firing State (applies only to the active weapon)
  private isFiring = false; // Is the fire button currently held?

  constructor(
    eventBusInstance: EventBusType,
    economyManagerInstance: EconomyManager,
    weaponUpgraderInstance: WeaponUpgrader,
    weaponPowerupHandlerInstance: WeaponPowerupHandler
  ) {
    this.eventBus = eventBusInstance;
    this.economyManager = economyManagerInstance;
    this.weaponUpgrader = weaponUpgraderInstance;
    this.weaponPowerupHandler = weaponPowerupHandlerInstance;
    this.weaponsConfig = configLoader.getWeaponsConfig();
    logger.log('WeaponManager initialized');

    // Initialize state for all weapons based on config
    this.initializeAllWeaponStates();

    // Ensure the initial weapon exists
    if (!this.weaponRuntimeState.has(this.currentWeaponId)) {
        logger.error(`Initial weapon ID "${this.currentWeaponId}" not found in config! Defaulting...`);
        // Fallback logic if needed, e.g., use the first weapon found
        this.currentWeaponId = this.weaponRuntimeState.keys().next().value || 'error_no_weapons';
    }

    // Bind methods
    this.handleFireStart = this.handleFireStart.bind(this);
    this.handleFireEnd = this.handleFireEnd.bind(this);
    this.handleWeaponSwitch = this.handleWeaponSwitch.bind(this);
    this.handleWeaponUpgradeRequest = this.handleWeaponUpgradeRequest.bind(this);
    this.emitStateUpdate = this.emitStateUpdate.bind(this);

    // Register event listeners
    this.eventBus.on(Events.FIRE_START, this.handleFireStart);
    this.eventBus.on(Events.FIRE_STOP, this.handleFireEnd);
    this.eventBus.on(Events.WEAPON_SWITCH, this.handleWeaponSwitch);
    this.eventBus.on(Events.REQUEST_WEAPON_UPGRADE, this.handleWeaponUpgradeRequest);

    // Emit initial state for all weapons
    this.emitStateUpdate();
  }

  /**
   * Initializes the runtime state for all weapons defined in the config.
   */
  private initializeAllWeaponStates(): void {
    this.weaponsConfig.forEach(config => {
      // Calculate initial stats for level 1
      const initialState = this.calculateWeaponStateForLevel(config, 1);
      this.weaponRuntimeState.set(config.id, initialState);
    });
    logger.debug(`Initialized runtime state for ${this.weaponRuntimeState.size} weapons.`);
  }

  /**
   * Calculates the complete runtime state for a given weapon config and level.
   */
  private calculateWeaponStateForLevel(config: WeaponConfig, level: number): WeaponRuntimeState {
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
    costForNextLevel = this.weaponUpgrader.calculateNextUpgradeCost(config, level);


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


  private handleFireStart(): void {
    logger.debug('Fire input received');
    this.isFiring = true;
    // Initial fire attempt for the *active* weapon
    this.attemptFire(this.currentWeaponId);
  }

  private handleFireEnd(): void {
      logger.debug('Fire input ended');
      this.isFiring = false;
      // Optional: Emit STOP_FIRE_WEAPON if needed for active energy weapon
      const activeState = this.weaponRuntimeState.get(this.currentWeaponId);
      if (activeState?.isEnergyBased) {
          // this.eventBus.emit(Events.STOP_FIRE_WEAPON, { weaponId: this.currentWeaponId });
          logger.debug('Stopped firing energy weapon.');
      }
  }


  private handleWeaponSwitch(newWeaponId: string): void {
    if (newWeaponId === this.currentWeaponId) {
      logger.debug(`Weapon ${newWeaponId} is already selected.`);
      return;
    }
    if (this.weaponRuntimeState.has(newWeaponId)) {
        this.currentWeaponId = newWeaponId;
        this.isFiring = false; // Stop firing on switch
        logger.log(`Switched weapon to ${this.currentWeaponId}`);
        this.emitStateUpdate(); // Emit new state after switch
    } else {
        logger.warn(`Attempted to switch to unknown weapon ID: ${newWeaponId}`);
    }
  }

  private handleWeaponUpgradeRequest(): void {
    const weaponIdToUpgrade = this.currentWeaponId; // Always upgrade the active weapon
    logger.debug(`Received REQUEST_WEAPON_UPGRADE for ${weaponIdToUpgrade}`);

    const currentState = this.weaponRuntimeState.get(weaponIdToUpgrade);
    if (!currentState) {
      logger.error(`Cannot upgrade, state not found for ID: ${weaponIdToUpgrade}`);
      return;
    }

     const upgradeCost = currentState.costForNextLevel;

     if (upgradeCost === null) {
         logger.log(`Weapon ${weaponIdToUpgrade} is already at max level.`);
         return; // Already max level
     }

     if (this.economyManager.spendCurrency(upgradeCost)) {
         // Calculate new state for the next level
         const nextLevel = currentState.level + 1;
         const newState = this.calculateWeaponStateForLevel(currentState.config, nextLevel);
         // Preserve current energy/cooldown timer if needed, or reset them? Resetting is simpler.
         newState.currentEnergy = newState.maxEnergy; // Refill energy on upgrade
         newState.cooldownTimer = 0; // Reset cooldown on upgrade

         // Update the state map
         this.weaponRuntimeState.set(weaponIdToUpgrade, newState);

         logger.log(`Successfully upgraded ${weaponIdToUpgrade} to Level ${nextLevel}.`);
         this.emitStateUpdate(); // Emit new state after upgrade
     } else {
         logger.log(`Upgrade failed for ${weaponIdToUpgrade}: Insufficient currency. Need ${upgradeCost}, have ${this.economyManager.getCurrentCurrency()}.`);
     }
  }

  public update(deltaMs: number): void {
    const deltaSec = deltaMs / 1000;
    let activeWeaponFiredThisFrame = false;

    // Iterate through all weapon states
    this.weaponRuntimeState.forEach((state, id) => {
      const isActive = (id === this.currentWeaponId);

      if (state.isEnergyBased) {
        // --- Energy Weapon Logic ---
        if (isActive && this.isFiring) {
          if (state.currentEnergy > 0) {
            // Drain energy FIRST
            state.currentEnergy = Math.max(0, state.currentEnergy - state.energyDrainPerSec * deltaSec);
            // If still has energy after draining (or had energy before draining this frame), allow firing
            this.emitFireRequest(id); // Fire the active weapon
            activeWeaponFiredThisFrame = true;
            if (state.currentEnergy === 0) {
              logger.debug(`Laser energy depleted this frame for ${id}.`);
              // Optional: Emit STOP_FIRE_WEAPON
            }
          } else {
             // Was already out of energy
             // Optional: Ensure STOP_FIRE_WEAPON was emitted if needed
          }
        } else if (!isActive || !this.isFiring) { // Refill if inactive OR if active but not firing
          // Refill energy
          state.currentEnergy = Math.min(state.maxEnergy, state.currentEnergy + state.energyRefillPerSec * deltaSec);
        }
      } else {
        // --- Standard Cooldown Weapon Logic ---
        if (state.cooldownTimer > 0) {
          state.cooldownTimer = Math.max(0, state.cooldownTimer - deltaMs);
        }

        // Auto-fire for active cooldown weapon
        if (isActive && this.isFiring && state.cooldownTimer === 0) {
           this.attemptFire(id); // Attempt fire handles cooldown reset
           activeWeaponFiredThisFrame = true;
        }
      }
    });

    // Emit state update after processing all weapons
    this.emitStateUpdate();
  }

  /** Emits the global state update for all weapons */
  private emitStateUpdate(): void {
    const progressPayload: { [weaponId: string]: number } = {};
    const costsPayload: { [weaponId: string]: number | null } = {};
    const levelsPayload: { [weaponId: string]: number } = {};

    this.weaponRuntimeState.forEach((state, id) => {
      let progress = 0;
      if (state.isEnergyBased) {
        progress = state.maxEnergy > 0 ? state.currentEnergy / state.maxEnergy : 0;
      } else {
        progress = state.currentCooldownMs > 0 ? state.cooldownTimer / state.currentCooldownMs : 0;
        // Invert cooldown progress for UI (0 = ready, 1 = full cooldown) -> NO, UI expects 0=empty, 1=full
        // progress = 1 - progress;
      }
      progressPayload[id] = Math.max(0, Math.min(1, progress));
      costsPayload[id] = state.costForNextLevel;
      levelsPayload[id] = state.level;
    });

    const stateData: AllWeaponStatesUpdateData = {
      activeWeaponId: this.currentWeaponId,
      progress: progressPayload,
      nextUpgradeCosts: costsPayload,
      levels: levelsPayload,
    };
    this.eventBus.emit(Events.WEAPON_STATE_UPDATED, stateData);
    // logger.debug(`Emitted WEAPON_STATE_UPDATED: ${JSON.stringify(stateData)}`); // Can be very noisy
  }

  /**
   * Handles the initial fire attempt, checking energy/cooldown.
   * For cooldown weapons, also resets the timer.
   * Continuous firing for energy weapons is handled in update().
   */
  private attemptFire(weaponId: string): void {
    const state = this.weaponRuntimeState.get(weaponId);
    if (!state) {
        logger.error(`AttemptFire: State not found for ${weaponId}`);
        return;
    }

    // --- Add Logging ---
    logger.debug(`AttemptFire called for ${weaponId}. isEnergyBased: ${state.isEnergyBased}`);
    // --- End Logging ---

    if (state.isEnergyBased) {
        if (state.currentEnergy <= 0) {
            logger.debug(`Weapon ${weaponId} has no energy to initiate fire.`);
            // Don't force isFiring = false here, update loop handles it
            return;
        }
        // Don't emit fire request here, update() handles it
        logger.debug(`Initiating energy weapon fire: ${weaponId}`);

    } else {
        // Standard cooldown check
        if (state.cooldownTimer > 0) {
          // logger.debug(`Weapon ${weaponId} on cooldown (${state.cooldownTimer.toFixed(0)}ms left)`); // Can be noisy
          return; // Still on cooldown
        }

        // --- Fire Cooldown Weapon ---
        this.emitFireRequest(weaponId); // Emit the actual fire request

        // Set cooldown
        const cooldownMultiplier = this.weaponPowerupHandler.getCurrentCooldownMultiplier();
        state.cooldownTimer = state.currentCooldownMs * cooldownMultiplier; // Use calculated cooldown
         logger.debug(
           `Cooldown started for ${weaponId}: ${state.cooldownTimer}ms (Base: ${state.config.baseCooldownMs}, LvlAdjusted: ${state.currentCooldownMs}, Multiplier: ${cooldownMultiplier})`
         );
    }
  }

  /** Helper method to create and emit the fire request for a specific weapon */
  private emitFireRequest(weaponId: string): void {
      const state = this.weaponRuntimeState.get(weaponId);
      if (!state) {
        logger.error(`Cannot fire, state not found for ID: ${weaponId}`);
        return;
      }
      // logger.debug(`Emitting REQUEST_FIRE_WEAPON for: ${weaponId}`); // Can be noisy
      const fireData: RequestFireWeaponData = {
          weaponConfig: state.config,
          damage: state.isEnergyBased ? state.currentDamagePerSec : state.currentDamage,
          // TEMPORARY WORKAROUND: Use a default speed if undefined.
          projectileSpeed: state.currentProjectileSpeed ?? (state.isEnergyBased ? 400 : 0),
      };
      this.eventBus.emit(Events.REQUEST_FIRE_WEAPON, fireData);
  }

  public destroy(): void {
    this.eventBus.off(Events.FIRE_START, this.handleFireStart);
    this.eventBus.off(Events.FIRE_STOP, this.handleFireEnd);
    this.eventBus.off(Events.WEAPON_SWITCH, this.handleWeaponSwitch);
    this.eventBus.off(Events.REQUEST_WEAPON_UPGRADE, this.handleWeaponUpgradeRequest);
    this.weaponPowerupHandler.destroy();
    logger.log('WeaponManager destroyed and listeners removed');
  }
}
