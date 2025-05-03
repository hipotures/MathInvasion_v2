import logger from '../../utils/Logger';
import { EventBus as EventBusType } from '../../events/EventBus';
import * as Events from '../../constants/events';
import { type WeaponConfig } from '../../config/schemas/weaponSchema';
import EconomyManager from '../EconomyManager';
import { WeaponPowerupHandler } from '../helpers/WeaponPowerupHandler';
import {
    type WeaponRuntimeState,
    type RequestFireWeaponData,
} from '../types/WeaponManager.types';
import { calculateWeaponStateForLevel } from '../state/WeaponManager.state'; // Import state calculation function
import { WeaponUpgrader } from '../helpers/WeaponUpgrader';

// Each function is already exported individually with the export keyword

// --- Type Definitions for Function Arguments ---

interface FireStartArgs {
    isFiringRef: { value: boolean };
    currentWeaponId: string;
    attemptFireFn: (weaponId: string) => void;
}

interface FireEndArgs {
    isFiringRef: { value: boolean };
    weaponRuntimeState: Map<string, WeaponRuntimeState>;
    currentWeaponId: string;
    // eventBus: EventBusType; // Not strictly needed if just logging
}

interface WeaponSwitchArgs {
    currentWeaponIdRef: { value: string };
    isFiringRef: { value: boolean };
    weaponRuntimeState: Map<string, WeaponRuntimeState>;
    emitStateUpdateFn: () => void;
    newWeaponId: string;
}

interface WeaponUpgradeArgs {
    currentWeaponId: string;
    weaponRuntimeState: Map<string, WeaponRuntimeState>;
    economyManager: EconomyManager;
    weaponUpgrader: WeaponUpgrader; // Pass the upgrader instance
    emitStateUpdateFn: () => void;
}

interface AttemptFireArgs {
    weaponId: string;
    weaponRuntimeState: Map<string, WeaponRuntimeState>;
    weaponPowerupHandler: WeaponPowerupHandler;
    emitFireRequestFn: (weaponId: string) => void;
}

interface EmitFireRequestArgs {
    weaponId: string;
    weaponRuntimeState: Map<string, WeaponRuntimeState>;
    eventBus: EventBusType;
}


// --- Action Functions ---

export function handleFireStart({ isFiringRef, currentWeaponId, attemptFireFn }: FireStartArgs): void {
    logger.debug('Fire input received');
    isFiringRef.value = true;
    // Initial fire attempt for the *active* weapon
    attemptFireFn(currentWeaponId);
}

export function handleFireEnd({ isFiringRef, weaponRuntimeState, currentWeaponId }: FireEndArgs): void {
    logger.debug('Fire input ended');
    isFiringRef.value = false;
    // Optional: Emit STOP_FIRE_WEAPON if needed for active energy weapon
    const activeState = weaponRuntimeState.get(currentWeaponId);
    if (activeState?.isEnergyBased) {
        // eventBus.emit(Events.STOP_FIRE_WEAPON, { weaponId: currentWeaponId }); // Requires eventBus arg
        logger.debug('Stopped firing energy weapon.');
    }
}


export function handleWeaponSwitch({ currentWeaponIdRef, isFiringRef, weaponRuntimeState, emitStateUpdateFn, newWeaponId }: WeaponSwitchArgs): void {
    if (newWeaponId === currentWeaponIdRef.value) {
        logger.debug(`Weapon ${newWeaponId} is already selected.`);
        return;
    }
    if (weaponRuntimeState.has(newWeaponId)) {
        currentWeaponIdRef.value = newWeaponId;
        isFiringRef.value = false; // Stop firing on switch
        logger.log(`Switched weapon to ${currentWeaponIdRef.value}`);
        emitStateUpdateFn(); // Emit new state after switch
    } else {
        logger.warn(`Attempted to switch to unknown weapon ID: ${newWeaponId}`);
    }
}

/**
 * Handles the weapon upgrade request. Attempts to spend currency and logs the result.
 * Emits state update on success.
 * @returns {boolean} True if the upgrade was successful (currency spent), false otherwise.
 */
