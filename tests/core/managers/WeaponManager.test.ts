/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach, Mocked } from 'vitest'; // Add Mocked type import
// Removed duplicate import: import { vi } from 'vitest';
import WeaponManager from '../../../src/core/managers/WeaponManager'; // Default import
import { EventBus } from '../../../src/core/events/EventBus';
import EconomyManager from '../../../src/core/managers/EconomyManager'; // Default import
import { WeaponUpgrader } from '../../../src/core/managers/helpers/WeaponUpgrader'; // Import actual class
import { WeaponPowerupHandler } from '../../../src/core/managers/helpers/WeaponPowerupHandler'; // Import actual class
import {
  WEAPON_SWITCH,
  REQUEST_FIRE_WEAPON,
  REQUEST_WEAPON_UPGRADE,
  WEAPON_STATE_UPDATED,
  FIRE_START,
} from '../../../src/core/constants/events'; // Added FIRE_START
import type { WeaponsConfig, WeaponConfig } from '../../../src/core/config/schemas/weaponSchema';
// import type { PowerupConfig } from '../../../src/core/config/schemas/powerupSchema'; // Unused import (mockRapidFirePowerup removed)
import configLoader from '../../../src/core/config/ConfigLoader'; // Import actual config loader

// --- Mocks ---
vi.mock('../../../src/core/events/EventBus');
// Mock Logger default export specifically
// Mock Logger default export specifically
vi.mock('../../../src/core/utils/Logger', () => ({
  default: {
    // Define mocks directly inside the factory
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    // Removed info: vi.fn(), as it doesn't exist on the actual Logger
  },
}));
vi.mock('../../../src/core/managers/EconomyManager');

// REMOVED vi.mock for helpers

// Mock configLoader if necessary, or use the actual one if simple enough
// vi.mock('../../../src/core/config/ConfigLoader');

const mockEventBus = new EventBus() as Mocked<EventBus>;
// Import the original logger path, the mock should intercept it
import logger from '../../../src/core/utils/Logger';
// We will assert directly on the imported logger object, which is now the mock
const mockEconomyManager = new EconomyManager({} as EventBus, 0, 0) as Mocked<EconomyManager>; // Provide initial currency and score values
// No longer need MockedClass types

// --- Test Data ---
// Note: The schema defines 'upgrade' as a single object, not an array 'upgrades'.
// 'maxLevel' is not part of the schema, likely calculated by the manager.
const mockBulletConfig: WeaponConfig = {
  id: 'bullet',
  name: 'Bullet Gun',
  baseCost: 50, // Added missing property
  baseRange: 300, // Added missing property
  baseCooldownMs: 500,
  baseDamage: 10,
  projectileSpeed: 400,
  projectileType: 'player_bullet',
  upgrade: {
    costMultiplier: 1.5,
    cooldownMultiplier: 0.9,
    damageMultiplier: 1.1,
    projectileSpeedMultiplier: 1.05,
    rangeAdd: 10,
  },
};

const mockLaserConfig: WeaponConfig = {
  id: 'laser',
  name: 'Laser Beam',
  baseCost: 100, // Added missing property
  baseRange: 500, // Added missing property
  baseCooldownMs: 1000,
  baseDamage: 25,
  projectileSpeed: 800,
  projectileType: 'player_laser',
  upgrade: {
    costMultiplier: 1.8,
    cooldownMultiplier: 0.9,
    damageMultiplier: 1.15,
    rangeAdd: 15,
  },
};

// Mock the data structure expected by configLoader.getWeaponsConfig()
const mockWeaponsConfigArray: WeaponsConfig = [mockBulletConfig, mockLaserConfig];
// Mock configLoader if not using the actual one
// vi.mocked(configLoader).getWeaponsConfig.mockReturnValue(mockWeaponsConfigArray);
// If using actual loader, ensure it's configured to load these mocks or test data

// Powerup configuration removed as it's not used in tests

