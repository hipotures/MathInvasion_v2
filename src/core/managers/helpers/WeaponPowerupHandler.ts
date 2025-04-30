import { EventBus } from '../../events/EventBus';
import { Logger } from '../../utils/Logger';
import * as Events from '../../constants/events';
import { PowerupEffectData } from '../PowerupManager';

/**
 * Handles the application and removal of powerup effects specifically related to weapons.
 */
export class WeaponPowerupHandler {
  private isRapidFireActive: boolean = false;
  private rapidFireMultiplier: number = 1.0; // 1.0 means no effect

  constructor(
    private eventBus: EventBus,
    private logger: Logger
  ) {
    this.handlePowerupEffectApplied = this.handlePowerupEffectApplied.bind(this);
    this.handlePowerupEffectRemoved = this.handlePowerupEffectRemoved.bind(this);

    this.registerListeners();
    this.logger.log('WeaponPowerupHandler initialized.');
  }

  private registerListeners(): void {
    this.eventBus.on(Events.POWERUP_EFFECT_APPLIED, this.handlePowerupEffectApplied);
    this.eventBus.on(Events.POWERUP_EFFECT_REMOVED, this.handlePowerupEffectRemoved);
  }

  private unregisterListeners(): void {
    this.eventBus.off(Events.POWERUP_EFFECT_APPLIED, this.handlePowerupEffectApplied);
    this.eventBus.off(Events.POWERUP_EFFECT_REMOVED, this.handlePowerupEffectRemoved);
  }

  // Handler for when a powerup effect is applied
  private handlePowerupEffectApplied(data: PowerupEffectData): void {
    if (data.effect === 'weapon_cooldown_reduction') {
      this.isRapidFireActive = true;
      // Use the multiplier from the powerup config, default to 0.5 if missing/invalid
      this.rapidFireMultiplier = data.multiplier && data.multiplier > 0 ? data.multiplier : 0.5;
      this.logger.log(`Rapid Fire activated! Cooldown multiplier: ${this.rapidFireMultiplier}`);
    }
    // Handle other weapon-related powerup effects here if added later
  }

  // Handler for when a powerup effect is removed
  private handlePowerupEffectRemoved(data: PowerupEffectData): void {
    if (data.effect === 'weapon_cooldown_reduction') {
      this.isRapidFireActive = false;
      this.rapidFireMultiplier = 1.0; // Reset multiplier
      this.logger.log('Rapid Fire deactivated.');
    }
    // Handle removal of other weapon-related powerup effects here
  }

  /**
   * Gets the current cooldown multiplier based on active powerups.
   * @returns The cooldown multiplier (e.g., 0.5 for rapid fire, 1.0 for normal).
   */
  public getCurrentCooldownMultiplier(): number {
    return this.rapidFireMultiplier;
  }

  /** Cleans up listeners. */
  public destroy(): void {
    this.unregisterListeners();
    this.logger.log('WeaponPowerupHandler destroyed.');
  }
}
