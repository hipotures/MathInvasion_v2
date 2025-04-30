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

describe('EnemyManager: Damage & Destruction', () => {
  let enemyManager: EnemyManager;
  let mockWaveHandlerInstance: Mocked<EnemyWaveHandler>;
  let hitHandler: ((data: ProjectileHitEnemyData) => void) | undefined;
  let actualEnemyId: string;
  const configId = 'square_tank';
  const initialX = 200,
    initialY = 100;

  beforeEach(() => {
    vi.clearAllMocks();
    MockEnemyWaveHandlerFn.mockClear();

    mockConfigLoader.getEnemiesConfig.mockReturnValue(mockEnemiesConfig);
    mockConfigLoader.getDifficultyConfig.mockReturnValue(mockDifficultyConfig);

    enemyManager = new EnemyManager(mockEventBus, mockLogger);
    mockWaveHandlerInstance = MockEnemyWaveHandlerFn.mock.instances[0] as Mocked<EnemyWaveHandler>;

    // Default mocks for helper methods
    mockWaveHandlerInstance.getScaledHealth.mockReturnValue(50); // Use base health for simplicity unless overridden
    mockWaveHandlerInstance.getScaledSpeedMultiplier.mockReturnValue(1);
    mockWaveHandlerInstance.getScaledReward.mockReturnValue(15); // Use base reward for simplicity unless overridden

    // Spawn an enemy for damage/destruction tests
    enemyManager.spawnEnemy(configId, { x: initialX, y: initialY });
    actualEnemyId = `enemy-${enemyManager['nextInstanceId'] - 1}`;
    hitHandler = findListener<ProjectileHitEnemyData>(Events.PROJECTILE_HIT_ENEMY);
    expect(hitHandler).toBeDefined(); // Ensure listener was found
  });

  it('should handle PROJECTILE_HIT_ENEMY, apply damage, and emit ENEMY_HEALTH_UPDATED', () => {
    const initialHealth = enemyManager['enemies'].get(actualEnemyId)?.health ?? 0;
    const scaledMaxHealth = 60;
    mockWaveHandlerInstance.getScaledHealth.mockReturnValue(scaledMaxHealth); // Override for this test

    const hitData: ProjectileHitEnemyData = {
      projectileId: 'proj_1',
      enemyInstanceId: actualEnemyId,
      damage: 10,
    };
    if (hitHandler) hitHandler(hitData);

    const enemyState = enemyManager['enemies'].get(actualEnemyId);
    expect(enemyState?.health).toBe(initialHealth - hitData.damage);

    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.ENEMY_HEALTH_UPDATED, {
      instanceId: actualEnemyId,
      currentHealth: initialHealth - hitData.damage,
      maxHealth: scaledMaxHealth,
      damageTaken: hitData.damage,
    });
  });

  it('should destroy enemy when health drops to zero or below after PROJECTILE_HIT_ENEMY', () => {
    const initialHealth = enemyManager['enemies'].get(actualEnemyId)?.health ?? 0;
    const scaledReward = 7;
    mockWaveHandlerInstance.getScaledReward.mockReturnValue(scaledReward); // Override for this test

    const hitData: ProjectileHitEnemyData = {
      projectileId: 'proj_2',
      enemyInstanceId: actualEnemyId,
      damage: initialHealth + 5, // Ensure damage exceeds health
    };
    if (hitHandler) hitHandler(hitData);

    expect(enemyManager['enemies'].has(actualEnemyId)).toBe(false);
    expect(mockWaveHandlerInstance.getScaledReward).toHaveBeenCalledWith(mockTankConfig.baseReward); // Verify scaling was based on correct config
    expect(mockWaveHandlerInstance.handleEnemyDestroyedInWave).toHaveBeenCalledWith(actualEnemyId);

    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.ENEMY_DESTROYED, {
      instanceId: actualEnemyId,
      configId: configId,
      reward: scaledReward,
      scoreValue: mockTankConfig.scoreValue, // Use correct config
      config: mockTankConfig, // Use correct config
    });
    // Ensure health update is NOT emitted when destroyed by hit
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(
      Events.ENEMY_HEALTH_UPDATED,
      expect.objectContaining({ instanceId: actualEnemyId })
    );
  });

  it('should destroy enemy when destroyEnemy is called directly', () => {
    const scaledReward = 20;
    mockWaveHandlerInstance.getScaledReward.mockReturnValue(scaledReward); // Override for this test

    expect(enemyManager['enemies'].has(actualEnemyId)).toBe(true);
    enemyManager.destroyEnemy(actualEnemyId);

    expect(enemyManager['enemies'].has(actualEnemyId)).toBe(false);
    expect(mockWaveHandlerInstance.getScaledReward).toHaveBeenCalledWith(mockTankConfig.baseReward);
    expect(mockWaveHandlerInstance.handleEnemyDestroyedInWave).toHaveBeenCalledWith(actualEnemyId);

    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.ENEMY_DESTROYED, {
      instanceId: actualEnemyId,
      configId: configId,
      reward: scaledReward,
      scoreValue: mockTankConfig.scoreValue,
      config: mockTankConfig,
    });
    // Ensure health update is NOT emitted when destroyed directly
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(
      Events.ENEMY_HEALTH_UPDATED,
      expect.objectContaining({ instanceId: actualEnemyId })
    );
  });
});
