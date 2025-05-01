import { EventBus } from '../../events/EventBus';
import { Logger } from '../../utils/Logger';
import * as Events from '../../constants/events';
import { PowerupEffectData } from '../PowerupManager';

export class PlayerPowerupHandler {
  private isShieldActive: boolean = false;

  constructor(
    private eventBus: EventBus,
    private logger: Logger
  ) {
    this.handlePowerupEffectApplied = this.handlePowerupEffectApplied.bind(this);
    this.handlePowerupEffectRemoved = this.handlePowerupEffectRemoved.bind(this);

    this.registerListeners();
    this.logger.log('PlayerPowerupHandler initialized.');
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
    if (data.effect === 'temporary_invulnerability') {
      this.isShieldActive = true;
      this.logger.log(`Player Shield activated for ${data.durationMs}ms`);
    }
  }

  private handlePowerupEffectRemoved(data: PowerupEffectData): void {
    if (data.effect === 'temporary_invulnerability') {
      this.isShieldActive = false;
      this.logger.log('Player Shield deactivated.');
    }
  }

  public isShieldPowerupActive(): boolean {
    return this.isShieldActive;
  }

  public destroy(): void {
    this.unregisterListeners();
    this.logger.log('PlayerPowerupHandler destroyed.');
  }
}
