import { describe, it, expect, beforeEach, vi, Mocked } from 'vitest';
import { PowerupManager } from '../../../src/core/managers/PowerupManager'; // Named import
import { EventBus } from '../../../src/core/events/EventBus';
import { Logger } from '../../../src/core/utils/Logger'; // Logger is used
import ConfigLoader from '../../../src/core/config/ConfigLoader';
import { PowerupsConfig, PowerupConfig } from '../../../src/core/config/schemas/powerupSchema';
import * as Events from '../../../src/core/constants/events';
// Import PowerupManager event data types
import {
  RequestSpawnPowerupData,
  PowerupCollectedData,
} from '../../../src/core/managers/PowerupManager';

// Mocks
vi.mock('../../../src/core/events/EventBus');
vi.mock('../../../src/core/utils/Logger');
vi.mock('../../../src/core/config/ConfigLoader', () => ({
  default: {
    getPowerupsConfig: vi.fn(),
  },
}));

const mockEventBus = new EventBus() as Mocked<EventBus>;
// Lines 19-25 (duplicate mock and declaration) removed
const mockLogger = new Logger() as Mocked<Logger>; // Reinstate mockLogger
const mockConfigLoader = ConfigLoader as Mocked<typeof ConfigLoader>;

// Mock Config Data - Use 'effect' and 'visual'
const mockShieldPowerup: PowerupConfig = {
  id: 'shield',
  name: 'Shield',
  effect: 'temporary_invulnerability', // Use 'effect'
  durationMs: 5000,
  dropChance: 0.1,
  visual: 'shield_icon', // Use 'visual'
  // soundKey: 'powerup_get_shield', // soundKey not in schema
};

const mockRapidFirePowerup: PowerupConfig = {
  id: 'rapid_fire',
  name: 'Rapid Fire',
  effect: 'weapon_cooldown_reduction', // Use 'effect'
  durationMs: 8000,
  multiplier: 0.5,
  dropChance: 0.1,
  visual: 'rapid_fire_icon', // Use 'visual'
  // soundKey: 'powerup_get_rapid',
};

const mockCashBoostPowerup: PowerupConfig = {
  id: 'cash_boost',
  name: 'Cash Boost',
  effect: 'currency_multiplier', // Use 'effect'
  durationMs: 10000,
  multiplier: 2,
  dropChance: 0.05,
  visual: 'cash_boost_icon', // Use 'visual'
  // soundKey: 'powerup_get_cash',
};

const mockPowerupsConfig: PowerupsConfig = [
  // Config is an array
  mockShieldPowerup,
  mockRapidFirePowerup,
  mockCashBoostPowerup,
];

