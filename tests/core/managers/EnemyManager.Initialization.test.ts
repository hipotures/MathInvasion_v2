import { describe, it, expect, beforeEach, vi, Mocked } from 'vitest';
import { EnemyManager } from '../../../src/core/managers/EnemyManager'; // Correct: Named import
import { EventBus } from '../../../src/core/events/EventBus';
import { Logger } from '../../../src/core/utils/Logger';
import ConfigLoader from '../../../src/core/config/ConfigLoader';
import { EnemiesConfig, EnemyConfig } from '../../../src/core/config/schemas/enemySchema';
import { DifficultyConfig } from '../../../src/core/config/schemas/difficultySchema';
import { EnemyWaveHandler } from '../../../src/core/managers/helpers/EnemyWaveHandler'; // Correct: Named import
import * as Events from '../../../src/core/constants/events';

// Mocks
vi.mock('../../../src/core/events/EventBus');
vi.mock('../../../src/core/utils/Logger');
vi.mock('../../../src/core/config/ConfigLoader', () => ({
  default: {
    getEnemiesConfig: vi.fn(),
    getDifficultyConfig: vi.fn(),
  },
}));

// Mock the helper class
let MockEnemyWaveHandlerFn: ReturnType<typeof vi.fn>;
vi.mock('../../../src/core/managers/helpers/EnemyWaveHandler', () => {
  const MockConstructor = vi.fn();
  MockConstructor.prototype.getScaledHealth = vi.fn();
  MockConstructor.prototype.getScaledSpeedMultiplier = vi.fn();
  MockConstructor.prototype.getScaledReward = vi.fn();
  MockConstructor.prototype.trackEnemyInWave = vi.fn();
  MockConstructor.prototype.handleEnemyDestroyedInWave = vi.fn();
  MockConstructor.prototype.start = vi.fn();
  MockConstructor.prototype.destroy = vi.fn();
  MockConstructor.prototype.getCurrentWave = vi.fn().mockReturnValue(1);
  MockEnemyWaveHandlerFn = MockConstructor;
  return { EnemyWaveHandler: MockConstructor };
});

const mockEventBus = new EventBus() as Mocked<EventBus>;
const mockLogger = new Logger() as Mocked<Logger>;
const mockConfigLoader = ConfigLoader as Mocked<typeof ConfigLoader>;

// Mock Config Data
const mockScoutConfig: EnemyConfig = {
  id: 'triangle_scout',
  shape: 'triangle',
  collisionRadius: 15,
  baseHealth: 10,
  baseSpeed: 100,
  baseReward: 5,
  scoreValue: 10,
  movementPattern: 'invader_standard',
  collisionDamage: 10,
  canShoot: false,
};
const mockTankConfig: EnemyConfig = {
  id: 'square_tank',
  shape: 'square',
  collisionRadius: 25,
  baseHealth: 50,
  baseSpeed: 60,
  baseReward: 15,
  scoreValue: 30,
  movementPattern: 'invader_standard',
  collisionDamage: 20,
  canShoot: false,
};
const mockShooterConfig: EnemyConfig = {
  id: 'diamond_strafer',
  shape: 'diamond',
  collisionRadius: 18,
  baseHealth: 20,
  baseSpeed: 120,
  baseReward: 10,
  scoreValue: 25,
  movementPattern: 'strafe_horizontal',
  collisionDamage: 15,
  canShoot: true,
  shootConfig: { projectileType: 'enemy_bullet_fast', cooldownMs: 1500, damage: 8, speed: 300 },
};
const mockBomberConfig: EnemyConfig = {
  id: 'hexagon_bomber',
  shape: 'hexagon',
  collisionRadius: 22,
  baseHealth: 40,
  baseSpeed: 80,
  baseReward: 20,
  scoreValue: 50,
  movementPattern: 'bomber_dive',
  collisionDamage: 25,
  canShoot: false,
  abilities: [
    {
      type: 'death_bomb',
      projectileType: 'enemy_bomb',
      damage: 50,
      radius: 100,
      timeToExplodeMs: 500,
    },
  ],
};
const mockEnemiesConfig: EnemiesConfig = [
  mockScoutConfig,
  mockTankConfig,
  mockShooterConfig,
  mockBomberConfig,
];
const mockDifficultyConfig: DifficultyConfig = {
  initialWaveNumber: 1,
  timeBetweenWavesSec: 5,
  enemyCountMultiplierPerWave: 1.1,
  enemyHealthMultiplierPerWave: 1.05,
  enemySpeedMultiplierPerWave: 1.02,
  enemyRewardMultiplierPerWave: 1.03,
  bossWaveFrequency: 10,
  bossId: 'circle_boss',
  initialEnemyTypes: ['triangle_scout'],
  waveEnemyTypeUnlock: { '3': 'square_tank', '5': 'diamond_strafer', '7': 'hexagon_bomber' },
  spawnPattern: 'standard_grid',
};

// Local interface for hit data payload
interface ProjectileHitEnemyData {
  projectileId: string;
  enemyInstanceId: string;
  damage: number;
}

// Helper to find the specific listener function attached to the mock EventBus
// Define a more specific function type for the listener
type ListenerFn<T> = (payload: T) => void;
const findListener = <T>(eventName: string): ListenerFn<T> | undefined => {
  const call = mockEventBus.on.mock.calls.find(
    // Use the specific ListenerFn type in the check
    (c: [string, ListenerFn<T>]) => c[0] === eventName
  );
  return call ? call[1] : undefined;
};

describe('EnemyManager: Initialization', () => {
  let enemyManager: EnemyManager;
  let mockWaveHandlerInstance: Mocked<EnemyWaveHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    MockEnemyWaveHandlerFn.mockClear();

    mockConfigLoader.getEnemiesConfig.mockReturnValue(mockEnemiesConfig);
    mockConfigLoader.getDifficultyConfig.mockReturnValue(mockDifficultyConfig);

    enemyManager = new EnemyManager(mockEventBus, mockLogger);
    mockWaveHandlerInstance = MockEnemyWaveHandlerFn.mock.instances[0] as Mocked<EnemyWaveHandler>;

    // Default mocks for helper methods (though not strictly needed for init tests)
    mockWaveHandlerInstance.getScaledHealth.mockReturnValue(10);
    mockWaveHandlerInstance.getScaledSpeedMultiplier.mockReturnValue(1);
    mockWaveHandlerInstance.getScaledReward.mockReturnValue(5);
  });

  it('should initialize correctly, load configs, and create EnemyWaveHandler', () => {
    expect(enemyManager).toBeDefined();
    expect(mockConfigLoader.getEnemiesConfig).toHaveBeenCalled();
    expect(mockConfigLoader.getDifficultyConfig).toHaveBeenCalled();
    expect(MockEnemyWaveHandlerFn).toHaveBeenCalledTimes(1);
    expect(MockEnemyWaveHandlerFn).toHaveBeenCalledWith(
      enemyManager,
      mockDifficultyConfig,
      mockEventBus,
      mockLogger
    );
    expect(enemyManager['waveHandler']).toBe(mockWaveHandlerInstance);
    // Keep expect.any(Function) here as we just check if *a* function was registered
    expect(mockEventBus.on).toHaveBeenCalledWith(Events.PROJECTILE_HIT_ENEMY, expect.any(Function));
  });
});