export function handleWeaponUpgradeRequest({ currentWeaponId, weaponRuntimeState, economyManager, weaponUpgrader, emitStateUpdateFn }: WeaponUpgradeArgs): boolean {
    const weaponIdToUpgrade = currentWeaponId; // Always upgrade the active weapon
    logger.debug(`Received REQUEST_WEAPON_UPGRADE for ${weaponIdToUpgrade}`);

    const currentState = weaponRuntimeState.get(weaponIdToUpgrade);
    if (!currentState) {
        logger.error(`Cannot upgrade, state not found for ID: ${weaponIdToUpgrade}`);
        return false; // Indicate failure
    }

    const upgradeCost = currentState.costForNextLevel;

    if (upgradeCost === null) {
        logger.log(`Weapon ${weaponIdToUpgrade} is already at max level.`);
        return false; // Indicate failure (already maxed)
    }

    const currentCurrency = economyManager.getCurrentCurrency(); // Get currency before spending
    if (economyManager.spendCurrency(upgradeCost)) {
        // --- Upgrade Successful ---
        const nextLevel = currentState.level + 1;
        logger.log(`Successfully upgraded ${weaponIdToUpgrade} to Level ${nextLevel}. Spent ${upgradeCost}, remaining: ${economyManager.getCurrentCurrency()}`);

        // Emit state update
        emitStateUpdateFn();

        // Return true to signal success to the caller
        return true;

        /*
        // State calculation and map update are now handled by the caller (WeaponManager)
        // based on the boolean return value of this function.

        // Calculate new state for the next level (moved to caller)
        // const newState = calculateWeaponStateForLevel(currentState.config, nextLevel, weaponUpgrader);
        // Preserve current energy/cooldown timer if needed, or reset them? Resetting is simpler.
        // newState.currentEnergy = newState.maxEnergy; // Refill energy on upgrade
        // newState.cooldownTimer = 0; // Reset cooldown on upgrade

        // Update the state map (moved to caller)
        // weaponRuntimeState.set(weaponIdToUpgrade, newState);
        */

    } else {
        // --- Upgrade Failed ---
        logger.log(`Upgrade failed for ${weaponIdToUpgrade}: Insufficient currency. Need ${upgradeCost}, have ${currentCurrency}.`);
        return false; // Indicate failure
    }
}

/**
 * Handles the initial fire attempt, checking energy/cooldown.
        const newState = calculateWeaponStateForLevel(currentState.config, nextLevel, weaponUpgrader);
        // Preserve current energy/cooldown timer if needed, or reset them? Resetting is simpler.
        newState.currentEnergy = newState.maxEnergy; // Refill energy on upgrade
        newState.cooldownTimer = 0; // Reset cooldown on upgrade

        // Update the state map (This needs to happen in the main class)
        // weaponRuntimeState.set(weaponIdToUpgrade, newState); // Cannot modify map directly here

        // Instead, we might return the newState or rely on the main class to update
        // For now, let's assume the main class handles the map update after this function succeeds
        logger.log(`Successfully upgraded ${weaponIdToUpgrade} to Level ${nextLevel}.`);

        // We need a way to signal the main class to update the map
        // Option 1: Return the newState
        // Option 2: Pass a setter function: updateStateFn(weaponId, newState)
        // Let's modify the main class to handle the update based on success.

        emitStateUpdateFn(); // Emit new state after upgrade
    } else {
        logger.log(`Upgrade failed for ${weaponIdToUpgrade}: Insufficient currency. Need ${upgradeCost}, have ${economyManager.getCurrentCurrency()}.`);
    }
}

/**
 * Handles the initial fire attempt, checking energy/cooldown.
 * For cooldown weapons, also resets the timer.
 * Continuous firing for energy weapons is handled in update().
 * Returns true if cooldown was reset (for cooldown weapons), false otherwise.
 */
