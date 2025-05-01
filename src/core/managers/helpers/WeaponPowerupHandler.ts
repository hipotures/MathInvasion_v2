import { EventBus } from '../../events/EventBus';
import { Logger } from '../../utils/Logger';
import * as Events from '../../constants/events';
import { PowerupEffectData } from '../PowerupManager';

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

  private handlePowerupEffectApplied(data: PowerupEffectData): void {
    if (data.effect === 'weapon_cooldown_reduction') {
      this.isRapidFireActive = true;
      // Use the multiplier from the powerup config, default to 0.5 if missing/invalid
      this.rapidFireMultiplier = data.multiplier && data.multiplier > 0 ? data.multiplier : 0.5;
      this.logger.log(`Rapid Fire activated! Cooldown multiplier: ${this.rapidFireMultiplier}`);
    }
  }

  private handlePowerupEffectRemoved(data: PowerupEffectData): void {
    if (data.effect === 'weapon_cooldown_reduction') {
      this.isRapidFireActive = false;
      this.rapidFireMultiplier = 1.0; // Reset multiplier
      this.logger.log('Rapid Fire deactivated.');
    }
  }

  public getCurrentCooldownMultiplier(): number {
    return this.rapidFireMultiplier;
  }

  public destroy(): void {
    this.unregisterListeners();
    this.logger.log('WeaponPowerupHandler destroyed.');
  }
}
