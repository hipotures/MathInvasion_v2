// Import singleton instances
import eventBus from '../events/EventBus';
import logger from '../utils/Logger';
// Import class type for annotations
import { EventBus as EventBusType } from '../events/EventBus';

/**
 * Manages the player's in-game currency (e.g., points, coins).
 * Handles earning and spending currency and notifies the UI.
 */
export default class EconomyManager {
  private eventBus: EventBusType;
  private currentCurrency: number;

  constructor(eventBusInstance: EventBusType, initialCurrency: number = 0) {
    this.eventBus = eventBusInstance;
    this.currentCurrency = initialCurrency;
    logger.log(`EconomyManager initialized with ${this.currentCurrency} currency.`);
    // TODO: Subscribe to events that grant currency (e.g., 'ENEMY_DEFEATED')
    // TODO: Subscribe to events that cost currency (e.g., 'PURCHASE_WEAPON')
    this.emitCurrencyUpdate(); // Emit initial state
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
    this.eventBus.emit('CURRENCY_UPDATED', { currentAmount: this.currentCurrency });
  }
}
