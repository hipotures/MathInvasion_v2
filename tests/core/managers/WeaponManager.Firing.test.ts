/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach, Mocked } from 'vitest';
import WeaponManager from '../../../src/core/managers/WeaponManager';
import { EventBus } from '../../../src/core/events/EventBus';
import EconomyManager from '../../../src/core/managers/EconomyManager';
import { WeaponUpgrader } from '../../../src/core/managers/helpers/WeaponUpgrader';
import { WeaponPowerupHandler } from '../../../src/core/managers/helpers/WeaponPowerupHandler';
import { REQUEST_FIRE_WEAPON, FIRE_START } from '../../../src/core/constants/events';
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
type VoidListenerFn = () => void;
const findVoidListener = (eventName: string): VoidListenerFn | undefined => {
  const call = mockEventBus.on.mock.calls.find(
    (c): c is [string, VoidListenerFn] => c[0] === eventName
  );
  return call ? call[1] : undefined;
};

describe('WeaponManager: Firing Logic', () => {
  let weaponManager: WeaponManager;
  let mockWeaponUpgraderInstance: Mocked<WeaponUpgrader>;
  let mockWeaponPowerupHandlerInstance: Mocked<WeaponPowerupHandler>;
  let fireStartListener: VoidListenerFn | undefined;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWeaponUpgraderInstance = {
      attemptUpgrade: vi.fn(),
      calculateNextUpgradeCost: vi.fn().mockReturnValue(75),
    } as unknown as Mocked<WeaponUpgrader>;

    mockWeaponPowerupHandlerInstance = {
      getCurrentCooldownMultiplier: vi.fn().mockReturnValue(1), // Default: no powerup
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
    fireStartListener = findVoidListener(FIRE_START);
    expect(fireStartListener).toBeDefined(); // Ensure listener was registered

    mockEventBus.emit.mockClear(); // Clear initial state emit
  });

  afterEach(() => {
    weaponManager.destroy();
    vi.restoreAllMocks();
  });

  it('should emit REQUEST_FIRE_WEAPON if cooldown allows when FIRE_START is received', () => {
    if (fireStartListener) fireStartListener();

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      REQUEST_FIRE_WEAPON,
      expect.objectContaining({
        weaponConfig: mockBulletConfig,
        damage: 10,
        projectileSpeed: 400,
      })
    );
    // Check cooldown timer started
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Cooldown started: 500ms'));
  });

  it('should not emit REQUEST_FIRE_WEAPON if weapon is on cooldown', () => {
    if (fireStartListener) fireStartListener(); // Fire once
    mockEventBus.emit.mockClear();

    if (fireStartListener) fireStartListener(); // Attempt again immediately

    expect(mockEventBus.emit).not.toHaveBeenCalledWith(REQUEST_FIRE_WEAPON, expect.anything());
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Weapon on cooldown'));
  });

  it('should allow firing again after cooldown expires via update()', () => {
    if (fireStartListener) fireStartListener(); // Fire once
    mockEventBus.emit.mockClear();

    weaponManager.update(501); // Bullet cooldown is 500ms

    if (fireStartListener) fireStartListener(); // Fire again
    expect(mockEventBus.emit).toHaveBeenCalledWith(REQUEST_FIRE_WEAPON, expect.anything());
  });

  it('should apply cooldown multiplier from powerup handler when firing', () => {
    mockWeaponPowerupHandlerInstance.getCurrentCooldownMultiplier.mockReturnValue(0.5); // Simulate active powerup

    if (fireStartListener) fireStartListener(); // Fire once

    expect(mockWeaponPowerupHandlerInstance.getCurrentCooldownMultiplier).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Cooldown started: 250ms')); // 500 * 0.5
  });
});
