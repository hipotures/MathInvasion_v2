import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnemyManager } from '../../../src/core/managers/EnemyManager';
import { EventBus } from '../../../src/core/events/EventBus';
import { Logger } from '../../../src/core/utils/Logger';
import ConfigLoader from '../../../src/core/config/ConfigLoader';
import { EnemyWaveHandler } from '../../../src/core/managers/helpers/EnemyWaveHandler';
import { EnemiesConfig, EnemyConfig } from '../../../src/core/config/schemas/enemySchema';
import { DifficultyConfig } from '../../../src/core/config/schemas/difficultySchema';
import * as Events from '../../../src/core/constants/events';

// Mock dependencies
vi.mock('../../../src/core/events/EventBus');
vi.mock('../../../src/core/utils/Logger');
vi.mock('../../../src/core/config/ConfigLoader');
vi.mock('../../../src/core/managers/helpers/EnemyWaveHandler');

// Mock Config Data
const mockEnemyConfig1: EnemyConfig = {
    id: 'triangle_scout',
    // name: 'Triangle Scout', // Removed name, not in schema
    shape: 'triangle', // Added shape based on schema
    // visual: 'enemy_small_alien', // Removed visual, not in schema
    baseHealth: 50,
    baseReward: 10,
    scoreValue: 100,
    collisionDamage: 20,
    movementPattern: 'invader_standard',
    baseSpeed: 50,
    collisionRadius: 15, // Added required property
    canShoot: true, // Added required property
    shootConfig: { projectileType: 'enemy_bullet', cooldownMs: 2000 }, // Corrected property name
    abilities: [],
};
const mockEnemyConfig2: EnemyConfig = {
    id: 'square_tank',
    // name: 'Square Tank', // Removed name
    shape: 'square', // Added shape
    // visual: 'enemy_medium_alien', // Removed visual, not in schema
    baseHealth: 150,
    baseReward: 25,
    scoreValue: 250,
    collisionDamage: 30,
    movementPattern: 'invader_standard',
    baseSpeed: 30,
    collisionRadius: 25, // Added required property
    canShoot: true, // Added required property
    shootConfig: { projectileType: 'enemy_bullet_fast', cooldownMs: 1500 }, // Corrected property name
    abilities: [],
};
const mockEnemiesConfig: EnemiesConfig = [mockEnemyConfig1, mockEnemyConfig2];

const mockDifficultyConfig: DifficultyConfig = {
    initialWaveNumber: 1,
    timeBetweenWavesSec: 5,
    enemyCountMultiplierPerWave: 1.1,
    enemyHealthMultiplierPerWave: 1.05,
    enemySpeedMultiplierPerWave: 1.02,
    enemyRewardMultiplierPerWave: 1.03,
    bossWaveFrequency: 10,
    bossId: 'circle_boss', // Assuming a boss config exists elsewhere
    initialEnemyTypes: ['triangle_scout'], // Added initial types based on schema
    waveEnemyTypeUnlock: { // Corrected structure: Record<string, string>
        "3": 'square_tank', // Unlock square_tank at wave 3
        // Add more unlocks as needed, e.g., "5": 'another_enemy'
    },
    spawnPattern: 'standard_grid', // Added required property
};

