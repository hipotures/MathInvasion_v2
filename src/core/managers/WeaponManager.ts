// Import singleton instances
// import eventBus from '../events/EventBus'; // Removed - instance passed in constructor
import logger from '../utils/Logger';
// Import class type for annotations
import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events'; // Import event constants
import configLoader from '../config/ConfigLoader'; // Import config loader instance
import { type WeaponsConfig, type WeaponConfig } from '../config/schemas/weaponSchema'; // Import weapon config types
// import { PlayerState } from '../types/PlayerState'; // Assuming a type definition exists or will be created - Not used here

/** Defines the data expected for the WEAPON_STATE_UPDATED event */
interface WeaponStateUpdateData {
  weaponId: string;
  level: number;
  // Add other relevant state later, e.g., upgrade cost, max level
}

/** Defines the data expected for the PLAYER_STATE_UPDATED event */
// Note: This interface might be better placed in a shared types file or events.ts
// Duplicated from PlayerManager for now, consider centralizing later
interface PlayerStateData {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  health: number;
}

/**
 * Manages the player's weapons, including selection, firing, cooldowns,
 * and potentially upgrades or modifications based on game state.
 */
export default class WeaponManager {
  private eventBus: EventBusType;
  private weaponsConfig: WeaponsConfig; // Store all weapon configs
  private currentWeaponConfig: WeaponConfig | null = null; // Store config for the active weapon
  private currentWeaponId: string = 'bullet'; // Default initial weapon ID
  private currentWeaponLevel: number = 1; // Start at level 1
  private weaponCooldown: number = 500; // ms - Default, will be overwritten by config
  private cooldownTimer: number = 0; // ms
  private isFiring: boolean = false; // Is the fire button currently held?
  // Removed playerPosition tracking

  constructor(eventBusInstance: EventBusType) {
    this.eventBus = eventBusInstance;
    this.weaponsConfig = configLoader.getWeaponsConfig(); // Load all weapon configs
    logger.log('WeaponManager initialized');

    // Find and set the initial weapon config
    this.currentWeaponConfig =
      this.weaponsConfig.find((w) => w.id === this.currentWeaponId) ?? null;
    if (this.currentWeaponConfig) {
      this.weaponCooldown = this.currentWeaponConfig.baseCooldownMs;
      logger.log(
        `Initial weapon set to ${this.currentWeaponId}, Cooldown: ${this.weaponCooldown}ms`
      );
    } else {
      logger.error(`Initial weapon config not found for ID: ${this.currentWeaponId}`);
      // Handle error appropriately - maybe default to a failsafe weapon or throw
      this.weaponCooldown = 500; // Fallback cooldown
    }

    // Bind methods
    this.handleFireStart = this.handleFireStart.bind(this);
    this.handleWeaponSwitch = this.handleWeaponSwitch.bind(this); // Bind switch handler
    this.emitStateUpdate = this.emitStateUpdate.bind(this); // Bind state update emitter
    // Removed handlePlayerStateUpdate binding
    // Note: handleFireStop might not be needed if firing is triggered on press

    // Subscribe to events
    this.eventBus.on(Events.FIRE_START, this.handleFireStart);
    this.eventBus.on(Events.WEAPON_SWITCH, this.handleWeaponSwitch); // Subscribe to switch event
    // Removed PLAYER_STATE_UPDATED subscription

    // Config loaded and initial weapon set above

    // Emit initial state
    this.emitStateUpdate();
  }

  // --- Event Handlers ---

  private handleFireStart(): void {
    logger.debug('Fire input received');
    this.isFiring = true; // Track that the button is pressed
    this.attemptFire(); // Try to fire immediately
  }

  // Note: Event data is just the weaponId string based on UIScene/InputManager emissions
  private handleWeaponSwitch(newWeaponId: string): void {
    // const newWeaponId = data.weaponId; // Old way with object
    if (newWeaponId === this.currentWeaponId) {
      logger.debug(`Weapon ${newWeaponId} is already selected.`);
      return; // No change needed
    }

    const newWeaponConfig = this.weaponsConfig.find((w) => w.id === newWeaponId);

    if (newWeaponConfig) {
      this.currentWeaponId = newWeaponId;
      this.currentWeaponConfig = newWeaponConfig;
      this.weaponCooldown = newWeaponConfig.baseCooldownMs;
      this.cooldownTimer = 0; // Reset cooldown when switching
      this.currentWeaponLevel = 1; // Reset level when switching weapons (or load saved level later)
      logger.log(
        `Switched weapon to ${this.currentWeaponId}, Level: ${this.currentWeaponLevel}, Cooldown: ${this.weaponCooldown}ms`
      );
      this.emitStateUpdate(); // Emit state change
    } else {
      logger.warn(`Attempted to switch to unknown weapon ID: ${newWeaponId}`);
    }
  }

  // Removed handlePlayerStateUpdate method

  // --- Core Logic ---

  public update(deltaTime: number): void {
    // Update cooldown timer
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= deltaTime;
      if (this.cooldownTimer < 0) {
        this.cooldownTimer = 0;
      }
    }

    // If firing is active (button held) and cooldown is ready, fire again (for auto-fire)
    // For single shot, we'd only fire in handleFireStart
    // if (this.isFiring && this.cooldownTimer === 0) {
    //    this.attemptFire();
    // }
  }

  private emitStateUpdate(): void {
    const stateData: WeaponStateUpdateData = {
      weaponId: this.currentWeaponId,
      level: this.currentWeaponLevel,
    };
    this.eventBus.emit(Events.WEAPON_STATE_UPDATED, stateData);
    logger.debug(`Emitted WEAPON_STATE_UPDATED: ${JSON.stringify(stateData)}`);
  }

  private attemptFire(): void {
    if (this.cooldownTimer === 0) {
      logger.debug(`Firing weapon: ${this.currentWeaponId}`);
      // Ensure we have a valid config before firing
      if (!this.currentWeaponConfig) {
        logger.error(
          `Cannot fire, current weapon config is missing for ID: ${this.currentWeaponId}`
        );
        return;
      }

      // Emit request for GameScene to handle spawn details
      this.eventBus.emit(Events.REQUEST_FIRE_WEAPON, {
        weaponConfig: this.currentWeaponConfig,
      });

      this.cooldownTimer = this.weaponCooldown; // Start cooldown
    } else {
      logger.debug('Weapon on cooldown');
    }
  }

  // TODO: Add method for switching weapons

  /** Clean up event listeners when the manager is destroyed */
  public destroy(): void {
    this.eventBus.off(Events.FIRE_START, this.handleFireStart);
    this.eventBus.off(Events.WEAPON_SWITCH, this.handleWeaponSwitch); // Unsubscribe switch event
    // Removed PLAYER_STATE_UPDATED unsubscription
    logger.log('WeaponManager destroyed and listeners removed');
  }
}
