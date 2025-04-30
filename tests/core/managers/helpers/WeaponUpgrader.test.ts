import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeaponUpgrader } from '../../../../src/core/managers/helpers/WeaponUpgrader';
import EconomyManager from '../../../../src/core/managers/EconomyManager'; // Import the actual (mocked) class
import type { WeaponConfig } from '../../../../src/core/config/schemas/weaponSchema';
import { EventBus } from '../../../../src/core/events/EventBus';

// Mock dependencies
vi.mock('../../../../src/core/utils/Logger', () => ({
  default: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock EconomyManager class
const mockGetCurrentCurrency = vi.fn();
const mockSpendCurrency = vi.fn();
// Mock the default export constructor and its methods
vi.mock('../../../../src/core/managers/EconomyManager', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      getCurrentCurrency: mockGetCurrentCurrency,
      spendCurrency: mockSpendCurrency,
      // Add other methods if WeaponUpgrader interacts with them (e.g., destroy)
      destroy: vi.fn(),
    })),
  };
});

// Mock EventBus (needed for EconomyManager constructor)
vi.mock('../../../../src/core/events/EventBus', () => {
  return {
    // Mock the default export constructor and its methods
    EventBus: vi.fn().mockImplementation(() => ({
      emit: vi.fn(), // Mock emit directly
      on: vi.fn(),
      off: vi.fn(),
      cleanup: vi.fn(), // Assuming EventBus has cleanup or similar
    })),
  };
});

