// Import singleton instances
// import eventBus from '../events/EventBus'; // Removed - instance passed in constructor
import logger from '../utils/Logger';
// Import class type for annotations
import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events'; // Import event constants

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

  // --- Event Handlers ---

  private handleEnemyDestroyed(data: EnemyDestroyedData): void {
    logger.debug(
      `Enemy ${data.configId} (Instance: ${data.instanceId}) destroyed. Granting ${data.reward} currency and ${data.scoreValue} score.`
    );
    this.addCurrency(data.reward);
    this.addScore(data.scoreValue); // Add score
  }

  // --- Listener Setup ---

  private registerEventListeners(): void {
    this.handleEnemyDestroyed = this.handleEnemyDestroyed.bind(this);
    this.eventBus.on(Events.ENEMY_DESTROYED, this.handleEnemyDestroyed);
  }

  /** Clean up event listeners when the manager is destroyed */
  public destroy(): void {
    this.eventBus.off(Events.ENEMY_DESTROYED, this.handleEnemyDestroyed);
    logger.log('EconomyManager destroyed and listeners removed');
  }
}
