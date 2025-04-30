import { describe, it, expect, vi, beforeEach } from 'vitest';
import EconomyManager from '../../../src/core/managers/EconomyManager';
import { EventBus } from '../../../src/core/events/EventBus'; // Import class type
import * as Events from '../../../src/core/constants/events';
import logger from '../../../src/core/utils/Logger';

// Mock the logger to prevent console output during tests
vi.mock('../../../src/core/utils/Logger', () => ({
  default: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(), // Ensure debug is mocked if used
  },
}));

// Mock EventBus
const mockEventBus = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

// Explicitly type the mock to satisfy the constructor
const mockEventBusInstance = mockEventBus as unknown as EventBus;

describe('EconomyManager', () => {
  let economyManager: EconomyManager;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Create a new instance before each test
    economyManager = new EconomyManager(mockEventBusInstance, 100, 500);
  });

  it('should initialize with correct initial currency and score', () => {
    expect(economyManager.getCurrentCurrency()).toBe(100);
    expect(economyManager.getCurrentScore()).toBe(500);
    // Check if initial update events were emitted (these happen in beforeEach)
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.CURRENCY_UPDATED, { currentAmount: 100 });
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.SCORE_UPDATED, { currentScore: 500 });
  });

  it('should add currency correctly and emit update event', () => {
    economyManager.addCurrency(50);
    expect(economyManager.getCurrentCurrency()).toBe(150);
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.CURRENCY_UPDATED, { currentAmount: 150 });
    expect(logger.log).toHaveBeenCalledWith('Added 50 currency. New total: 150');
  });

  it('should not add non-positive currency', () => {
    economyManager.addCurrency(0);
    expect(economyManager.getCurrentCurrency()).toBe(100);
    economyManager.addCurrency(-10);
    expect(economyManager.getCurrentCurrency()).toBe(100);
    expect(logger.warn).toHaveBeenCalledWith('Attempted to add non-positive currency amount: 0');
    expect(logger.warn).toHaveBeenCalledWith('Attempted to add non-positive currency amount: -10');
    // Ensure update event wasn't emitted *again* for invalid amounts
    // Count calls matching the specific event and payload *before* the invalid actions
    const callsBefore = mockEventBus.emit.mock.calls.filter(
      (call) => call[0] === Events.CURRENCY_UPDATED && call[1]?.currentAmount === 100
    ).length;
    // Perform the actions again (already done above, but for clarity)
    economyManager.addCurrency(0);
    economyManager.addCurrency(-10);
    // Count calls *after* the actions
    const callsAfter = mockEventBus.emit.mock.calls.filter(
      (call) => call[0] === Events.CURRENCY_UPDATED && call[1]?.currentAmount === 100
    ).length;
    // Assert the count hasn't changed
    expect(callsAfter).toBe(callsBefore);
  });

  it('should spend currency successfully when sufficient funds exist', () => {
    const success = economyManager.spendCurrency(30);
    expect(success).toBe(true);
    expect(economyManager.getCurrentCurrency()).toBe(70);
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.CURRENCY_UPDATED, { currentAmount: 70 });
    expect(logger.log).toHaveBeenCalledWith('Spent 30 currency. New total: 70');
  });

  it('should not spend currency when insufficient funds exist', () => {
    const success = economyManager.spendCurrency(150);
    expect(success).toBe(false);
    expect(economyManager.getCurrentCurrency()).toBe(100);
    // Ensure update event wasn't emitted *again*
    const callsBefore = mockEventBus.emit.mock.calls.filter(
      (call) => call[0] === Events.CURRENCY_UPDATED && call[1]?.currentAmount === 100
    ).length;
    economyManager.spendCurrency(150); // Action already performed above
    const callsAfter = mockEventBus.emit.mock.calls.filter(
      (call) => call[0] === Events.CURRENCY_UPDATED && call[1]?.currentAmount === 100
    ).length;
    expect(callsAfter).toBe(callsBefore);
    expect(logger.log).toHaveBeenCalledWith('Insufficient currency to spend 150. Current: 100');
  });

  it('should not spend non-positive currency', () => {
    const success1 = economyManager.spendCurrency(0);
    expect(success1).toBe(false);
    expect(economyManager.getCurrentCurrency()).toBe(100);
    const success2 = economyManager.spendCurrency(-20);
    expect(success2).toBe(false);
    expect(economyManager.getCurrentCurrency()).toBe(100);
    expect(logger.warn).toHaveBeenCalledWith('Attempted to spend non-positive currency amount: 0');
    expect(logger.warn).toHaveBeenCalledWith(
      'Attempted to spend non-positive currency amount: -20'
    );
  });

  it('should add score correctly and emit update event', () => {
    economyManager.addScore(1000);
    expect(economyManager.getCurrentScore()).toBe(1500);
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.SCORE_UPDATED, { currentScore: 1500 });
    expect(logger.log).toHaveBeenCalledWith('Added 1000 score. New total: 1500');
  });

  it('should not add negative score', () => {
    economyManager.addScore(-50);
    expect(economyManager.getCurrentScore()).toBe(500);
    expect(logger.warn).toHaveBeenCalledWith('Attempted to add negative score amount: -50');
    // Ensure update event wasn't emitted *again*
    const callsBefore = mockEventBus.emit.mock.calls.filter(
      (call) => call[0] === Events.SCORE_UPDATED && call[1]?.currentScore === 500
    ).length;
    economyManager.addScore(-50); // Action already performed above
    const callsAfter = mockEventBus.emit.mock.calls.filter(
      (call) => call[0] === Events.SCORE_UPDATED && call[1]?.currentScore === 500
    ).length;
    expect(callsAfter).toBe(callsBefore);
  });

  it('should register event listeners on initialization', () => {
    // Constructor calls registerEventListeners
    expect(mockEventBus.on).toHaveBeenCalledWith(Events.ENEMY_DESTROYED, expect.any(Function));
    expect(mockEventBus.on).toHaveBeenCalledWith(
      Events.POWERUP_EFFECT_APPLIED,
      expect.any(Function)
    );
    expect(mockEventBus.on).toHaveBeenCalledWith(
      Events.POWERUP_EFFECT_REMOVED,
      expect.any(Function)
    );
  });

  it('should unregister event listeners on destroy', () => {
    economyManager.destroy();
    expect(mockEventBus.off).toHaveBeenCalledWith(Events.ENEMY_DESTROYED, expect.any(Function));
    expect(mockEventBus.off).toHaveBeenCalledWith(
      Events.POWERUP_EFFECT_APPLIED,
      expect.any(Function)
    );
    expect(mockEventBus.off).toHaveBeenCalledWith(
      Events.POWERUP_EFFECT_REMOVED,
      expect.any(Function)
    );
    expect(logger.log).toHaveBeenCalledWith('EconomyManager destroyed and listeners removed');
  });

  // TODO: Add tests for handleEnemyDestroyed (requires simulating event emission)
  // TODO: Add tests for handlePowerupEffectApplied/Removed (requires simulating event emission)
});