describe('WeaponUpgrader', () => {
  let weaponUpgrader: WeaponUpgrader;
  let mockEconomyManager: EconomyManager;
  let mockEventBusInstance: EventBus; // Instance for constructor

  // --- Mock Weapon Configs (Defined within describe scope) ---
  const mockBulletConfig: WeaponConfig = {
    id: 'bullet',
    name: 'Bullet Gun',
    projectileType: 'bullet',
    baseCooldownMs: 500,
    baseDamage: 10,
    baseRange: 300,
    projectileSpeed: 600,
    baseCost: 100,
    upgrade: {
      costMultiplier: 1.5,
      cooldownMultiplier: 0.9,
      damageMultiplier: 1.2,
      projectileSpeedMultiplier: 1.1,
      rangeAdd: 10,
    },
  };

  const mockLaserConfig: WeaponConfig = {
    id: 'laser',
    name: 'Laser Beam',
    projectileType: 'beam',
    baseCooldownMs: 1000,
    baseDamage: 5,
    baseRange: 400,
    baseCost: 150,
    upgrade: {
      costMultiplier: 1.6,
      cooldownMultiplier: 0.85,
      damageMultiplier: 1.3,
      rangeAdd: 15,
    },
  };

  const mockSlowFieldConfig: WeaponConfig = {
    id: 'slow_field',
    name: 'Slow Field Emitter',
    projectileType: 'none',
    baseCooldownMs: 2000,
    baseRange: 100,
    baseCost: 200,
    upgrade: {
      costMultiplier: 1.4,
      cooldownMultiplier: 0.95,
      rangeAdd: 5,
    },
  };

  const mockNoUpgradeConfig: WeaponConfig = {
    id: 'basic_gun',
    name: 'Basic Gun',
    projectileType: 'pellet',
    baseCooldownMs: 600,
    baseDamage: 8,
    baseRange: 250,
    projectileSpeed: 500,
    baseCost: 50,
    upgrade: { costMultiplier: 1, rangeAdd: 0 }, // Minimal upgrade section
  };

  const mockInvalidCostConfig: WeaponConfig = {
    id: 'broken_gun',
    name: 'Broken Gun',
    projectileType: 'scrap',
    baseCooldownMs: 600,
    baseDamage: 8,
    baseRange: 200,
    projectileSpeed: 500,
    baseCost: 100, // Added baseCost
    upgrade: {
      costMultiplier: 1.5,
      cooldownMultiplier: 0.9,
      damageMultiplier: 1.2,
      rangeAdd: 0,
    },
  };

  beforeEach(() => {
    // No async needed
    // Reset mocks before each test
    mockGetCurrentCurrency.mockClear();
    mockSpendCurrency.mockClear();

    // Instantiate mocks correctly
    mockEventBusInstance = new EventBus(); // Instantiate the mocked EventBus

    // Instantiate the mocked EconomyManager directly
    // vi.mock ensures this uses the mocked implementation
    mockEconomyManager = new EconomyManager(mockEventBusInstance);
    weaponUpgrader = new WeaponUpgrader(mockEconomyManager);
  });

  // --- calculateNextUpgradeCost Tests ---

  describe('calculateNextUpgradeCost', () => {
    it('should calculate the correct cost for level 0 -> 1', () => {
      const cost = weaponUpgrader.calculateNextUpgradeCost(mockBulletConfig, 0);
      expect(cost).toBe(100);
    });

    it('should calculate the correct cost for level 1 -> 2', () => {
      const cost = weaponUpgrader.calculateNextUpgradeCost(mockBulletConfig, 1);
      expect(cost).toBe(150);
    });

    it('should calculate the correct cost for level 5 -> 6', () => {
      const cost = weaponUpgrader.calculateNextUpgradeCost(mockLaserConfig, 5);
      expect(cost).toBe(1573); // Rounded
    });

    it('should return null if weapon has no upgrade configuration', () => {
      // Create a partial config and cast, acknowledging this specific test setup
      const configWithoutUpgrade = {
        ...mockNoUpgradeConfig,
        upgrade: undefined,
      } as Partial<WeaponConfig>;
      // Cast back to full type for the function call
      const cost = weaponUpgrader.calculateNextUpgradeCost(configWithoutUpgrade as WeaponConfig, 0);
      expect(cost).toBeNull();
    });

    it('should return null if weapon has no valid baseCost defined in config', () => {
      // Use type assertion carefully, ensuring the rest of the object matches WeaponConfig
      const configWithoutBaseCost = {
        ...mockInvalidCostConfig,
        baseCost: undefined,
      } as Partial<WeaponConfig>;
      // Cast back to WeaponConfig for the function call, acknowledging the potential type mismatch for this specific test
      const cost = weaponUpgrader.calculateNextUpgradeCost(
        configWithoutBaseCost as WeaponConfig,
        0
      );
      expect(cost).toBeNull();
    });

    // Could add a test for negative baseCost if the schema allowed it
  });

  // --- attemptUpgrade Tests ---

  describe('attemptUpgrade', () => {
    it('should return success: false if weapon has no upgrade config', () => {
      const configWithoutUpgrade = {
        ...mockNoUpgradeConfig,
        upgrade: undefined,
      } as Partial<WeaponConfig>;
      const result = weaponUpgrader.attemptUpgrade(configWithoutUpgrade as WeaponConfig, 0);
      expect(result.success).toBe(false);
      expect(result.message).toContain('No upgrade configuration');
      expect(mockGetCurrentCurrency).not.toHaveBeenCalled();
      expect(mockSpendCurrency).not.toHaveBeenCalled();
    });

    it('should return success: false if currency is insufficient', () => {
      const currentLevel = 1;
      const expectedCost = 150; // 100 * 1.5^1
      mockGetCurrentCurrency.mockReturnValue(expectedCost - 1); // Not enough

      const result = weaponUpgrader.attemptUpgrade(mockBulletConfig, currentLevel);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient currency');
      expect(mockGetCurrentCurrency).toHaveBeenCalledTimes(1);
      expect(mockSpendCurrency).not.toHaveBeenCalled();
    });

    it('should return success: false if spending currency fails unexpectedly', () => {
      const currentLevel = 1;
      const expectedCost = 150;
      mockGetCurrentCurrency.mockReturnValue(expectedCost); // Enough currency
      mockSpendCurrency.mockReturnValue(false); // Simulate spend failure

      const result = weaponUpgrader.attemptUpgrade(mockBulletConfig, currentLevel);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to spend currency');
      expect(mockGetCurrentCurrency).toHaveBeenCalledTimes(1);
      expect(mockSpendCurrency).toHaveBeenCalledWith(expectedCost);
    });

    it('should successfully upgrade level 0 -> 1 with sufficient currency', () => {
      const currentLevel = 0;
      const expectedCost = 100; // 100 * 1.5^0
      mockGetCurrentCurrency.mockReturnValue(expectedCost);
      mockSpendCurrency.mockReturnValue(true);

      const result = weaponUpgrader.attemptUpgrade(mockBulletConfig, currentLevel);

      expect(result.success).toBe(true);
      expect(mockGetCurrentCurrency).toHaveBeenCalledTimes(1);
      expect(mockSpendCurrency).toHaveBeenCalledWith(expectedCost);
      expect(result.newLevel).toBe(1);
      expect(result.newCooldown).toBe(500);
      expect(result.newDamage).toBe(10);
      expect(result.newProjectileSpeed).toBe(600);
    });

    it('should successfully upgrade level 1 -> 2 and calculate new stats', () => {
      const currentLevel = 1;
      const expectedCost = 150; // 100 * 1.5^1
      mockGetCurrentCurrency.mockReturnValue(expectedCost);
      mockSpendCurrency.mockReturnValue(true);

      const result = weaponUpgrader.attemptUpgrade(mockBulletConfig, currentLevel);

      expect(result.success).toBe(true);
      expect(mockSpendCurrency).toHaveBeenCalledWith(expectedCost);
      expect(result.newLevel).toBe(2);
      expect(result.newCooldown).toBe(450);
      expect(result.newDamage).toBe(12);
      expect(result.newProjectileSpeed).toBe(660);
    });

    it('should successfully upgrade level 3 -> 4 and calculate new stats (rounded)', () => {
      const currentLevel = 3;
      const expectedCost = 338; // 100 * 1.5^3 = 337.5 -> 338
      mockGetCurrentCurrency.mockReturnValue(expectedCost);
      mockSpendCurrency.mockReturnValue(true);

      const result = weaponUpgrader.attemptUpgrade(mockBulletConfig, currentLevel);

      expect(result.success).toBe(true);
      expect(mockSpendCurrency).toHaveBeenCalledWith(expectedCost);
      expect(result.newLevel).toBe(4);
      expect(result.newCooldown).toBe(365); // 500 * 0.9^3 = 364.5 -> 365
      expect(result.newDamage).toBe(17); // 10 * 1.2^3 = 17.28 -> 17
      expect(result.newProjectileSpeed).toBe(799); // 600 * 1.1^3 = 798.6 -> 799
    });

    it('should handle missing damage multiplier correctly', () => {
      const currentLevel = 1;
      const expectedCost = 280; // 200 * 1.4^1
      mockGetCurrentCurrency.mockReturnValue(expectedCost);
      mockSpendCurrency.mockReturnValue(true);

      const result = weaponUpgrader.attemptUpgrade(mockSlowFieldConfig, currentLevel);

      expect(result.success).toBe(true);
      expect(mockSpendCurrency).toHaveBeenCalledWith(expectedCost);
      expect(result.newLevel).toBe(2);
      expect(result.newCooldown).toBe(1900); // 2000 * 0.95^1
      expect(result.newDamage).toBeUndefined();
      expect(result.newProjectileSpeed).toBeUndefined();
    });

    it('should handle missing speed multiplier correctly', () => {
      const currentLevel = 1;
      const expectedCost = 240; // 150 * 1.6^1
      mockGetCurrentCurrency.mockReturnValue(expectedCost);
      mockSpendCurrency.mockReturnValue(true);

      const result = weaponUpgrader.attemptUpgrade(mockLaserConfig, currentLevel);

      expect(result.success).toBe(true);
      expect(mockSpendCurrency).toHaveBeenCalledWith(expectedCost);
      expect(result.newLevel).toBe(2);
      expect(result.newCooldown).toBe(850); // 1000 * 0.85^1
      expect(result.newDamage).toBe(7); // 5 * 1.3^1 = 6.5 -> 7
      expect(result.newProjectileSpeed).toBeUndefined();
    });

    it('should handle missing base damage correctly (damage upgrade has no effect)', () => {
      const noBaseDamageConfig = {
        ...mockBulletConfig,
        baseDamage: undefined,
      };
      const currentLevel = 1;
      const expectedCost = 150; // 100 * 1.5^1
      mockGetCurrentCurrency.mockReturnValue(expectedCost);
      mockSpendCurrency.mockReturnValue(true);

      const result = weaponUpgrader.attemptUpgrade(
        noBaseDamageConfig as WeaponConfig,
        currentLevel
      );

      expect(result.success).toBe(true);
      expect(mockSpendCurrency).toHaveBeenCalledWith(expectedCost);
      expect(result.newLevel).toBe(2);
      expect(result.newCooldown).toBe(450);
      expect(result.newDamage).toBeUndefined();
      expect(result.newProjectileSpeed).toBe(660);
    });

    it('should handle missing base projectile speed correctly (uses default 400)', () => {
      const noBaseSpeedConfig = {
        ...mockBulletConfig,
        projectileSpeed: undefined,
      };
      const currentLevel = 1;
      const expectedCost = 150; // 100 * 1.5^1
      mockGetCurrentCurrency.mockReturnValue(expectedCost);
      mockSpendCurrency.mockReturnValue(true);

      const result = weaponUpgrader.attemptUpgrade(noBaseSpeedConfig as WeaponConfig, currentLevel);

      expect(result.success).toBe(true);
      expect(mockSpendCurrency).toHaveBeenCalledWith(expectedCost);
      expect(result.newLevel).toBe(2);
      expect(result.newCooldown).toBe(450);
      expect(result.newDamage).toBe(12);
      expect(result.newProjectileSpeed).toBe(440); // 400 * 1.1^1
    });
  });
});
