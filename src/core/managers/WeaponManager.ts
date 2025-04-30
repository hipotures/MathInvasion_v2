// Import singleton instances
// import eventBus from '../events/EventBus'; // Removed - instance passed in constructor
import logger from '../utils/Logger';
// Import class type for annotations
import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events'; // Import event constants
import configLoader from '../config/ConfigLoader'; // Import config loader instance
import { type WeaponsConfig, type WeaponConfig } from '../config/schemas/weaponSchema'; // Import weapon config types
import EconomyManager from './EconomyManager'; // Import EconomyManager type
import { WeaponUpgrader } from './helpers/WeaponUpgrader'; // Import the helper class
import { WeaponPowerupHandler } from './helpers/WeaponPowerupHandler'; // Import the new helper class
// PowerupEffectData is no longer needed directly here

/** Defines the data expected for the WEAPON_STATE_UPDATED event */
interface WeaponStateUpdateData {
  weaponId: string;
  level: number;
  nextUpgradeCost: number | null; // Cost for the next level, null if maxed or no upgrades
}

/** Defines the data expected for the REQUEST_FIRE_WEAPON event */
// Ensure this matches the payload emitted in attemptFire
interface RequestFireWeaponData {
  weaponConfig: WeaponConfig;
  damage: number; // Add calculated damage
  projectileSpeed: number; // Add calculated speed
  // Add range etc. later if needed
}

/**
 * Manages the player's weapons, including selection, firing, cooldowns,
 * and potentially upgrades or modifications based on game state.
 */
export default class WeaponManager {
  private eventBus: EventBusType;
  private economyManager: EconomyManager; // Add EconomyManager instance
  private weaponUpgrader: WeaponUpgrader; // Instance of the upgrade helper class
  private weaponPowerupHandler: WeaponPowerupHandler; // Instance of the powerup helper class
  private weaponsConfig: WeaponsConfig; // Store all weapon configs
  private currentWeaponConfig: WeaponConfig | null = null; // Store config for the active weapon
  private currentWeaponId: string = 'bullet'; // Default initial weapon ID
  private currentWeaponLevel: number = 1; // Start at level 1
  private weaponCooldown: number = 500; // ms - Current cooldown, updated by upgrades
  private currentDamage: number = 10; // Current damage, updated by upgrades
  private currentProjectileSpeed: number = 400; // Current speed, updated by upgrades
  private cooldownTimer: number = 0; // ms
  private isFiring: boolean = false; // Is the fire button currently held?
  // Powerup state removed - managed by WeaponPowerupHandler
  // Removed playerPosition tracking