describe('EnemyManager', () => {
    let enemyManager: EnemyManager;
    let mockEventBus: EventBus;
    let mockLogger: Logger;
    let mockWaveHandlerInstance: EnemyWaveHandler;

    // Spies
    let emitSpy: ReturnType<typeof vi.spyOn>;
    let onSpy: ReturnType<typeof vi.spyOn>;
    let offSpy: ReturnType<typeof vi.spyOn>;
    // Define mock functions for handler methods *before* beforeEach
    const mockStartFn = vi.fn();
    const mockDestroyFn = vi.fn();
    const mockGetScaledHealthFn = vi.fn().mockImplementation(base => base * 1.1);
    const mockGetScaledSpeedMultiplierFn = vi.fn().mockReturnValue(1.0);
    const mockGetScaledRewardFn = vi.fn().mockImplementation(base => base * 1.2);
    const mockTrackEnemyInWaveFn = vi.fn();
    const mockHandleEnemyDestroyedInWaveFn = vi.fn();
    const mockGetCurrentWaveFn = vi.fn().mockReturnValue(5);

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock ConfigLoader return values
        vi.mocked(ConfigLoader.getEnemiesConfig).mockReturnValue(mockEnemiesConfig);
        vi.mocked(ConfigLoader.getDifficultyConfig).mockReturnValue(mockDifficultyConfig);

        mockEventBus = new EventBus();
        mockLogger = new Logger();

        // Setup spies on mocks
        emitSpy = vi.spyOn(mockEventBus, 'emit');
        onSpy = vi.spyOn(mockEventBus, 'on');
        offSpy = vi.spyOn(mockEventBus, 'off');
        vi.spyOn(mockLogger, 'log');
        vi.spyOn(mockLogger, 'debug');
        vi.spyOn(mockLogger, 'warn');
        vi.spyOn(mockLogger, 'error');

        // Configure the mock implementation *before* EnemyManager instantiates it
        vi.mocked(EnemyWaveHandler).mockImplementation(() => {
            return {
                start: mockStartFn,
                getScaledHealth: mockGetScaledHealthFn,
                getScaledSpeedMultiplier: mockGetScaledSpeedMultiplierFn,
                getScaledReward: mockGetScaledRewardFn,
                trackEnemyInWave: mockTrackEnemyInWaveFn,
                handleEnemyDestroyedInWave: mockHandleEnemyDestroyedInWaveFn,
                getCurrentWave: mockGetCurrentWaveFn,
                destroy: mockDestroyFn,
            } as unknown as EnemyWaveHandler; // Cast to satisfy type checker
        });

        // Instantiate the manager (this will now use the mocked implementation above)
        enemyManager = new EnemyManager(mockEventBus, mockLogger);

        // Get the instance for verification if needed (optional, as we check the mock fns directly)
        mockWaveHandlerInstance = vi.mocked(EnemyWaveHandler).mock.instances[0];
        if (!mockWaveHandlerInstance) {
             throw new Error("Mock EnemyWaveHandler instance not created");
         }

    });

    afterEach(() => {
        enemyManager.destroy();
    });

    it('should initialize, load configs, register listeners, and start wave handler', () => {
        expect(enemyManager).toBeDefined();
        expect(ConfigLoader.getEnemiesConfig).toHaveBeenCalledTimes(1);
        expect(ConfigLoader.getDifficultyConfig).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith('EnemyManager initialized');
        expect(onSpy).toHaveBeenCalledWith(Events.PROJECTILE_HIT_ENEMY, expect.any(Function));
        // Check that the handler was instantiated and its start method called
        expect(EnemyWaveHandler).toHaveBeenCalledTimes(1);
        expect(EnemyWaveHandler).toHaveBeenCalledWith(enemyManager, mockDifficultyConfig, mockEventBus, mockLogger);
        // Check the mock function directly
        expect(mockStartFn).toHaveBeenCalledTimes(1);
    });

    it('should spawn an enemy, call wave handler methods, and emit ENEMY_SPAWNED', () => {
        const position = { x: 100, y: 50 };
        const configId = 'triangle_scout';
        const expectedScaledHealth = 50 * 1.1; // Based on mockWaveHandlerInstance mock
        const expectedSpeedMultiplier = 1.0; // Based on mockWaveHandlerInstance mock

        enemyManager.spawnEnemy(configId, position);

        // Check wave handler mock function calls
        expect(mockGetScaledHealthFn).toHaveBeenCalledWith(mockEnemyConfig1.baseHealth);
        expect(mockGetScaledSpeedMultiplierFn).toHaveBeenCalledTimes(1);
        expect(mockTrackEnemyInWaveFn).toHaveBeenCalledWith(expect.stringContaining('enemy-'));

        // Check event emission
        expect(emitSpy).toHaveBeenCalledWith(Events.ENEMY_SPAWNED, expect.objectContaining({
            instanceId: expect.stringContaining('enemy-'),
            config: mockEnemyConfig1,
            position: position,
            initialHealth: expectedScaledHealth,
            maxHealth: expectedScaledHealth,
            speedMultiplier: expectedSpeedMultiplier,
        }));

        // Check logger - Use regex for more robust matching of the dynamic message
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringMatching(/^Spawning enemy: triangle_scout \(Instance ID: enemy-\d+\) at \(\d+, \d+\) with [\d.]+ health \(Speed x[\d.]+\)$/));
    });

     it('should handle PROJECTILE_HIT_ENEMY event, apply damage, and emit ENEMY_HEALTH_UPDATED', () => {
        // 1. Spawn an enemy
        const position = { x: 100, y: 50 };
        const configId = 'square_tank';
        enemyManager.spawnEnemy(configId, position);
        const spawnedCall = emitSpy.mock.calls.find(call => call[0] === Events.ENEMY_SPAWNED);
        const instanceId = (spawnedCall?.[1] as any)?.instanceId; // Get instance ID
        expect(instanceId).toBeDefined();
        emitSpy.mockClear(); // Clear emit spy after setup

        // 2. Find and call the PROJECTILE_HIT_ENEMY listener
        const hitListener = onSpy.mock.calls.find(call => call[0] === Events.PROJECTILE_HIT_ENEMY)?.[1];
        expect(hitListener).toBeDefined();
        const hitData = { projectileId: 'proj-1', enemyInstanceId: instanceId, damage: 40 };
        // Assert listener type before calling
        (hitListener as Function)(hitData);

        // 3. Verify damage handling
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining(`Enemy ${instanceId} hit by projectile proj-1. Applying 40 damage.`));
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining(`Health: ${150 * 1.1 - 40}`)); // Scaled health - damage

        // 4. Verify ENEMY_HEALTH_UPDATED emitted (since health > 0)
        expect(mockGetScaledHealthFn).toHaveBeenCalledWith(mockEnemyConfig2.baseHealth); // Called again for max health
        expect(emitSpy).toHaveBeenCalledWith(Events.ENEMY_HEALTH_UPDATED, {
            instanceId: instanceId,
            currentHealth: 150 * 1.1 - 40,
            maxHealth: 150 * 1.1, // Scaled max health
        });
        expect(emitSpy).not.toHaveBeenCalledWith(Events.ENEMY_DESTROYED, expect.anything()); // Should not be destroyed yet
    });

    it('should handle PROJECTILE_HIT_ENEMY event and trigger destroyEnemy if health drops to zero or below', () => {
        // 1. Spawn an enemy
        const position = { x: 100, y: 50 };
        const configId = 'triangle_scout'; // 50 base health -> 55 scaled health
        enemyManager.spawnEnemy(configId, position);
        const spawnedCall = emitSpy.mock.calls.find(call => call[0] === Events.ENEMY_SPAWNED);
        const instanceId = (spawnedCall?.[1] as any)?.instanceId;
        expect(instanceId).toBeDefined();
        emitSpy.mockClear();

        // 2. Find and call the PROJECTILE_HIT_ENEMY listener with lethal damage
        const hitListener = onSpy.mock.calls.find(call => call[0] === Events.PROJECTILE_HIT_ENEMY)?.[1];
        expect(hitListener).toBeDefined();
        const hitData = { projectileId: 'proj-1', enemyInstanceId: instanceId, damage: 60 }; // More than scaled health
        // Assert listener type before calling
        (hitListener as Function)(hitData);

        // 3. Verify destroy logic was triggered
        // Check logger debug message for health calculation (allow for floating point inaccuracies)
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringMatching(/Enemy enemy-\d+ took \d+ damage\. Health: -?\d+(\.\d+)?/));
        expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining(`Destroyed enemy: ${configId}`));

        // 4. Verify ENEMY_DESTROYED emitted
        expect(mockGetScaledRewardFn).toHaveBeenCalledWith(mockEnemyConfig1.baseReward);
        expect(emitSpy).toHaveBeenCalledWith(Events.ENEMY_DESTROYED, expect.objectContaining({
            instanceId: instanceId,
            configId: configId,
            reward: 10 * 1.2, // Scaled reward based on mock
            scoreValue: mockEnemyConfig1.scoreValue,
            config: mockEnemyConfig1,
        }));
        expect(mockHandleEnemyDestroyedInWaveFn).toHaveBeenCalledWith(instanceId);
        expect(emitSpy).not.toHaveBeenCalledWith(Events.ENEMY_HEALTH_UPDATED, expect.anything()); // Should not emit health update on destroy
    });

    it('should get current wave from wave handler', () => {
        const wave = enemyManager.getCurrentWave();
        expect(wave).toBe(5); // Value from mock function
        expect(mockGetCurrentWaveFn).toHaveBeenCalledTimes(1);
    });

    it('should unregister listeners and destroy wave handler on destroy', () => {
        // Need to capture the actual listener function passed to 'on'
        let capturedListener: Function | undefined;
         vi.spyOn(mockEventBus, 'on').mockImplementation((eventName, listener) => {
            if (eventName === Events.PROJECTILE_HIT_ENEMY) {
                capturedListener = listener;
            }
            return mockEventBus;
        });
        // Re-initialize to capture listener with the new spy implementation
        enemyManager = new EnemyManager(mockEventBus, mockLogger);
        expect(capturedListener).toBeDefined(); // Make sure listener was captured

        enemyManager.destroy();

        expect(offSpy).toHaveBeenCalledWith(Events.PROJECTILE_HIT_ENEMY, capturedListener);
        // Check the mock function directly
        expect(mockDestroyFn).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith('EnemyManager destroyed, listeners and timers removed');
    });

});