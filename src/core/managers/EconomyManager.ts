// Import singleton instances
// import eventBus from '../events/EventBus'; // Removed - instance passed in constructor
import logger from '../utils/Logger';
// Import class type for annotations
import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events'; // Import event constants
import { PowerupEffectData } from './PowerupManager'; // Import PowerupEffectData

/** Defines the data expected for the ENEMY_DESTROYED event */
// Note: This interface should ideally be defined centrally, perhaps in EnemyManager or a shared types file.
// It needs to match the payload emitted by EnemyManager.
interface EnemyDestroyedData {
  instanceId: string;
  configId: string;
  reward: number;
  scoreValue: number; // Added score value
}

/**
 * Manages the player's in-game currency (e.g., points, coins).
 * Handles earning and spending currency and notifies the UI.
 */
export default class EconomyManager {
  private eventBus: EventBusType;
  private currentCurrency: number;
  private currentScore: number; // Added score tracking
  // Powerup state
  private isCashBoostActive: boolean = false;
  private cashBoostMultiplier: number = 1.0; // 1.0 means no effect

  constructor(
    eventBusInstance: EventBusType,
    initialCurrency: number = 0,
    initialScore: number = 0
  ) {
    this.eventBus = eventBusInstance;
    this.currentCurrency = initialCurrency;
    this.currentScore = initialScore; // Initialize score
    this.registerEventListeners(); // Setup listeners
    logger.log(
      `EconomyManager initialized with ${this.currentCurrency} currency and ${this.currentScore} score.`
    );
    // TODO: Subscribe to events that cost currency (e.g., 'PURCHASE_WEAPON')
    this.emitCurrencyUpdate(); // Emit initial state
    this.emitScoreUpdate(); // Emit initial score state
  }

  public addCurrency(amount: number): void {
    if (amount <= 0) {
      logger.warn(`Attempted to add non-positive currency amount: ${amount}`);
      return;
    }
    this.currentCurrency += amount;
    logger.log(`Added ${amount} currency. New total: ${this.currentCurrency}`);
    this.emitCurrencyUpdate();
  }

  public spendCurrency(amount: number): boolean {
    if (amount <= 0) {
      logger.warn(`Attempted to spend non-positive currency amount: ${amount}`);
      return false;
    }
    if (this.currentCurrency >= amount) {
      this.currentCurrency -= amount;
      logger.log(`Spent ${amount} currency. New total: ${this.currentCurrency}`);
      this.emitCurrencyUpdate();
      return true;
    } else {
      logger.log(`Insufficient currency to spend ${amount}. Current: ${this.currentCurrency}`);
      // Optionally emit an 'INSUFFICIENT_FUNDS' event
      // this.eventBus.emit('INSUFFICIENT_FUNDS', { attemptedAmount: amount, currentAmount: this.currentCurrency });
      return false;
    }
  }

  public getCurrentCurrency(): number {
    return this.currentCurrency;
  }

  /** Emits an event with the current currency total. */
  private emitCurrencyUpdate(): void {
    this.eventBus.emit(Events.CURRENCY_UPDATED, { currentAmount: this.currentCurrency });
  }

  private handleEnemyDestroyed(data: EnemyDestroyedData): void {
    // Apply cash boost multiplier if active
    const effectiveReward = Math.round(data.reward * this.cashBoostMultiplier);
    logger.debug(
      `Enemy ${data.configId} (Instance: ${data.instanceId}) destroyed. Base Reward: ${data.reward}, Multiplier: ${this.cashBoostMultiplier}, Effective Reward: ${effectiveReward}. Score: ${data.scoreValue}.`
    );
    this.addCurrency(effectiveReward);
    this.addScore(data.scoreValue); // Score is not affected by cash boost
  }

  // Handler for when a powerup effect is applied
  private handlePowerupEffectApplied(data: PowerupEffectData): void {
    if (data.effect === 'currency_multiplier') {
      this.isCashBoostActive = true;
      // Use the multiplier from the powerup config, default to 2 if missing/invalid
      this.cashBoostMultiplier = data.multiplier && data.multiplier > 0 ? data.multiplier : 2.0;
      logger.log(`Cash Boost activated! Currency multiplier: ${this.cashBoostMultiplier}`);
    }
    // Handle other powerup effects here if EconomyManager needs to react
  }

  // Handler for when a powerup effect is removed
  private handlePowerupEffectRemoved(data: PowerupEffectData): void {
    if (data.effect === 'currency_multiplier') {
      this.isCashBoostActive = false;
      this.cashBoostMultiplier = 1.0; // Reset multiplier
      logger.log('Cash Boost deactivated.');
    }
    // Handle removal of other powerup effects here
  }

  /** Adds score and emits an update event. */
  public addScore(amount: number): void {
    if (amount <= 0) {
      // Allow adding 0 score, but log warning for negative
      if (amount < 0) logger.warn(`Attempted to add negative score amount: ${amount}`);
      return;
    }
    this.currentScore += amount;
    logger.log(`Added ${amount} score. New total: ${this.currentScore}`);
    this.emitScoreUpdate();
  }

  public getCurrentScore(): number {
    return this.currentScore;
  }

  /** Emits an event with the current score total. */
  private emitScoreUpdate(): void {
    this.eventBus.emit(Events.SCORE_UPDATED, { currentScore: this.currentScore });
  }

  // --- Listener Setup ---

  private registerEventListeners(): void {
    this.handleEnemyDestroyed = this.handleEnemyDestroyed.bind(this);
    this.handlePowerupEffectApplied = this.handlePowerupEffectApplied.bind(this); // Bind powerup handler
    this.handlePowerupEffectRemoved = this.handlePowerupEffectRemoved.bind(this); // Bind powerup handler

    this.eventBus.on(Events.ENEMY_DESTROYED, this.handleEnemyDestroyed);
    this.eventBus.on(Events.POWERUP_EFFECT_APPLIED, this.handlePowerupEffectApplied); // Subscribe to powerup applied
    this.eventBus.on(Events.POWERUP_EFFECT_REMOVED, this.handlePowerupEffectRemoved); // Subscribe to powerup removed
  }

  /** Clean up event listeners when the manager is destroyed */
  public destroy(): void {
    this.eventBus.off(Events.ENEMY_DESTROYED, this.handleEnemyDestroyed);
    this.eventBus.off(Events.POWERUP_EFFECT_APPLIED, this.handlePowerupEffectApplied); // Unsubscribe powerup listener
    this.eventBus.off(Events.POWERUP_EFFECT_REMOVED, this.handlePowerupEffectRemoved); // Unsubscribe powerup listener
    logger.log('EconomyManager destroyed and listeners removed');
  }
}
