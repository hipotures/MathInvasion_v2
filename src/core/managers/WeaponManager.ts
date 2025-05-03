import logger from '../utils/Logger';
import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events';
import configLoader from '../config/ConfigLoader';
import { type WeaponsConfig } from '../config/schemas/weaponSchema';
import EconomyManager from './EconomyManager';
import { WeaponUpgrader } from './helpers/WeaponUpgrader';
import { WeaponPowerupHandler } from './helpers/WeaponPowerupHandler';

// Import types and functions from separated files
import {
    type WeaponRuntimeState,
    type AllWeaponStatesUpdateData,
    type RequestFireWeaponData,
} from './types/WeaponManager.types';
import {
    calculateWeaponStateForLevel,
    initializeAllWeaponStates,
} from './state/WeaponManager.state';
import {
    handleFireStart as handleFireStartAction,
    handleFireEnd as handleFireEndAction,
    handleWeaponSwitch as handleWeaponSwitchAction,
    handleWeaponUpgradeRequest as handleWeaponUpgradeAction,
    attemptFire as attemptFireAction,
    emitFireRequest as emitFireRequestAction,
} from './actions/WeaponManager.actions';

// --- WeaponManager Class ---

export default class WeaponManager {
    private eventBus: EventBusType;
    private economyManager: EconomyManager;
    private weaponUpgrader: WeaponUpgrader;
    private weaponPowerupHandler: WeaponPowerupHandler;
    private weaponsConfig: WeaponsConfig;

    // State: Map storing runtime state for all weapons
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

        // Initialize state for all weapons using the imported function
        this.weaponRuntimeState = initializeAllWeaponStates(this.weaponsConfig, this.weaponUpgrader);

        // Ensure the initial weapon exists
        if (!this.weaponRuntimeState.has(this.currentWeaponId)) {
            logger.error(`Initial weapon ID "${this.currentWeaponId}" not found in config! Defaulting...`);
            // Fallback logic if needed, e.g., use the first weapon found
            this.currentWeaponId = this.weaponRuntimeState.keys().next().value || 'error_no_weapons';
        }
        
        // Add logging to show the initial weapon
        logger.debug(`WeaponManager initialized with default weapon: "${this.currentWeaponId}"`);

        // Bind methods that are still class methods (like update, emitStateUpdate, destroy)
        // Event handlers will now call the imported action functions
        this.emitStateUpdate = this.emitStateUpdate.bind(this);
        this.update = this.update.bind(this);
        this.destroy = this.destroy.bind(this);

        // Register event listeners - they now call the action functions
        this.eventBus.on(Events.FIRE_START, this.onFireStart.bind(this));
        this.eventBus.on(Events.FIRE_STOP, this.onFireEnd.bind(this));
        this.eventBus.on(Events.WEAPON_SWITCH, this.onWeaponSwitch.bind(this));
        this.eventBus.on(Events.REQUEST_WEAPON_UPGRADE, this.onWeaponUpgradeRequest.bind(this));

        // Emit initial state for all weapons
        this.emitStateUpdate();
        
