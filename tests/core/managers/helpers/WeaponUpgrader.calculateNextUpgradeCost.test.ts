// tests/core/managers/helpers/WeaponUpgrader.calculateNextUpgradeCost.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import type { WeaponConfig } from '../../../../src/core/config/schemas/weaponSchema';
import { WeaponUpgrader } from '../../../../src/core/managers/helpers/WeaponUpgrader';
import {
  setupWeaponUpgraderTest,
  mockBulletConfig,
  mockLaserConfig,
  mockNoUpgradeConfig,
  mockInvalidCostConfig,
} from './WeaponUpgrader.setup'; // Import setup and configs

describe('WeaponUpgrader - calculateNextUpgradeCost', () => {
  let weaponUpgrader: WeaponUpgrader;

  beforeEach(() => {
    // Use the setup function
    const setup = setupWeaponUpgraderTest();
    weaponUpgrader = setup.weaponUpgrader;
    // No need for mockEconomyManager or mockEventBusInstance here as this method doesn't use them
  });

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