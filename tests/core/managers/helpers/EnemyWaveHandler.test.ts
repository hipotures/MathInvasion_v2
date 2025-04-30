import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'; // Removed unused Mock
import { EnemyWaveHandler } from '../../../../src/core/managers/helpers/EnemyWaveHandler';
import { EventBus } from '../../../../src/core/events/EventBus';
import { Logger } from '../../../../src/core/utils/Logger';
import { DifficultyConfig } from '../../../../src/core/config/schemas/difficultySchema';
import { EnemyManager } from '../../../../src/core/managers/EnemyManager'; // Import type
import * as Events from '../../../../src/core/constants/events';

// --- Mocks ---

// Mock Logger
const mockLoggerLog = vi.fn();
const mockLoggerDebug = vi.fn();
const mockLoggerWarn = vi.fn();
vi.mock('../../../../src/core/utils/Logger', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    log: mockLoggerLog,
    debug: mockLoggerDebug,
    warn: mockLoggerWarn,
    error: vi.fn(),
  })),
  default: {
    // Also mock the singleton instance if used directly elsewhere
    log: mockLoggerLog,
    debug: mockLoggerDebug,
    warn: mockLoggerWarn,
    error: vi.fn(),
  },
}));

// Mock EventBus
const mockEventBusEmit = vi.fn();
vi.mock('../../../../src/core/events/EventBus', () => ({
  EventBus: vi.fn().mockImplementation(() => ({
    emit: mockEventBusEmit,
    on: vi.fn(),
    off: vi.fn(),
    cleanup: vi.fn(),
  })),
  default: {
    // Also mock the singleton instance
    emit: mockEventBusEmit,
    on: vi.fn(),
    off: vi.fn(),
    cleanup: vi.fn(),
  },
}));

// Mock EnemyManager (only the methods called by EnemyWaveHandler)
const mockEnemyManagerSpawnEnemy = vi.fn();
vi.mock('../../../../src/core/managers/EnemyManager', () => ({
  EnemyManager: vi.fn().mockImplementation(() => ({
    spawnEnemy: mockEnemyManagerSpawnEnemy,
    // Add other methods if needed by future tests
  })),
}));

// Mock setTimeout/clearTimeout for wave delay testing
vi.useFakeTimers();

// --- Test Suite ---