  constructor(
    eventBusInstance: EventBusType,
    economyManagerInstance: EconomyManager,
    weaponUpgraderInstance: WeaponUpgrader, // Inject WeaponUpgrader
    weaponPowerupHandlerInstance: WeaponPowerupHandler // Inject WeaponPowerupHandler
  ) {
    this.eventBus = eventBusInstance;
    this.economyManager = economyManagerInstance; // Store EconomyManager
    this.weaponUpgrader = weaponUpgraderInstance; // Assign injected instance
    this.weaponPowerupHandler = weaponPowerupHandlerInstance; // Assign injected instance
    this.weaponsConfig = configLoader.getWeaponsConfig(); // Load all weapon configs
    logger.log('WeaponManager initialized');

    // Find and set the initial weapon config
    this.currentWeaponConfig =
      this.weaponsConfig.find((w) => w.id === this.currentWeaponId) ?? null;
    if (this.currentWeaponConfig) {
      // Initialize all stats from the base config
      this.weaponCooldown = this.currentWeaponConfig.baseCooldownMs;
      this.currentDamage = this.currentWeaponConfig.baseDamage ?? 0; // Use 0 if baseDamage is undefined
      // Use nullish coalescing operator for projectileSpeed default
      this.currentProjectileSpeed = this.currentWeaponConfig.projectileSpeed ?? 400;
      logger.log(
        `Initial weapon set to ${this.currentWeaponId}, Lvl: ${this.currentWeaponLevel}, Cooldown: ${this.weaponCooldown}ms, Damage: ${this.currentDamage}, Speed: ${this.currentProjectileSpeed}`
      );
    } else {
      logger.error(`Initial weapon config not found for ID: ${this.currentWeaponId}`);
      // Fallback values (already set in property declarations)
      // Handle error appropriately - maybe default to a failsafe weapon or throw
      this.weaponCooldown = 500; // Fallback cooldown
    }

    // Bind methods
    this.handleFireStart = this.handleFireStart.bind(this);
    this.handleWeaponSwitch = this.handleWeaponSwitch.bind(this); // Bind switch handler
    this.handleWeaponUpgradeRequest = this.handleWeaponUpgradeRequest.bind(this); // Bind upgrade handler
    this.emitStateUpdate = this.emitStateUpdate.bind(this); // Bind state update emitter
    // Powerup handlers removed - managed by WeaponPowerupHandler
    // Removed handlePlayerStateUpdate binding
    // Note: handleFireStop might not be needed if firing is triggered on press

    // Subscribe to events
    this.eventBus.on(Events.FIRE_START, this.handleFireStart);
    this.eventBus.on(Events.WEAPON_SWITCH, this.handleWeaponSwitch); // Subscribe to switch event
    this.eventBus.on(Events.REQUEST_WEAPON_UPGRADE, this.handleWeaponUpgradeRequest); // Subscribe to upgrade request
    // Powerup listeners removed - managed by WeaponPowerupHandler
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
      // Reset all stats to the base values of the new weapon
      this.currentWeaponLevel = 1;
      this.weaponCooldown = newWeaponConfig.baseCooldownMs;
      this.currentDamage = newWeaponConfig.baseDamage ?? 0; // Use 0 if baseDamage is undefined
      // Use nullish coalescing operator for projectileSpeed default
      this.currentProjectileSpeed = newWeaponConfig.projectileSpeed ?? 400;
      this.cooldownTimer = 0; // Reset cooldown timer
      logger.log(
        `Switched weapon to ${this.currentWeaponId}, Lvl: ${this.currentWeaponLevel}, Cooldown: ${this.weaponCooldown}ms, Damage: ${this.currentDamage}, Speed: ${this.currentProjectileSpeed}`
      );
      this.emitStateUpdate(); // Emit state change
    } else {
      logger.warn(`Attempted to switch to unknown weapon ID: ${newWeaponId}`);
    }
  }

  // Removed handlePlayerStateUpdate method

  private handleWeaponUpgradeRequest(): void {
    logger.debug(`Received REQUEST_WEAPON_UPGRADE for ${this.currentWeaponId}`);

    if (!this.currentWeaponConfig) {
      logger.warn(`Cannot upgrade, no current weapon config found for ID: ${this.currentWeaponId}`);
      return;
    }

    // Delegate upgrade attempt to the helper class
    const result = this.weaponUpgrader.attemptUpgrade(
      this.currentWeaponConfig,
      this.currentWeaponLevel
    );

    if (result.success) {
      // Apply the new stats from the result
      this.currentWeaponLevel = result.newLevel!; // Non-null assertion ok due to success check
      if (result.newCooldown !== undefined) {
        this.weaponCooldown = result.newCooldown;
      }
      if (result.newDamage !== undefined) {
        this.currentDamage = result.newDamage;
      }
      if (result.newProjectileSpeed !== undefined) {
        this.currentProjectileSpeed = result.newProjectileSpeed;
      }

      logger.log(
        `Successfully upgraded ${this.currentWeaponId} to Level ${this.currentWeaponLevel}.`
      );
      logger.debug(
        `Applied Stats - Cooldown: ${this.weaponCooldown}, Damage: ${this.currentDamage}, Speed: ${this.currentProjectileSpeed}`
      );

      // Emit state update to refresh UI
      this.emitStateUpdate();
      // Optionally emit WEAPON_UPGRADED event here
    } else {
      // Log the reason for failure (already logged by the upgrader, but can add more context here if needed)
      logger.log(`Upgrade failed for ${this.currentWeaponId}: ${result.message}`);
      // Optionally emit INSUFFICIENT_FUNDS or UPGRADE_FAILED event
    }
  }

  // Powerup handlers removed - managed by WeaponPowerupHandler

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
    let nextUpgradeCost: number | null = null;

    // Calculate next upgrade cost using the helper
    if (this.currentWeaponConfig) {
      nextUpgradeCost = this.weaponUpgrader.calculateNextUpgradeCost(
        this.currentWeaponConfig,
        this.currentWeaponLevel
      );
    } else {
      nextUpgradeCost = null;
    }

    const stateData: WeaponStateUpdateData = {
      weaponId: this.currentWeaponId,
      level: this.currentWeaponLevel,
      nextUpgradeCost: nextUpgradeCost,
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

      // Emit request for GameScene to handle spawn details, including current stats
      const fireData: RequestFireWeaponData = {
        weaponConfig: this.currentWeaponConfig,
        damage: this.currentDamage, // Use current calculated damage
        projectileSpeed: this.currentProjectileSpeed, // Use current calculated speed
      };
      this.eventBus.emit(Events.REQUEST_FIRE_WEAPON, fireData);

      // Get the current multiplier from the powerup handler and apply it
      const cooldownMultiplier = this.weaponPowerupHandler.getCurrentCooldownMultiplier();
      this.cooldownTimer = this.weaponCooldown * cooldownMultiplier;
      logger.debug(
        `Cooldown started: ${this.cooldownTimer}ms (Base: ${this.weaponCooldown}, Multiplier: ${cooldownMultiplier})`
      );
    } else {
      logger.debug(`Weapon on cooldown (${this.cooldownTimer.toFixed(0)}ms remaining)`);
    }
  }

  // TODO: Add method for switching weapons

  /** Clean up event listeners when the manager is destroyed */
  public destroy(): void {
    this.eventBus.off(Events.FIRE_START, this.handleFireStart);
    this.eventBus.off(Events.WEAPON_SWITCH, this.handleWeaponSwitch);
    this.eventBus.off(Events.REQUEST_WEAPON_UPGRADE, this.handleWeaponUpgradeRequest);
    // Destroy helper handlers
    this.weaponPowerupHandler.destroy();
    // No need to destroy weaponUpgrader as it doesn't hold listeners currently
    // Removed PLAYER_STATE_UPDATED unsubscription
    logger.log('WeaponManager destroyed and listeners removed');
  }
}
