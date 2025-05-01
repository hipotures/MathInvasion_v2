import logger from '../utils/Logger';
import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events';
import configLoader from '../config/ConfigLoader';
import { type WeaponsConfig, type WeaponConfig } from '../config/schemas/weaponSchema';
import EconomyManager from './EconomyManager';
import { WeaponUpgrader } from './helpers/WeaponUpgrader';
import { WeaponPowerupHandler } from './helpers/WeaponPowerupHandler';

interface WeaponStateUpdateData {
  weaponId: string;
  level: number;
  nextUpgradeCost: number | null; // Cost for the next level, null if maxed or no upgrades
}

interface RequestFireWeaponData {
  weaponConfig: WeaponConfig;
  damage: number;
  projectileSpeed: number;
}

export default class WeaponManager {
  private eventBus: EventBusType;
  private economyManager: EconomyManager;
  private weaponUpgrader: WeaponUpgrader;
  private weaponPowerupHandler: WeaponPowerupHandler;
  private weaponsConfig: WeaponsConfig;
  private currentWeaponConfig: WeaponConfig | null = null;
  private currentWeaponId: string = 'bullet';
  private currentWeaponLevel: number = 1;
  private weaponCooldown: number = 500; // ms - Current cooldown, updated by upgrades
  private currentDamage: number = 10; // Current damage, updated by upgrades
  private currentProjectileSpeed: number = 400; // Current speed, updated by upgrades
  private cooldownTimer: number = 0;
  private isFiring: boolean = false; // Is the fire button currently held?

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

    this.currentWeaponConfig =
      this.weaponsConfig.find((w) => w.id === this.currentWeaponId) ?? null;
    if (this.currentWeaponConfig) {
      this.weaponCooldown = this.currentWeaponConfig.baseCooldownMs;
      this.currentDamage = this.currentWeaponConfig.baseDamage ?? 0; // Use 0 if baseDamage is undefined
      this.currentProjectileSpeed = this.currentWeaponConfig.projectileSpeed ?? 400;
      logger.log(
        `Initial weapon set to ${this.currentWeaponId}, Lvl: ${this.currentWeaponLevel}, Cooldown: ${this.weaponCooldown}ms, Damage: ${this.currentDamage}, Speed: ${this.currentProjectileSpeed}`
      );
    } else {
      logger.error(`Initial weapon config not found for ID: ${this.currentWeaponId}`);
      this.weaponCooldown = 500;
    }

    this.handleFireStart = this.handleFireStart.bind(this);
    this.handleWeaponSwitch = this.handleWeaponSwitch.bind(this);
    this.handleWeaponUpgradeRequest = this.handleWeaponUpgradeRequest.bind(this);
    this.emitStateUpdate = this.emitStateUpdate.bind(this);

    this.eventBus.on(Events.FIRE_START, this.handleFireStart);
    this.eventBus.on(Events.WEAPON_SWITCH, this.handleWeaponSwitch);
    this.eventBus.on(Events.REQUEST_WEAPON_UPGRADE, this.handleWeaponUpgradeRequest);

    this.emitStateUpdate();
  }

  private handleFireStart(): void {
    logger.debug('Fire input received');
    this.isFiring = true; // Track that the button is pressed
    this.attemptFire();
  }

  private handleWeaponSwitch(newWeaponId: string): void {
    if (newWeaponId === this.currentWeaponId) {
      logger.debug(`Weapon ${newWeaponId} is already selected.`);
      return;
    }

    const newWeaponConfig = this.weaponsConfig.find((w) => w.id === newWeaponId);

    if (newWeaponConfig) {
      this.currentWeaponId = newWeaponId;
      this.currentWeaponConfig = newWeaponConfig;
      this.currentWeaponLevel = 1;
      this.weaponCooldown = newWeaponConfig.baseCooldownMs;
      this.currentDamage = newWeaponConfig.baseDamage ?? 0;
      this.currentProjectileSpeed = newWeaponConfig.projectileSpeed ?? 400;
      this.cooldownTimer = 0;
      logger.log(
        `Switched weapon to ${this.currentWeaponId}, Lvl: ${this.currentWeaponLevel}, Cooldown: ${this.weaponCooldown}ms, Damage: ${this.currentDamage}, Speed: ${this.currentProjectileSpeed}`
      );
      this.emitStateUpdate();
    } else {
      logger.warn(`Attempted to switch to unknown weapon ID: ${newWeaponId}`);
    }
  }

  private handleWeaponUpgradeRequest(): void {
    logger.debug(`Received REQUEST_WEAPON_UPGRADE for ${this.currentWeaponId}`);

    if (!this.currentWeaponConfig) {
      logger.warn(`Cannot upgrade, no current weapon config found for ID: ${this.currentWeaponId}`);
      return;
    }

    const result = this.weaponUpgrader.attemptUpgrade(
      this.currentWeaponConfig,
      this.currentWeaponLevel
    );

    if (result.success) {
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

      this.emitStateUpdate();
    } else {
      logger.log(`Upgrade failed for ${this.currentWeaponId}: ${result.message}`);
    }
  }

  public update(deltaTime: number): void {
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
      if (!this.currentWeaponConfig) {
        logger.error(
          `Cannot fire, current weapon config is missing for ID: ${this.currentWeaponId}`
        );
        return;
      }

      const fireData: RequestFireWeaponData = {
        weaponConfig: this.currentWeaponConfig,
        damage: this.currentDamage,
        projectileSpeed: this.currentProjectileSpeed,
      };
      this.eventBus.emit(Events.REQUEST_FIRE_WEAPON, fireData);

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

  public destroy(): void {
    this.eventBus.off(Events.FIRE_START, this.handleFireStart);
    this.eventBus.off(Events.WEAPON_SWITCH, this.handleWeaponSwitch);
    this.eventBus.off(Events.REQUEST_WEAPON_UPGRADE, this.handleWeaponUpgradeRequest);
    this.weaponPowerupHandler.destroy();
    logger.log('WeaponManager destroyed and listeners removed');
  }
}
