/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach, Mocked } from 'vitest';
import WeaponManager from '../../../src/core/managers/WeaponManager';
import { EventBus } from '../../../src/core/events/EventBus';
import EconomyManager from '../../../src/core/managers/EconomyManager';
import { WeaponUpgrader } from '../../../src/core/managers/helpers/WeaponUpgrader';
import { WeaponPowerupHandler } from '../../../src/core/managers/helpers/WeaponPowerupHandler';
import {
  WEAPON_SWITCH,
  REQUEST_WEAPON_UPGRADE,
  FIRE_START,
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
const mockWeaponsConfigArray: WeaponsConfig = [mockBulletConfig];

// --- Listener Helpers ---
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

describe('WeaponManager: Cleanup', () => {
  let weaponManager: WeaponManager;
  let mockWeaponUpgraderInstance: Mocked<WeaponUpgrader>;
  let mockWeaponPowerupHandlerInstance: Mocked<WeaponPowerupHandler>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWeaponUpgraderInstance = {
      attemptUpgrade: vi.fn(),
      calculateNextUpgradeCost: vi.fn().mockReturnValue(75),
    } as unknown as Mocked<WeaponUpgrader>;

    mockWeaponPowerupHandlerInstance = {
      getCurrentCooldownMultiplier: vi.fn().mockReturnValue(1),
      destroy: vi.fn(), // Mock destroy for verification
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
  });

  afterEach(() => {
    // No need to call destroy here as the test does it
    vi.restoreAllMocks();
  });

  it('should unregister listeners and destroy helpers on destroy', () => {
    // Capture listener references *before* calling destroy
    const fireStartListenerRef = findVoidListener(FIRE_START);
    const switchListenerRef = findListener<string>(WEAPON_SWITCH);
    const upgradeListenerRef = findVoidListener(REQUEST_WEAPON_UPGRADE);

    // Ensure listeners were actually registered before checking removal
    expect(fireStartListenerRef).toBeDefined();
    expect(switchListenerRef).toBeDefined();
    expect(upgradeListenerRef).toBeDefined();

    weaponManager.destroy();

    // Verify listeners are unregistered using the captured references
    expect(mockEventBus.off).toHaveBeenCalledWith(FIRE_START, fireStartListenerRef);
    expect(mockEventBus.off).toHaveBeenCalledWith(WEAPON_SWITCH, switchListenerRef);
    expect(mockEventBus.off).toHaveBeenCalledWith(REQUEST_WEAPON_UPGRADE, upgradeListenerRef);

    // Verify helper destroy was called
    expect(mockWeaponPowerupHandlerInstance.destroy).toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('WeaponManager destroyed'));
  });
});
