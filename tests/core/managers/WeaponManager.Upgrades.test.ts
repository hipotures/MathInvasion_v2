/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach, Mocked } from 'vitest';
import WeaponManager from '../../../src/core/managers/WeaponManager';
import { EventBus } from '../../../src/core/events/EventBus';
import EconomyManager from '../../../src/core/managers/EconomyManager';
import { WeaponUpgrader } from '../../../src/core/managers/helpers/WeaponUpgrader';
import { WeaponPowerupHandler } from '../../../src/core/managers/helpers/WeaponPowerupHandler';
// Import WEAPON_SWITCH as well
import {
  REQUEST_WEAPON_UPGRADE,
  WEAPON_STATE_UPDATED,
  WEAPON_SWITCH,
} from '../../../src/core/constants/events';
import type { WeaponsConfig, WeaponConfig } from '../../../src/core/config/schemas/weaponSchema';
import configLoader from '../../../src/core/config/ConfigLoader';
import logger from '../../../src/core/utils/Logger';

// --- Mocks ---
vi.mock('../../../src/core/events/EventBus');
vi.mock('../../../src/core/utils/Logger', () => ({
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../../src/core/managers/EconomyManager');

const mockEventBus = new EventBus() as Mocked<EventBus>;
const mockEconomyManager = new EconomyManager({} as EventBus, 0, 0) as Mocked<EconomyManager>;

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
  upgrade: { costMultiplier: 1.8, cooldownMultiplier: 0.9, damageMultiplier: 1.15, rangeAdd: 15 },
};
const mockWeaponsConfigArray: WeaponsConfig = [mockBulletConfig, mockLaserConfig];

// --- Listener Helpers ---
// Define specific listener types
type ListenerFn<T> = (payload: T) => void;
type VoidListenerFn = () => void;

const findListener = <T>(eventName: string): ListenerFn<T> | undefined => {
  const call = mockEventBus.on.mock.calls.find(
    (c): c is [string, ListenerFn<T>] => c[0] === eventName
  );
  return call ? call[1] : undefined;
};

const findVoidListener = (eventName: string): VoidListenerFn | undefined => {
  const call = mockEventBus.on.mock.calls.find(
    (c): c is [string, VoidListenerFn] => c[0] === eventName
  );
  return call ? call[1] : undefined;
};

describe('WeaponManager: Upgrades', () => {
  let weaponManager: WeaponManager;
  let mockWeaponUpgraderInstance: Mocked<WeaponUpgrader>;
  let mockWeaponPowerupHandlerInstance: Mocked<WeaponPowerupHandler>;
  let upgradeListener: VoidListenerFn | undefined;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWeaponUpgraderInstance = {
      attemptUpgrade: vi.fn(), // Mocked per test case
      calculateNextUpgradeCost: vi.fn().mockReturnValue(75), // Default mock cost
    } as unknown as Mocked<WeaponUpgrader>;

    mockWeaponPowerupHandlerInstance = {
      getCurrentCooldownMultiplier: vi.fn().mockReturnValue(1),
      destroy: vi.fn(),
    } as unknown as Mocked<WeaponPowerupHandler>;

    vi.mocked(logger.log).mockClear();
    vi.mocked(logger.warn).mockClear();
    vi.mocked(logger.error).mockClear();
    vi.mocked(logger.debug).mockClear();

    mockEconomyManager.getCurrentCurrency.mockReturnValue(1000);
    mockEconomyManager.spendCurrency.mockReturnValue(true);

    vi.spyOn(configLoader, 'getWeaponsConfig').mockReturnValue(mockWeaponsConfigArray);

    weaponManager = new WeaponManager(
      mockEventBus,
      mockEconomyManager,
      mockWeaponUpgraderInstance,
      mockWeaponPowerupHandlerInstance
    );

    // Find the listener after manager instantiation
    upgradeListener = findVoidListener(REQUEST_WEAPON_UPGRADE);
    expect(upgradeListener).toBeDefined(); // Ensure listener was registered

    mockEventBus.emit.mockClear(); // Clear initial state emit
  });

  afterEach(() => {
    weaponManager.destroy();
    vi.restoreAllMocks();
  });

  it('should handle weapon upgrade requests via event and call WeaponUpgrader', () => {
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

  it('should use WeaponUpgrader to calculate next upgrade cost for state updates', () => {
    // Trigger a state update (e.g., by switching weapon)
    // Use findListener as WEAPON_SWITCH has a string payload
    const switchListener = findListener<string>(WEAPON_SWITCH);
    if (!switchListener) throw new Error('Switch listener not found');

    mockWeaponUpgraderInstance.calculateNextUpgradeCost.mockReturnValueOnce(180); // Mock cost for laser

    switchListener('laser'); // Switch to laser

    // Verify calculateNextUpgradeCost was called by emitStateUpdate
    expect(mockWeaponUpgraderInstance.calculateNextUpgradeCost).toHaveBeenCalledWith(
      mockLaserConfig,
      1
    );
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      WEAPON_STATE_UPDATED,
      expect.objectContaining({ weaponId: 'laser', nextUpgradeCost: 180 })
    );
  });
});