export function attemptFire({ weaponId, weaponRuntimeState, weaponPowerupHandler, emitFireRequestFn }: AttemptFireArgs): boolean {
    logger.debug(`WeaponManager.actions: attemptFire called for weapon ${weaponId}`);
    
    const state = weaponRuntimeState.get(weaponId);
    if (!state) {
        logger.error(`WeaponManager.actions: AttemptFire - State not found for ${weaponId}`);
        return false;
    }

    logger.debug(`WeaponManager.actions: AttemptFire - Weapon ${weaponId} details: isEnergyBased: ${state.isEnergyBased}, level: ${state.level}`);
    logger.debug(`WeaponManager.actions: AttemptFire - Weapon config: ${state.config.id}, projectileType: ${state.config.projectileType}`);

    if (state.isEnergyBased) {
        if (state.currentEnergy <= 0) {
            logger.debug(`WeaponManager.actions: Weapon ${weaponId} has no energy to initiate fire.`);
            return false;
        }
        // Don't emit fire request here, update() handles it
        logger.debug(`WeaponManager.actions: Initiating energy weapon fire: ${weaponId}`);
        return false; // Cooldown not reset for energy weapons here

    } else {
        // Standard cooldown check
        if (state.cooldownTimer > 0) {
            logger.debug(`WeaponManager.actions: Weapon ${weaponId} on cooldown (${state.cooldownTimer.toFixed(0)}ms left)`);
            return false; // Still on cooldown
        }

        // --- Fire Cooldown Weapon ---
        logger.debug(`WeaponManager.actions: About to emit fire request for weapon ${weaponId}`);
        emitFireRequestFn(weaponId); // Emit the actual fire request
        logger.debug(`WeaponManager.actions: Fire request emitted for weapon ${weaponId}`);

        // Set cooldown
        const cooldownMultiplier = weaponPowerupHandler.getCurrentCooldownMultiplier();
        state.cooldownTimer = state.currentCooldownMs * cooldownMultiplier; // Use calculated cooldown
        logger.debug(
            `WeaponManager.actions: Cooldown started for ${weaponId}: ${state.cooldownTimer}ms (Base: ${state.config.baseCooldownMs}, LvlAdjusted: ${state.currentCooldownMs}, Multiplier: ${cooldownMultiplier})`
        );
        return true; // Cooldown was reset
    }
}

/** Helper method to create and emit the fire request for a specific weapon */
export function emitFireRequest({ weaponId, weaponRuntimeState, eventBus }: EmitFireRequestArgs): void {
    logger.debug(`WeaponManager.actions: emitFireRequest called for weapon ${weaponId}`);
    
    const state = weaponRuntimeState.get(weaponId);
    if (!state) {
        logger.error(`WeaponManager.actions: Cannot fire, state not found for ID: ${weaponId}`);
        return;
    }
    
    logger.debug(`WeaponManager.actions: Preparing REQUEST_FIRE_WEAPON event for: ${weaponId}`);
    logger.debug(`WeaponManager.actions: Weapon config: ${state.config.id}, projectileType: ${state.config.projectileType}`);
    
    const fireData: RequestFireWeaponData = {
        weaponConfig: state.config,
        damage: state.isEnergyBased ? state.currentDamagePerSec : state.currentDamage,
        // TEMPORARY WORKAROUND: Use a default speed if undefined.
        projectileSpeed: state.currentProjectileSpeed ?? (state.isEnergyBased ? 400 : 0),
    };
    
    logger.debug(`WeaponManager.actions: Emitting REQUEST_FIRE_WEAPON event with damage: ${fireData.damage}, speed: ${fireData.projectileSpeed}`);
    
    try {
        eventBus.emit(Events.REQUEST_FIRE_WEAPON, fireData);
        logger.debug(`WeaponManager.actions: REQUEST_FIRE_WEAPON event emitted successfully for weapon ${weaponId}`);
    } catch (error) {
        logger.error(`WeaponManager.actions: Error emitting REQUEST_FIRE_WEAPON event: ${error}`);
    }
}