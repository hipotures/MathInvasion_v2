/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach, Mocked } from 'vitest';
import WeaponManager from '../../../src/core/managers/WeaponManager';
import { EventBus } from '../../../src/core/events/EventBus';
import EconomyManager from '../../../src/core/managers/EconomyManager';
import { WeaponUpgrader } from '../../../src/core/managers/helpers/WeaponUpgrader';
import { WeaponPowerupHandler } from '../../../src/core/managers/helpers/WeaponPowerupHandler';
import {
  WEAPON_STATE_UPDATED,
  WEAPON_SWITCH,
  REQUEST_WEAPON_UPGRADE,
  FIRE_START,
} from '../../../src/core/constants/events';
// Removed duplicate import for WEAPON_STATE_UPDATED
import type { WeaponsConfig, WeaponConfig } from '../../../src/core/config/schemas/weaponSchema';
import configLoader from '../../../src/core/config/ConfigLoader';
import logger from '../../../src/core/utils/Logger';

// --- Mocks ---
vi.mock('../../../src/core/events/EventBus');
vi.mock('../../../src/core/utils/Logger', () => ({
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../../src/core/managers/EconomyManager');
// Helpers are not mocked, we inject mock instances

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

describe('WeaponManager: Initialization & State', () => {
  let weaponManager: WeaponManager;
  let mockWeaponUpgraderInstance: Mocked<WeaponUpgrader>;
  let mockWeaponPowerupHandlerInstance: Mocked<WeaponPowerupHandler>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWeaponUpgraderInstance = {
      attemptUpgrade: vi.fn(), // Mock methods needed by constructor/initialization if any
      calculateNextUpgradeCost: vi.fn().mockReturnValue(75), // Mock cost calculation for initial state
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

    // Instantiate here for initialization tests
    weaponManager = new WeaponManager(
      mockEventBus,
      mockEconomyManager,
      mockWeaponUpgraderInstance,
      mockWeaponPowerupHandlerInstance
    );
  });

  afterEach(() => {
    // weaponManager.destroy(); // Destroy might be tested separately
    vi.restoreAllMocks();
  });

  it('should initialize with the initial weapon config and emit state', () => {
    // Constructor runs in beforeEach
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
    // Check if necessary listeners were attached
    expect(mockEventBus.on).toHaveBeenCalledWith(WEAPON_SWITCH, expect.any(Function));
    expect(mockEventBus.on).toHaveBeenCalledWith(REQUEST_WEAPON_UPGRADE, expect.any(Function));
    expect(mockEventBus.on).toHaveBeenCalledWith(FIRE_START, expect.any(Function));
  });
});
