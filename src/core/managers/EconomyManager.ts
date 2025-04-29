// Import singleton instances
// import eventBus from '../events/EventBus'; // Removed - instance passed in constructor
import logger from '../utils/Logger';
// Import class type for annotations
import { EventBus as EventBusType } from '../events/EventBus';

// Define event constants used or handled by this manager
const CURRENCY_UPDATED = 'CURRENCY_UPDATED'; // Emitted by this manager
const ENEMY_DESTROYED = 'ENEMY_DESTROYED'; // Handled by this manager

/** Defines the data expected for the ENEMY_DESTROYED event */
interface EnemyDestroyedData {
  instanceId: string;
  configId: string;
  reward: number;
}

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
    this.registerEventListeners(); // Setup listeners
    logger.log(`EconomyManager initialized with ${this.currentCurrency} currency.`);
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
    this.eventBus.emit(CURRENCY_UPDATED, { currentAmount: this.currentCurrency });
  }

  // --- Event Handlers ---

  private handleEnemyDestroyed(data: EnemyDestroyedData): void {
    logger.debug(`Enemy ${data.configId} (Instance: ${data.instanceId}) destroyed. Granting ${data.reward} currency.`);
    this.addCurrency(data.reward);
  }

  // --- Listener Setup ---

  private registerEventListeners(): void {
    this.handleEnemyDestroyed = this.handleEnemyDestroyed.bind(this);
    this.eventBus.on(ENEMY_DESTROYED, this.handleEnemyDestroyed);
  }

  /** Clean up event listeners when the manager is destroyed */
  public destroy(): void {
    this.eventBus.off(ENEMY_DESTROYED, this.handleEnemyDestroyed);
    logger.log('EconomyManager destroyed and listeners removed');
  }
}
