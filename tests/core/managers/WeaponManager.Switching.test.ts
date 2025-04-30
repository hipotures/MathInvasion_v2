/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach, Mocked } from 'vitest';
import WeaponManager from '../../../src/core/managers/WeaponManager';
import { EventBus } from '../../../src/core/events/EventBus';
import EconomyManager from '../../../src/core/managers/EconomyManager';
import { WeaponUpgrader } from '../../../src/core/managers/helpers/WeaponUpgrader';
import { WeaponPowerupHandler } from '../../../src/core/managers/helpers/WeaponPowerupHandler';
import { WEAPON_SWITCH, WEAPON_STATE_UPDATED } from '../../../src/core/constants/events';
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

// --- Listener Helper ---
type ListenerFn<T> = (payload: T) => void;
const findListener = <T>(eventName: string): ListenerFn<T> | undefined => {
  const call = mockEventBus.on.mock.calls.find(
    (c): c is [string, ListenerFn<T>] => c[0] === eventName
  );
  return call ? call[1] : undefined;
};

describe('WeaponManager: Switching', () => {
  let weaponManager: WeaponManager;
  let mockWeaponUpgraderInstance: Mocked<WeaponUpgrader>;
  let mockWeaponPowerupHandlerInstance: Mocked<WeaponPowerupHandler>;
  let switchListener: ListenerFn<string> | undefined;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWeaponUpgraderInstance = {
      attemptUpgrade: vi.fn(),
      calculateNextUpgradeCost: vi.fn().mockReturnValue(75), // Mock for initial state
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
    switchListener = findListener<string>(WEAPON_SWITCH);
    expect(switchListener).toBeDefined(); // Ensure listener was registered

    mockEventBus.emit.mockClear(); // Clear initial state emit
  });

  afterEach(() => {
    weaponManager.destroy();
    vi.restoreAllMocks();
  });

  it('should switch weapons and emit state when WEAPON_SWITCH event is received', () => {
    // Mock the cost calculation for the new weapon (laser)
    mockWeaponUpgraderInstance.calculateNextUpgradeCost.mockReturnValueOnce(180); // Laser base cost * 1.8^1

    if (switchListener) switchListener('laser');

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
    if (switchListener) switchListener('invalid_weapon');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Attempted to switch to unknown weapon ID: invalid_weapon')
    );
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(WEAPON_STATE_UPDATED, expect.anything());
  });

  it('should not switch if the requested weapon is already active', () => {
    if (switchListener) switchListener('bullet'); // Already active

    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Weapon bullet is already selected.')
    );
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(WEAPON_STATE_UPDATED, expect.anything());
  });
});