        // Double check that a weapon state update is emitted with a small delay
        // This ensures the UI has time to initialize before receiving the state
        setTimeout(() => {
            logger.debug('Sending delayed initial weapon state update');
            this.emitStateUpdate();
        }, 100);
    }

    // --- Event Handlers (calling action functions) ---

    private onFireStart(): void {
        handleFireStartAction({
            isFiringRef: { value: this.isFiring }, // Pass by reference wrapper
            currentWeaponId: this.currentWeaponId,
            attemptFireFn: (weaponId) => this.attemptFire(weaponId), // Pass bound attemptFire
        });
        // Update local state based on reference change
        this.isFiring = true; // Action function sets the ref.value, update local state
    }

    private onFireEnd(): void {
        handleFireEndAction({
            isFiringRef: { value: this.isFiring }, // Pass by reference wrapper
            weaponRuntimeState: this.weaponRuntimeState,
            currentWeaponId: this.currentWeaponId,
        });
        // Update local state based on reference change
        this.isFiring = false; // Action function sets the ref.value, update local state
    }

    private onWeaponSwitch(newWeaponId: string): void {
        // Add detailed logging
        logger.debug(`WeaponManager: Switching weapon from "${this.currentWeaponId}" to "${newWeaponId}"`);
        logger.debug(`WeaponManager: Available weapons: ${Array.from(this.weaponRuntimeState.keys()).join(', ')}`);
        
        const currentWeaponIdRef = { value: this.currentWeaponId };
        const isFiringRef = { value: this.isFiring };
        handleWeaponSwitchAction({
            currentWeaponIdRef: currentWeaponIdRef,
            isFiringRef: isFiringRef,
            weaponRuntimeState: this.weaponRuntimeState,
            emitStateUpdateFn: this.emitStateUpdate,
            newWeaponId: newWeaponId,
        });
        
        // Update local state based on reference changes
        this.currentWeaponId = currentWeaponIdRef.value;
        this.isFiring = isFiringRef.value;
        
        // Log the result
        logger.debug(`WeaponManager: Weapon switched to "${this.currentWeaponId}"`);
        
        // Force an immediate state update to ensure UI is updated
        this.emitStateUpdate();
    }

    private onWeaponUpgradeRequest(): void {
        // Store current state before calling action
        const weaponIdToUpgrade = this.currentWeaponId;
        const currentState = this.weaponRuntimeState.get(weaponIdToUpgrade);
        const currentLevel = currentState?.level; // Get level before calling action

        // Call the action function, which attempts the upgrade and returns success/failure
        const upgradeSucceeded = handleWeaponUpgradeAction({
            currentWeaponId: this.currentWeaponId,
            weaponRuntimeState: this.weaponRuntimeState, // Action reads from this
            economyManager: this.economyManager, // Action spends currency
            weaponUpgrader: this.weaponUpgrader,
            emitStateUpdateFn: this.emitStateUpdate, // Action emits update on success
        });

        // If the upgrade was successful, calculate the new state and update the map
        if (upgradeSucceeded && currentState && currentLevel !== undefined) {
            const nextLevel = currentLevel + 1;
            const newState = calculateWeaponStateForLevel(currentState.config, nextLevel, this.weaponUpgrader);
            // Apply post-upgrade state resets
            newState.currentEnergy = newState.maxEnergy; // Refill energy
            newState.cooldownTimer = 0; // Reset cooldown
            this.weaponRuntimeState.set(weaponIdToUpgrade, newState); // Update the map

            // Note: emitStateUpdate is already called within handleWeaponUpgradeAction on success
        }
        // If upgradeSucceeded is false, the action function already logged the reason.
    }

    // --- Core Update Logic ---

    public update(deltaMs: number): void {
        const deltaSec = deltaMs / 1000;
        let stateChanged = false; // Track if any state change occurred

        // Iterate through all weapon states
        this.weaponRuntimeState.forEach((state, id) => {
            const isActive = (id === this.currentWeaponId);
            const previousCooldown = state.cooldownTimer;
            const previousEnergy = state.currentEnergy;

            if (state.isEnergyBased) {
                // --- Energy Weapon Logic ---
                if (isActive && this.isFiring) {
                    if (state.currentEnergy > 0) {
                        // Drain energy FIRST
                        state.currentEnergy = Math.max(0, state.currentEnergy - state.energyDrainPerSec * deltaSec);
                        // If still has energy after draining (or had energy before draining this frame), allow firing
                        this.emitFireRequest(id); // Fire the active weapon
                        if (state.currentEnergy === 0) {
                            logger.debug(`Laser energy depleted this frame for ${id}.`);
                        }
                    }
                } else if (!isActive || !this.isFiring) { // Refill if inactive OR if active but not firing
                    // Refill energy
                    state.currentEnergy = Math.min(state.maxEnergy, state.currentEnergy + state.energyRefillPerSec * deltaSec);
                }
                if (state.currentEnergy !== previousEnergy) stateChanged = true;

            } else {
                // --- Standard Cooldown Weapon Logic ---
                if (state.cooldownTimer > 0) {
                    state.cooldownTimer = Math.max(0, state.cooldownTimer - deltaMs);
                }

                // Auto-fire for active cooldown weapon
                if (isActive && this.isFiring && state.cooldownTimer === 0) {
                    const cooldownReset = this.attemptFire(id); // Attempt fire handles cooldown reset via action
                    if (cooldownReset) stateChanged = true; // Cooldown state changed
                }
                if (state.cooldownTimer !== previousCooldown) stateChanged = true;
            }
        });

        // Emit state update only if something changed
        if (stateChanged) {
            this.emitStateUpdate();
        }
    }

    // --- Helper Methods (calling action functions) ---

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
                // Progress for cooldown: 0 = ready, 1 = full cooldown
                progress = state.currentCooldownMs > 0 ? (state.currentCooldownMs - state.cooldownTimer) / state.currentCooldownMs : 1;
            }
            progressPayload[id] = Math.max(0, Math.min(1, progress)); // Clamp progress
            costsPayload[id] = state.costForNextLevel;
            levelsPayload[id] = state.level;
        });

        const stateData: AllWeaponStatesUpdateData = {
            activeWeaponId: this.currentWeaponId,
            progress: progressPayload,
            nextUpgradeCosts: costsPayload,
            levels: levelsPayload,
        };
        
        // Log the active weapon ID for debugging
        logger.debug(`WeaponManager: Emitting state update with activeWeaponId="${this.currentWeaponId}"`);
        
        // Add more detailed logging for debugging
        logger.debug(`WeaponManager: State data: activeWeaponId=${stateData.activeWeaponId}, weapons=${Object.keys(stateData.levels).join(', ')}`);
        
        // Emit the state update event
        this.eventBus.emit(Events.WEAPON_STATE_UPDATED, stateData);
    }

    /** Calls the attemptFire action function */
    private attemptFire(weaponId: string): boolean {
        return attemptFireAction({
            weaponId: weaponId,
            weaponRuntimeState: this.weaponRuntimeState,
            weaponPowerupHandler: this.weaponPowerupHandler,
            emitFireRequestFn: (id) => this.emitFireRequest(id), // Pass bound emitFireRequest
        });
    }

    /** Calls the emitFireRequest action function */
    private emitFireRequest(weaponId: string): void {
        emitFireRequestAction({
            weaponId: weaponId,
            weaponRuntimeState: this.weaponRuntimeState,
            eventBus: this.eventBus,
        });
    }

    // --- Cleanup ---

    public destroy(): void {
        // Unregister event listeners using the bound methods used in constructor
        this.eventBus.off(Events.FIRE_START, this.onFireStart.bind(this));
        this.eventBus.off(Events.FIRE_STOP, this.onFireEnd.bind(this));
        this.eventBus.off(Events.WEAPON_SWITCH, this.onWeaponSwitch.bind(this));
        this.eventBus.off(Events.REQUEST_WEAPON_UPGRADE, this.onWeaponUpgradeRequest.bind(this));

        this.weaponPowerupHandler.destroy();
        logger.log('WeaponManager destroyed and listeners removed');
    }
}