describe('WeaponManager', () => {
  let weaponManager: WeaponManager;
  // Create mock instances of helpers to be injected
  let mockWeaponUpgraderInstance: Mocked<WeaponUpgrader>;
  let mockWeaponPowerupHandlerInstance: Mocked<WeaponPowerupHandler>;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create mock helper instances with mocked methods
    mockWeaponUpgraderInstance = {
      attemptUpgrade: vi.fn().mockReturnValue({
        // Default success mock
        success: true,
        newLevel: 2,
        newCooldown: 450,
        newDamage: 11,
        newProjectileSpeed: 420,
        message: 'Upgraded',
      }),
    } as unknown as Mocked<WeaponUpgrader>;

    mockWeaponPowerupHandlerInstance = {
      getCurrentCooldownMultiplier: vi.fn().mockReturnValue(1), // Default: no powerup active
      destroy: vi.fn(),
    } as unknown as Mocked<WeaponPowerupHandler>;

    // Clear the imported logger's mock methods using vi.mocked()
    vi.mocked(logger.log).mockClear();
    vi.mocked(logger.warn).mockClear();
    vi.mocked(logger.error).mockClear();
    vi.mocked(logger.debug).mockClear();

    // Mock EconomyManager methods
    mockEconomyManager.getCurrentCurrency.mockReturnValue(1000);
    mockEconomyManager.spendCurrency.mockReturnValue(true);

    // Mock configLoader using spyOn
    vi.spyOn(configLoader, 'getWeaponsConfig').mockReturnValue(mockWeaponsConfigArray);

    // Instantiate the WeaponManager, injecting mock helpers
    weaponManager = new WeaponManager(
      mockEventBus,
      mockEconomyManager,
      mockWeaponUpgraderInstance, // Inject mock instance
      mockWeaponPowerupHandlerInstance // Inject mock instance
    );

    // Clear initial emit call from constructor AFTER instantiation
    mockEventBus.emit.mockClear();
  });

  afterEach(() => {
    weaponManager.destroy(); // Ensure listeners are cleaned up
    vi.restoreAllMocks(); // Restore spied methods like configLoader.getWeaponsConfig
  });

  it('should initialize with the initial weapon config and emit state', () => {
    // Reset mocks *before* instantiation for this specific test
    vi.clearAllMocks();
    vi.spyOn(configLoader, 'getWeaponsConfig').mockReturnValue(mockWeaponsConfigArray); // Re-apply spy
    mockEconomyManager.getCurrentCurrency.mockReturnValue(1000); // Re-apply mock

    // Re-instantiate to test constructor behavior cleanly, passing mocks
    weaponManager = new WeaponManager(
      mockEventBus,
      mockEconomyManager,
      mockWeaponUpgraderInstance,
      mockWeaponPowerupHandlerInstance
    );

    expect(mockEventBus.emit).toHaveBeenCalledTimes(1); // Initial state emit
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      WEAPON_STATE_UPDATED,
      expect.objectContaining({
        weaponId: 'bullet',
        level: 1,
        // Manager calculates this, check it's a number or null
        nextUpgradeCost: expect.any(Number),
      })
    );
    // Use the imported logger mock for assertions
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('WeaponManager initialized'));
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Initial weapon set to bullet')
    );
  });

  it('should switch weapons and emit state when WEAPON_SWITCH event is received', () => {
    // Find the listener function registered with EventBus
    // Find the listener function registered with EventBus, providing type for 'call'
    const switchListener = mockEventBus.on.mock.calls.find(
      (call: [string, (payload: string) => void]) => call[0] === WEAPON_SWITCH
    )?.[1];
    expect(switchListener).toBeDefined();

    // Simulate the event
    if (switchListener) {
      switchListener('laser'); // Pass only the ID string
    }

    // Check emitted state
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      WEAPON_STATE_UPDATED,
      expect.objectContaining({
        weaponId: 'laser',
        level: 1,
        nextUpgradeCost: expect.any(Number),
      })
    );
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Switched weapon to laser'));
  });

  it('should ignore invalid weapon switch requests', () => {
    // Find the listener function registered with EventBus, providing type for 'call'
    const switchListener = mockEventBus.on.mock.calls.find(
      (call: [string, (payload: string) => void]) => call[0] === WEAPON_SWITCH
    )?.[1];
    expect(switchListener).toBeDefined();

    if (switchListener) {
      switchListener('invalid_weapon');
    }

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Attempted to switch to unknown weapon ID: invalid_weapon')
    );
    // Ensure state update wasn't called again for the invalid switch
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(WEAPON_STATE_UPDATED, expect.anything()); // No emit after construction
  });

  it('should emit REQUEST_FIRE_WEAPON if cooldown allows when FIRE_START is received', () => {
    // Find the listener function registered with EventBus, providing type for 'call'
    const fireStartListener = mockEventBus.on.mock.calls.find(
      (call: [string, () => void]) => call[0] === FIRE_START
    )?.[1];
    expect(fireStartListener).toBeDefined();

    if (fireStartListener) {
      fireStartListener(); // Simulate fire start
    }

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      REQUEST_FIRE_WEAPON,
      expect.objectContaining({
        weaponConfig: mockBulletConfig,
        damage: 10, // Base damage at level 1
        projectileSpeed: 400, // Base speed at level 1
      })
    );
  });

  it('should not emit REQUEST_FIRE_WEAPON if weapon is on cooldown', () => {
    // Find the listener function registered with EventBus, providing type for 'call'
    const fireStartListener = mockEventBus.on.mock.calls.find(
      (call: [string, () => void]) => call[0] === FIRE_START
    )?.[1];
    expect(fireStartListener).toBeDefined();

    // Fire once to start cooldown
    if (fireStartListener) fireStartListener();
    mockEventBus.emit.mockClear(); // Clear the first fire emit

    // Attempt to fire again immediately
    if (fireStartListener) fireStartListener();

    expect(mockEventBus.emit).not.toHaveBeenCalledWith(REQUEST_FIRE_WEAPON, expect.anything());
  });

  it('should allow firing again after cooldown expires via update()', () => {
    // Find the listener function registered with EventBus, providing type for 'call'
    const fireStartListener = mockEventBus.on.mock.calls.find(
      (call: [string, () => void]) => call[0] === FIRE_START
    )?.[1];
    expect(fireStartListener).toBeDefined();

    // Fire once to start cooldown
    if (fireStartListener) fireStartListener();
    mockEventBus.emit.mockClear();

    // Simulate time passing (slightly more than cooldown)
    weaponManager.update(501); // Bullet cooldown is 500ms

    // Fire again - should now work
    if (fireStartListener) fireStartListener();
    expect(mockEventBus.emit).toHaveBeenCalledWith(REQUEST_FIRE_WEAPON, expect.anything());
  });

  it('should handle weapon upgrade requests via event', () => {
    // Find the listener function registered with EventBus, providing type for 'call'
    const upgradeListener = mockEventBus.on.mock.calls.find(
      (call: [string, () => void]) => call[0] === REQUEST_WEAPON_UPGRADE
    )?.[1];
    expect(upgradeListener).toBeDefined();

    // Configure the mock return value for the injected instance's method
    mockWeaponUpgraderInstance.attemptUpgrade.mockReturnValueOnce({
      success: true,
      newLevel: 2,
      newCooldown: 450,
      newDamage: 11,
      newProjectileSpeed: 420,
      // cost: 75, // Removed - 'cost' is not part of UpgradeResult type
      message: 'Upgraded!',
    });

    if (upgradeListener) {
      upgradeListener(); // Simulate event
    }

    // Check that the injected instance's method was called
    expect(mockWeaponUpgraderInstance.attemptUpgrade).toHaveBeenCalledWith(
      mockBulletConfig,
      1 // current level
    );

    // Check state update emission
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      WEAPON_STATE_UPDATED,
      expect.objectContaining({
        weaponId: 'bullet',
        level: 2,
        nextUpgradeCost: expect.any(Number), // e.g., 50 * 1.5^2 = 112.5 -> 113
      })
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Successfully upgraded bullet to Level 2')
    );
  });

  it('should not emit state update if WeaponUpgrader fails', () => {
    // Find the listener function registered with EventBus, providing type for 'call'
    const upgradeListener = mockEventBus.on.mock.calls.find(
      (call: [string, () => void]) => call[0] === REQUEST_WEAPON_UPGRADE
    )?.[1];
    expect(upgradeListener).toBeDefined();

    // Mock failure on the injected instance's method
    mockWeaponUpgraderInstance.attemptUpgrade.mockReturnValueOnce({
      success: false,
      message: 'Failed: Reason X',
    });

    if (upgradeListener) {
      upgradeListener();
    }
    expect(mockWeaponUpgraderInstance.attemptUpgrade).toHaveBeenCalled(); // Ensure instance method was called
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(WEAPON_STATE_UPDATED, expect.anything());
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Upgrade failed for bullet: Failed: Reason X')
    );
  });

  it('should not upgrade if WeaponUpgrader indicates max level', () => {
    // Find the listener function registered with EventBus, providing type for 'call'
    const upgradeListener = mockEventBus.on.mock.calls.find(
      (call: [string, () => void]) => call[0] === REQUEST_WEAPON_UPGRADE
    )?.[1];
    expect(upgradeListener).toBeDefined();

    // Mock failure due to max level on the injected instance's method
    mockWeaponUpgraderInstance.attemptUpgrade.mockReturnValueOnce({
      success: false,
      message: 'Max Level Reached',
    });

    if (upgradeListener) {
      upgradeListener();
    }
    expect(mockWeaponUpgraderInstance.attemptUpgrade).toHaveBeenCalled(); // Ensure instance method was called
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(WEAPON_STATE_UPDATED, expect.anything());
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Upgrade failed for bullet: Max Level Reached')
    );
  });

  it('should apply rapid fire effect when POWERUP_EFFECT_APPLIED is received', () => {
    // Mock the powerup handler state change *after* the event is simulated
    mockWeaponPowerupHandlerInstance.getCurrentCooldownMultiplier.mockReturnValue(0.5); // Set multiplier on mock instance

    // Simulate the event being received by the manager's listener
    // Note: WeaponManager doesn't listen for this directly, WeaponPowerupHandler does.
    // We test the *effect* by checking if WeaponManager uses the multiplier from the handler.

    // Simulate firing
    // Find the listener function registered with EventBus, providing type for 'call'
    const fireStartListener = mockEventBus.on.mock.calls.find(
      (call: [string, () => void]) => call[0] === FIRE_START
    )?.[1];
    expect(fireStartListener).toBeDefined();

    // Fire once - cooldown timer should be set using the multiplier
    if (fireStartListener) fireStartListener();
    expect(mockWeaponPowerupHandlerInstance.getCurrentCooldownMultiplier).toHaveBeenCalled(); // Ensure instance method was checked
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Cooldown started: 250ms')); // 500 * 0.5

    mockEventBus.emit.mockClear(); // Clear fire emit

    // Update time (less than original cooldown, more than halved cooldown)
    weaponManager.update(251);

    // Fire again - should work because of the multiplier
    if (fireStartListener) fireStartListener();
    expect(mockEventBus.emit).toHaveBeenCalledWith(REQUEST_FIRE_WEAPON, expect.anything());
  });

  it('should remove rapid fire effect when POWERUP_EFFECT_REMOVED is received', () => {
    // Apply effect first (by setting mock return value on instance)
    mockWeaponPowerupHandlerInstance.getCurrentCooldownMultiplier.mockReturnValue(0.5);

    // Remove effect (by resetting mock return value on instance)
    // Simulate the event that the PowerupHandler listens for, which causes it to change its internal state
    // In a real scenario, the PowerupManager would emit this. Here, we just change the mock return value.
    mockWeaponPowerupHandlerInstance.getCurrentCooldownMultiplier.mockReturnValue(1);

    // Simulate firing
    // Find the listener function registered with EventBus, providing type for 'call'
    const fireStartListener = mockEventBus.on.mock.calls.find(
      (call: [string, () => void]) => call[0] === FIRE_START
    )?.[1];
    expect(fireStartListener).toBeDefined();

    // Fire once - cooldown should use multiplier 1
    if (fireStartListener) fireStartListener();
    expect(mockWeaponPowerupHandlerInstance.getCurrentCooldownMultiplier).toHaveBeenCalled(); // Check instance method
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Cooldown started: 500ms')); // 500 * 1

    mockEventBus.emit.mockClear(); // Clear fire emit

    // Update time (less than original cooldown)
    weaponManager.update(251);
    // Fire again - should fail as cooldown is now 500ms
    if (fireStartListener) fireStartListener();
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(REQUEST_FIRE_WEAPON, expect.anything());

    // Update time past original cooldown
    weaponManager.update(250); // Total 501ms elapsed
    // Fire again - should work now
    if (fireStartListener) fireStartListener();
    expect(mockEventBus.emit).toHaveBeenCalledWith(REQUEST_FIRE_WEAPON, expect.anything());
  });

  it('should unregister listeners and destroy helpers on destroy', () => {
    weaponManager.destroy();
    expect(mockEventBus.off).toHaveBeenCalledWith(FIRE_START, expect.any(Function));
    expect(mockEventBus.off).toHaveBeenCalledWith(WEAPON_SWITCH, expect.any(Function));
    expect(mockEventBus.off).toHaveBeenCalledWith(REQUEST_WEAPON_UPGRADE, expect.any(Function));
    // Powerup listeners are managed by the helper, check helper destroy was called
    expect(mockWeaponPowerupHandlerInstance.destroy).toHaveBeenCalled(); // Check instance method
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('WeaponManager destroyed'));
  });
});