describe('EnemyWaveHandler', () => {
  let handler: EnemyWaveHandler;
  let mockEnemyManager: EnemyManager;
  let mockDifficultyConfig: DifficultyConfig;
  let mockEventBus: EventBus;
  let mockLogger: Logger;

  // Default mock config
  const getDefaultMockConfig = (): DifficultyConfig => ({
    initialWaveNumber: 1,
    initialEnemyTypes: ['triangle'],
    waveEnemyTypeUnlock: {
      '3': 'square',
      '5': 'pentagon',
    },
    enemyHealthMultiplierPerWave: 1.1,
    enemySpeedMultiplierPerWave: 1.05,
    enemyRewardMultiplierPerWave: 1.02,
    enemyCountMultiplierPerWave: 1.2, // Example
    timeBetweenWavesSec: 5,
    bossWaveFrequency: 10,
    bossId: 'boss_triangle',
    spawnPattern: 'standard_grid', // Added missing property
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers(); // Clear any pending timers

    mockDifficultyConfig = getDefaultMockConfig();
    mockEventBus = new EventBus(); // Uses mocked constructor
    mockLogger = new Logger(); // Uses mocked constructor
    // Instantiate mocked EnemyManager without explicit 'any'
    // The mock factory handles the implementation details
    const EnemyManagerMock = vi.mocked(EnemyManager);
    mockEnemyManager = new EnemyManagerMock();

    handler = new EnemyWaveHandler(
      mockEnemyManager,
      mockDifficultyConfig,
      mockEventBus,
      mockLogger
    );
  });

  afterEach(() => {
    handler.destroy(); // Cleanup timers
  });

  it('should initialize with wave number from config minus 1', () => {
    expect(handler.getCurrentWave()).toBe(0); // initialWaveNumber: 1 -> starts at 0
    expect(mockLoggerLog).toHaveBeenCalledWith('EnemyWaveHandler initialized');
  });

  describe('start', () => {
    it('should advance to the initial wave', () => {
      handler.start();
      expect(handler.getCurrentWave()).toBe(1);
      expect(mockLoggerLog).toHaveBeenCalledWith('EnemyWaveHandler starting wave progression...');
      expect(mockLoggerLog).toHaveBeenCalledWith('Advanced to Wave 1');
      expect(mockEventBusEmit).toHaveBeenCalledWith(Events.WAVE_UPDATED, { waveNumber: 1 });
      expect(mockEnemyManagerSpawnEnemy).toHaveBeenCalled(); // Wave 1 should spawn enemies
    });
  });

  describe('Scaling Calculations', () => {
    beforeEach(() => {
      // Advance to wave 3 for testing multipliers
      handler.start(); // Wave 1
      handler.handleEnemyDestroyedInWave('e1'); // Clear wave 1 (assuming 1 enemy for simplicity)
      vi.advanceTimersByTime(mockDifficultyConfig.timeBetweenWavesSec * 1000); // Wave 2
      handler.handleEnemyDestroyedInWave('e2');
      vi.advanceTimersByTime(mockDifficultyConfig.timeBetweenWavesSec * 1000); // Wave 3
      expect(handler.getCurrentWave()).toBe(3);
    });

    it('should calculate scaled health correctly', () => {
      // Wave 3, initial wave 1. Multiplier applies twice (wave 2, wave 3)
      // 100 * 1.1^2 = 100 * 1.21 = 121
      expect(handler.getScaledHealth(100)).toBe(121);
    });

    it('should calculate scaled speed multiplier correctly', () => {
      // 1 * 1.05^2 = 1 * 1.1025 = 1.1025
      expect(handler.getScaledSpeedMultiplier()).toBeCloseTo(1.1025);
    });

    it('should calculate scaled reward correctly', () => {
      // 10 * 1.02^2 = 10 * 1.0404 = 10.404 -> 10 (rounded)
      expect(handler.getScaledReward(10)).toBe(10);
      // 50 * 1.02^2 = 50 * 1.0404 = 52.02 -> 52 (rounded)
      expect(handler.getScaledReward(50)).toBe(52);
    });
  });

  describe('Wave Spawning', () => {
    it('should spawn initial enemy types on wave 1', () => {
      handler.start(); // Wave 1
      expect(handler.getCurrentWave()).toBe(1);
      // Expect spawnEnemy to be called multiple times (grid) with 'triangle'
      expect(mockEnemyManagerSpawnEnemy).toHaveBeenCalledWith('triangle', expect.any(Object));
      // Check it wasn't called with types not yet unlocked
      expect(mockEnemyManagerSpawnEnemy).not.toHaveBeenCalledWith('square', expect.any(Object));
      expect(mockEnemyManagerSpawnEnemy).not.toHaveBeenCalledWith('pentagon', expect.any(Object));
    });

    it('should unlock and spawn new enemy types based on config', () => {
      handler.start(); // Wave 1
      handler.handleEnemyDestroyedInWave('e1');
      vi.advanceTimersByTime(mockDifficultyConfig.timeBetweenWavesSec * 1000); // Wave 2
      handler.handleEnemyDestroyedInWave('e2');
      vi.advanceTimersByTime(mockDifficultyConfig.timeBetweenWavesSec * 1000); // Wave 3

      expect(handler.getCurrentWave()).toBe(3);
      // Spawning happens automatically on advanceWave, no need to call spawnWave directly
      // Check the calls made during the last advanceWave (which triggered wave 3 spawn)
      expect(mockEnemyManagerSpawnEnemy).toHaveBeenCalledWith('triangle', expect.any(Object));
      expect(mockEnemyManagerSpawnEnemy).toHaveBeenCalledWith('square', expect.any(Object));
      expect(mockEnemyManagerSpawnEnemy).not.toHaveBeenCalledWith('pentagon', expect.any(Object));
    });

    it('should spawn boss on boss wave frequency', () => {
      mockDifficultyConfig.bossWaveFrequency = 3; // Set boss freq to 3 for testing
      handler = new EnemyWaveHandler(
        mockEnemyManager,
        mockDifficultyConfig,
        mockEventBus,
        mockLogger
      ); // Re-init

      handler.start(); // Wave 1
      handler.handleEnemyDestroyedInWave('e1');
      vi.advanceTimersByTime(mockDifficultyConfig.timeBetweenWavesSec * 1000); // Wave 2
      handler.handleEnemyDestroyedInWave('e2');
      vi.advanceTimersByTime(mockDifficultyConfig.timeBetweenWavesSec * 1000); // Wave 3 (Boss Wave)

      expect(handler.getCurrentWave()).toBe(3);
      // Spawning happens automatically on advanceWave
      // Check the calls made during the last advanceWave (which triggered wave 3 spawn)
      expect(mockEnemyManagerSpawnEnemy).toHaveBeenCalledWith(
        mockDifficultyConfig.bossId,
        expect.any(Object)
      );
      expect(mockEnemyManagerSpawnEnemy).toHaveBeenCalledTimes(1); // Only boss should spawn
    });

    it('should spawn enemies in a grid pattern for regular waves', () => {
      handler.start(); // Wave 1, triggers spawn automatically

      // Default grid is 8x3 = 24 enemies
      // Check the calls made during start()
      expect(mockEnemyManagerSpawnEnemy).toHaveBeenCalledTimes(24);
      // Check a few spawn positions based on grid logic (approximate)
      expect(mockEnemyManagerSpawnEnemy).toHaveBeenCalledWith('triangle', {
        x: expect.any(Number),
        y: 100,
      }); // First row
      expect(mockEnemyManagerSpawnEnemy).toHaveBeenCalledWith('triangle', {
        x: expect.any(Number),
        y: 150,
      }); // Second row
      expect(mockEnemyManagerSpawnEnemy).toHaveBeenCalledWith('triangle', {
        x: expect.any(Number),
        y: 200,
      }); // Third row
    });
  });

  describe('Wave Clearing and Advancement', () => {
    it('should not advance wave if enemies remain', () => {
      handler.start(); // Wave 1, spawns enemies
      handler.trackEnemyInWave('enemy1'); // Simulate manager tracking
      handler.trackEnemyInWave('enemy2');

      handler.handleEnemyDestroyedInWave('enemy1'); // Destroy one

      // Should not have scheduled next wave yet
      expect(vi.getTimerCount()).toBe(0);
      expect(handler.getCurrentWave()).toBe(1);
    });

    it('should schedule next wave advancement after delay when last enemy is destroyed', () => {
      handler.start(); // Wave 1
      handler.trackEnemyInWave('enemy1');
      handler.trackEnemyInWave('enemy2');

      handler.handleEnemyDestroyedInWave('enemy1');
      handler.handleEnemyDestroyedInWave('enemy2'); // Last enemy destroyed

      expect(handler.getCurrentWave()).toBe(1); // Still wave 1
      expect(vi.getTimerCount()).toBe(1); // Timer scheduled

      // Advance time
      vi.advanceTimersByTime(mockDifficultyConfig.timeBetweenWavesSec * 1000);

      expect(handler.getCurrentWave()).toBe(2); // Advanced to wave 2
      expect(mockEventBusEmit).toHaveBeenCalledWith(Events.WAVE_UPDATED, { waveNumber: 2 });
      expect(mockEnemyManagerSpawnEnemy).toHaveBeenCalled(); // Wave 2 spawned
    });

    it('should clear existing timer if advanceWave is called manually', () => {
      handler.start(); // Wave 1
      handler.trackEnemyInWave('enemy1');
      handler.handleEnemyDestroyedInWave('enemy1'); // Last enemy, timer starts

      expect(vi.getTimerCount()).toBe(1);

      handler.advanceWave(); // Manually advance before timer finishes

      expect(vi.getTimerCount()).toBe(0); // Timer should be cleared
      expect(handler.getCurrentWave()).toBe(2); // Advanced manually
    });
  });

  it('should clear timers on destroy', () => {
    handler.start();
    handler.trackEnemyInWave('enemy1');
    handler.handleEnemyDestroyedInWave('enemy1'); // Schedule timer
    expect(vi.getTimerCount()).toBe(1);

    handler.destroy();

    expect(vi.getTimerCount()).toBe(0); // Timer cleared
    expect(mockLoggerLog).toHaveBeenCalledWith('EnemyWaveHandler destroyed');
  });
});
