import { EventBus } from '../../events/EventBus';
import { Logger } from '../../utils/Logger';
import * as Events from '../../constants/events';
import { PowerupEffectData } from '../PowerupManager';

/**
 * Handles the application and removal of powerup effects specifically related to the player.
 */
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

  // Handler for when a powerup effect is applied
  private handlePowerupEffectApplied(data: PowerupEffectData): void {
    if (data.effect === 'temporary_invulnerability') {
      this.isShieldActive = true;
      this.logger.log(`Player Shield activated for ${data.durationMs}ms`);
      // Optionally emit PLAYER_INVULNERABILITY_START if needed by other systems (like visuals)
      // Note: PlayerManager still handles post-hit invulnerability separately.
      // The combined state should be checked for damage application.
      // this.eventBus.emit(Events.PLAYER_INVULNERABILITY_START);
    }
    // Handle other player-specific powerup effects here
  }

  // Handler for when a powerup effect is removed
  private handlePowerupEffectRemoved(data: PowerupEffectData): void {
    if (data.effect === 'temporary_invulnerability') {
      this.isShieldActive = false;
      this.logger.log('Player Shield deactivated.');
      // Optionally emit PLAYER_INVULNERABILITY_END if needed by other systems
      // and if post-hit invulnerability isn't also active.
      // this.eventBus.emit(Events.PLAYER_INVULNERABILITY_END);
    }
    // Handle removal of other player-specific powerup effects here
  }

  /**
   * Checks if the shield powerup is currently active.
   * @returns True if the shield is active, false otherwise.
   */
  public isShieldPowerupActive(): boolean {
    return this.isShieldActive;
  }

  /** Cleans up listeners. */
  public destroy(): void {
    this.unregisterListeners();
    this.logger.log('PlayerPowerupHandler destroyed.');
  }
}
