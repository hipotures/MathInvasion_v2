// tests/core/managers/helpers/WeaponUpgrader.attemptUpgrade.test.ts
import { describe, it, expect, beforeEach, Mock } from 'vitest';
import type { WeaponConfig } from '../../../../src/core/config/schemas/weaponSchema';
import { WeaponUpgrader } from '../../../../src/core/managers/helpers/WeaponUpgrader';
import {
  setupWeaponUpgraderTest,
  mockBulletConfig,
  mockLaserConfig,
  mockSlowFieldConfig,
  mockNoUpgradeConfig,
  // mockInvalidCostConfig is not used here but could be added if needed
} from './WeaponUpgrader.setup'; // Import setup and configs

describe('WeaponUpgrader - attemptUpgrade', () => {
  let weaponUpgrader: WeaponUpgrader;
  let mockGetCurrentCurrency: Mock;
  let mockSpendCurrency: Mock;

  beforeEach(() => {
    // Use the setup function and get the mocks
    const setup = setupWeaponUpgraderTest();
    weaponUpgrader = setup.weaponUpgrader;
    mockGetCurrentCurrency = setup.mockGetCurrentCurrency;
    mockSpendCurrency = setup.mockSpendCurrency;
  });

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