describe('PowerupManager', () => {
  let powerupManager: PowerupManager;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the config loader getter to return the array
    // Note: PowerupManager constructor expects the config array directly
    // mockConfigLoader.getPowerupsConfig.mockReturnValue(mockPowerupsConfig);
    // Use correct constructor signature
    powerupManager = new PowerupManager(mockEventBus, mockLogger, mockPowerupsConfig);
    powerupManager.init(); // Call init to register listeners
  });

  it('should initialize correctly and load configs', () => {
    expect(powerupManager).toBeDefined();
    // Constructor receives config directly, no need to mock/check loader getter call
    // expect(mockConfigLoader.getPowerupsConfig).toHaveBeenCalled();
    expect(mockEventBus.on).toHaveBeenCalledWith(
      Events.REQUEST_SPAWN_POWERUP,
      expect.any(Function)
    );
    expect(mockEventBus.on).toHaveBeenCalledWith(Events.POWERUP_COLLECTED, expect.any(Function));
    // Add more listener checks if PowerupManager listens to other events initially
  });

  it('should handle REQUEST_SPAWN_POWERUP and emit POWERUP_SPAWNED', () => {
    // Request data might need enemyId based on interface
    const requestData: RequestSpawnPowerupData = { x: 100, y: 200, enemyId: 'enemy-1' }; // Use imported type
    const spawnHandler = mockEventBus.on.mock.calls.find(
      (call: [string, (data: RequestSpawnPowerupData) => void]) =>
        call[0] === Events.REQUEST_SPAWN_POWERUP
    )?.[1];

    expect(spawnHandler).toBeDefined();
    if (!spawnHandler) return;

    // Mock Math.random to control which powerup is selected (select shield)
    vi.spyOn(Math, 'random').mockReturnValue(0); // Index 0 = shield

    spawnHandler(requestData);

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      Events.POWERUP_SPAWNED,
      expect.objectContaining({
        configId: mockShieldPowerup.id,
        x: requestData.x,
        y: requestData.y,
        visual: mockShieldPowerup.visual, // Check 'visual'
        instanceId: expect.any(Number), // Instance ID is generated internally (number)
      })
    );

    vi.spyOn(Math, 'random').mockRestore(); // Restore Math.random
  });

  it('should handle POWERUP_COLLECTED, emit POWERUP_EFFECT_APPLIED, and start timer', () => {
    // Simulate spawning a powerup to get an instance ID
    const instanceId = 0; // Assuming first ID is 0
    // Manually add to internal state for testing collection
    // Note: PowerupManager uses instanceId (number) as key for spawnedPowerups
    powerupManager['spawnedPowerups'].set(instanceId, {
      instanceId: instanceId,
      config: mockRapidFirePowerup,
      x: 100,
      y: 100, // Position doesn't matter for collection logic
    });

    const collectData: PowerupCollectedData = { instanceId: instanceId }; // Use imported type
    const collectHandler = mockEventBus.on.mock.calls.find(
      (call: [string, (data: PowerupCollectedData) => void]) => call[0] === Events.POWERUP_COLLECTED
    )?.[1];

    expect(collectHandler).toBeDefined();
    if (!collectHandler) return;

    collectHandler(collectData);

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      Events.POWERUP_EFFECT_APPLIED,
      expect.objectContaining({
        // instanceId is NOT part of PowerupEffectData
        configId: mockRapidFirePowerup.id,
        effect: mockRapidFirePowerup.effect, // Check 'effect'
        durationMs: mockRapidFirePowerup.durationMs,
        multiplier: mockRapidFirePowerup.multiplier,
      })
    );

    // Check internal state
    // Note: PowerupManager uses effect type (string) as key for activeEffects
    const effectType = mockRapidFirePowerup.effect;
    expect(powerupManager['activeEffects'].has(effectType)).toBe(true);
    const effectState = powerupManager['activeEffects'].get(effectType);
    expect(effectState?.config).toEqual(mockRapidFirePowerup);
    expect(effectState?.timer).toBe(mockRapidFirePowerup.durationMs); // Check 'timer' property
  });

  it('should update timers and emit POWERUP_EFFECT_REMOVED and POWERUP_EXPIRED when duration ends', () => {
    // Simulate spawning and collecting a powerup
    const instanceId = 0;
    powerupManager['spawnedPowerups'].set(instanceId, {
      instanceId: instanceId,
      config: mockShieldPowerup,
      x: 100,
      y: 100,
    });
    const collectData: PowerupCollectedData = { instanceId: instanceId }; // Use imported type
    const collectHandler = mockEventBus.on.mock.calls.find(
      (call: [string, (data: PowerupCollectedData) => void]) => call[0] === Events.POWERUP_COLLECTED
    )?.[1];
    if (collectHandler) collectHandler(collectData);

    const effectType = mockShieldPowerup.effect;
    expect(powerupManager['activeEffects'].has(effectType)).toBe(true);

    // Simulate time passing (slightly less than duration)
    powerupManager.update(mockShieldPowerup.durationMs - 100);
    expect(powerupManager['activeEffects'].has(effectType)).toBe(true);
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(
      Events.POWERUP_EFFECT_REMOVED,
      expect.anything()
    );
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(Events.POWERUP_EXPIRED, expect.anything());

    // Simulate time passing past the duration
    powerupManager.update(110); // Pass the remaining duration + extra
    expect(powerupManager['activeEffects'].has(effectType)).toBe(false); // Effect should be removed
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      Events.POWERUP_EFFECT_REMOVED,
      expect.objectContaining({
        // instanceId is NOT part of PowerupEffectData
        configId: mockShieldPowerup.id,
        effect: mockShieldPowerup.effect, // Check 'effect'
        durationMs: mockShieldPowerup.durationMs,
        // multiplier is undefined for shield
      })
    );
    // POWERUP_EXPIRED payload only contains configId
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.POWERUP_EXPIRED, {
      configId: mockShieldPowerup.id,
    });
  });

  it('should clean up listeners on destroy', () => {
    powerupManager.destroy();
    expect(mockEventBus.off).toHaveBeenCalledWith(
      Events.REQUEST_SPAWN_POWERUP,
      expect.any(Function)
    );
    expect(mockEventBus.off).toHaveBeenCalledWith(Events.POWERUP_COLLECTED, expect.any(Function));
    // Add more listener checks if needed
  });

  // Add more tests:
  // - Test random selection logic more thoroughly if multiple powerups have same drop chance
  // - Test case where drop chance is not met in handleRequestSpawnPowerup (requires mocking enemy event handler?)
  // - Test handling collection of non-existent powerup ID
  // - Test interaction with multiple active powerups (effect timer reset)
});
