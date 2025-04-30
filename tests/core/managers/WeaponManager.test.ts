/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach, Mocked } from 'vitest'; // Add Mocked type import
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
import configLoader from '../../../src/core/config/ConfigLoader'; // Import actual config loader
import logger from '../../../src/core/utils/Logger'; // Import logger for mock assertions

// --- Mocks ---
vi.mock('../../../src/core/events/EventBus');
vi.mock('../../../src/core/utils/Logger', () => ({
  default: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
vi.mock('../../../src/core/managers/EconomyManager');
// Helpers are not mocked, we inject mock instances

const mockEventBus = new EventBus() as Mocked<EventBus>;
const mockEconomyManager = new EconomyManager({} as EventBus, 0, 0) as Mocked<EconomyManager>; // Provide initial values

// --- Test Data ---
const mockBulletConfig: WeaponConfig = {
  id: 'bullet',
  name: 'Bullet Gun',
  baseCost: 50,
  baseRange: 300,
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
  baseCost: 100,
  baseRange: 500,
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

const mockWeaponsConfigArray: WeaponsConfig = [mockBulletConfig, mockLaserConfig];

describe('WeaponManager', () => {
  let weaponManager: WeaponManager;
  let mockWeaponUpgraderInstance: Mocked<WeaponUpgrader>;
  let mockWeaponPowerupHandlerInstance: Mocked<WeaponPowerupHandler>;

  // --- Listener Extraction Helpers ---
  // Define specific listener types
  type ListenerFn<T> = (payload: T) => void;
  type VoidListenerFn = () => void;

  // Helper to find the specific listener function attached to the mock EventBus
  const findListener = <T>(eventName: string): ListenerFn<T> | undefined => {
    const call = mockEventBus.on.mock.calls.find(
      // Ensure type safety in the find callback
      (c): c is [string, ListenerFn<T>] => c[0] === eventName
    );
    return call ? call[1] : undefined;
  };

  const findVoidListener = (eventName: string): VoidListenerFn | undefined => {
    const call = mockEventBus.on.mock.calls.find(
      // Ensure type safety in the find callback
      (c): c is [string, VoidListenerFn] => c[0] === eventName
    );
    return call ? call[1] : undefined;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock helper instances
    mockWeaponUpgraderInstance = {
      attemptUpgrade: vi.fn().mockReturnValue({
        success: true,
        newLevel: 2,
        newCooldown: 450,
        newDamage: 11,
        newProjectileSpeed: 420,
        message: 'Upgraded',
      }),
      calculateNextUpgradeCost: vi.fn().mockReturnValue(75), // Default mock cost
    } as unknown as Mocked<WeaponUpgrader>;

    mockWeaponPowerupHandlerInstance = {
      getCurrentCooldownMultiplier: vi.fn().mockReturnValue(1),
      destroy: vi.fn(),
    } as unknown as Mocked<WeaponPowerupHandler>;

    // Mock Logger methods
    vi.mocked(logger.log).mockClear();
    vi.mocked(logger.warn).mockClear();
    vi.mocked(logger.error).mockClear();
    vi.mocked(logger.debug).mockClear();

    // Mock EconomyManager methods
    mockEconomyManager.getCurrentCurrency.mockReturnValue(1000);
    mockEconomyManager.spendCurrency.mockReturnValue(true);

    // Mock configLoader
    vi.spyOn(configLoader, 'getWeaponsConfig').mockReturnValue(mockWeaponsConfigArray);

    // Instantiate the WeaponManager
    weaponManager = new WeaponManager(
      mockEventBus,
      mockEconomyManager,
      mockWeaponUpgraderInstance,
      mockWeaponPowerupHandlerInstance
    );

    // Clear initial emit call from constructor AFTER instantiation
    mockEventBus.emit.mockClear();
  });

  afterEach(() => {
    weaponManager.destroy();
    vi.restoreAllMocks();
  });

  // --- Nested Describe Blocks for Organization ---

  describe('Initialization & State', () => {
    it('should initialize with the initial weapon config and emit state', () => {
      // This test needs re-instantiation to check constructor behavior cleanly
      vi.clearAllMocks();
      vi.spyOn(configLoader, 'getWeaponsConfig').mockReturnValue(mockWeaponsConfigArray);
      mockEconomyManager.getCurrentCurrency.mockReturnValue(1000); // Re-apply mock

      weaponManager = new WeaponManager( // Re-instantiate
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
          nextUpgradeCost: 75, // Check against the mocked cost calculation
        })
      );
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('WeaponManager initialized'));
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Initial weapon set to bullet')
      );
    });
  });

  describe('Weapon Switching', () => {
    it('should switch weapons and emit state when WEAPON_SWITCH event is received', () => {
      const switchListener = findListener<string>(WEAPON_SWITCH);
      expect(switchListener).toBeDefined();

      if (switchListener) switchListener('laser');

      // Mock the cost calculation for the new weapon
      mockWeaponUpgraderInstance.calculateNextUpgradeCost.mockReturnValueOnce(180); // Laser base cost * 1.8^1

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        WEAPON_STATE_UPDATED,
        expect.objectContaining({
          weaponId: 'laser',
          level: 1,
          nextUpgradeCost: 180,
        })
      );
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Switched weapon to laser'));
    });

    it('should ignore invalid weapon switch requests', () => {
      const switchListener = findListener<string>(WEAPON_SWITCH);
      expect(switchListener).toBeDefined();

      if (switchListener) switchListener('invalid_weapon');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Attempted to switch to unknown weapon ID: invalid_weapon')
      );
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(WEAPON_STATE_UPDATED, expect.anything());
    });

    it('should not switch if the requested weapon is already active', () => {
      const switchListener = findListener<string>(WEAPON_SWITCH);
      expect(switchListener).toBeDefined();

      if (switchListener) switchListener('bullet'); // Already active

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Weapon bullet is already selected.')
      );
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(WEAPON_STATE_UPDATED, expect.anything());
    });
  });

  describe('Firing Logic', () => {
    it('should emit REQUEST_FIRE_WEAPON if cooldown allows when FIRE_START is received', () => {
      const fireStartListener = findVoidListener(FIRE_START);
      expect(fireStartListener).toBeDefined();

      if (fireStartListener) fireStartListener();

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        REQUEST_FIRE_WEAPON,
        expect.objectContaining({
          weaponConfig: mockBulletConfig,
          damage: 10,
          projectileSpeed: 400,
        })
      );
    });

    it('should not emit REQUEST_FIRE_WEAPON if weapon is on cooldown', () => {
      const fireStartListener = findVoidListener(FIRE_START);
      expect(fireStartListener).toBeDefined();

      if (fireStartListener) fireStartListener(); // Fire once
      mockEventBus.emit.mockClear();

      if (fireStartListener) fireStartListener(); // Attempt again immediately

      expect(mockEventBus.emit).not.toHaveBeenCalledWith(REQUEST_FIRE_WEAPON, expect.anything());
    });

    it('should allow firing again after cooldown expires via update()', () => {
      const fireStartListener = findVoidListener(FIRE_START);
      expect(fireStartListener).toBeDefined();

      if (fireStartListener) fireStartListener(); // Fire once
      mockEventBus.emit.mockClear();

      weaponManager.update(501); // Bullet cooldown is 500ms

      if (fireStartListener) fireStartListener(); // Fire again
      expect(mockEventBus.emit).toHaveBeenCalledWith(REQUEST_FIRE_WEAPON, expect.anything());
    });
  });

  describe('Upgrades', () => {
    it('should handle weapon upgrade requests via event and call WeaponUpgrader', () => {
      const upgradeListener = findVoidListener(REQUEST_WEAPON_UPGRADE);
      expect(upgradeListener).toBeDefined();

      // Configure mock return for the upgrade attempt
      mockWeaponUpgraderInstance.attemptUpgrade.mockReturnValueOnce({
        success: true,
        newLevel: 2,
        newCooldown: 450,
        newDamage: 11,
        newProjectileSpeed: 420,
        message: 'Upgraded!',
      });
      // Configure mock return for the *next* cost calculation after the upgrade
      mockWeaponUpgraderInstance.calculateNextUpgradeCost.mockReturnValueOnce(113); // 50 * 1.5^2

      if (upgradeListener) upgradeListener();

      expect(mockWeaponUpgraderInstance.attemptUpgrade).toHaveBeenCalledWith(mockBulletConfig, 1);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        WEAPON_STATE_UPDATED,
        expect.objectContaining({
          weaponId: 'bullet',
          level: 2,
          nextUpgradeCost: 113,
        })
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Successfully upgraded bullet to Level 2')
      );
    });

    it('should not emit state update if WeaponUpgrader fails', () => {
      const upgradeListener = findVoidListener(REQUEST_WEAPON_UPGRADE);
      expect(upgradeListener).toBeDefined();

      mockWeaponUpgraderInstance.attemptUpgrade.mockReturnValueOnce({
        success: false,
        message: 'Failed: Reason X',
      });

      if (upgradeListener) upgradeListener();

      expect(mockWeaponUpgraderInstance.attemptUpgrade).toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(WEAPON_STATE_UPDATED, expect.anything());
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Upgrade failed for bullet: Failed: Reason X')
      );
    });

    it('should not upgrade if WeaponUpgrader indicates max level', () => {
      const upgradeListener = findVoidListener(REQUEST_WEAPON_UPGRADE);
      expect(upgradeListener).toBeDefined();

      mockWeaponUpgraderInstance.attemptUpgrade.mockReturnValueOnce({
        success: false,
        message: 'Max Level Reached',
      });

      if (upgradeListener) upgradeListener();

      expect(mockWeaponUpgraderInstance.attemptUpgrade).toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(WEAPON_STATE_UPDATED, expect.anything());
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Upgrade failed for bullet: Max Level Reached')
      );
    });
  });

  describe('Powerups', () => {
    it('should apply rapid fire effect from WeaponPowerupHandler', () => {
      mockWeaponPowerupHandlerInstance.getCurrentCooldownMultiplier.mockReturnValue(0.5); // Simulate active powerup

      const fireStartListener = findVoidListener(FIRE_START);
      expect(fireStartListener).toBeDefined();

      if (fireStartListener) fireStartListener(); // Fire once

      expect(mockWeaponPowerupHandlerInstance.getCurrentCooldownMultiplier).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Cooldown started: 250ms')); // 500 * 0.5

      mockEventBus.emit.mockClear();
      weaponManager.update(251); // Update past halved cooldown

      if (fireStartListener) fireStartListener(); // Fire again
      expect(mockEventBus.emit).toHaveBeenCalledWith(REQUEST_FIRE_WEAPON, expect.anything());
    });

    it('should remove rapid fire effect when WeaponPowerupHandler state changes', () => {
      mockWeaponPowerupHandlerInstance.getCurrentCooldownMultiplier.mockReturnValue(0.5); // Apply effect
      mockWeaponPowerupHandlerInstance.getCurrentCooldownMultiplier.mockReturnValue(1); // Remove effect (simulate handler state change)

      const fireStartListener = findVoidListener(FIRE_START);
      expect(fireStartListener).toBeDefined();

      if (fireStartListener) fireStartListener(); // Fire once

      expect(mockWeaponPowerupHandlerInstance.getCurrentCooldownMultiplier).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Cooldown started: 500ms')); // 500 * 1

      mockEventBus.emit.mockClear();
      weaponManager.update(251); // Update less than full cooldown

      if (fireStartListener) fireStartListener(); // Attempt fire again - should fail
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(REQUEST_FIRE_WEAPON, expect.anything());

      weaponManager.update(250); // Total 501ms elapsed

      if (fireStartListener) fireStartListener(); // Fire again - should work now
      expect(mockEventBus.emit).toHaveBeenCalledWith(REQUEST_FIRE_WEAPON, expect.anything());
    });
  });

  describe('Cleanup', () => {
    it('should unregister listeners and destroy helpers on destroy', () => {
      // Capture listener references before destroy
      const fireStartListenerRef = findVoidListener(FIRE_START);
      const switchListenerRef = findListener<string>(WEAPON_SWITCH);
      const upgradeListenerRef = findVoidListener(REQUEST_WEAPON_UPGRADE);

      weaponManager.destroy();

      expect(mockEventBus.off).toHaveBeenCalledWith(FIRE_START, fireStartListenerRef);
      expect(mockEventBus.off).toHaveBeenCalledWith(WEAPON_SWITCH, switchListenerRef);
      expect(mockEventBus.off).toHaveBeenCalledWith(REQUEST_WEAPON_UPGRADE, upgradeListenerRef);
      expect(mockWeaponPowerupHandlerInstance.destroy).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('WeaponManager destroyed'));
    });
  });
});
