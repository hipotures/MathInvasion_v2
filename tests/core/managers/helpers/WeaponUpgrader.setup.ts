// tests/core/managers/helpers/WeaponUpgrader.setup.ts
import { vi } from 'vitest';
import { WeaponUpgrader } from '../../../../src/core/managers/helpers/WeaponUpgrader';
import EconomyManager from '../../../../src/core/managers/EconomyManager';
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
export const mockGetCurrentCurrency = vi.fn();
export const mockSpendCurrency = vi.fn();
vi.mock('../../../../src/core/managers/EconomyManager', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      getCurrentCurrency: mockGetCurrentCurrency,
      spendCurrency: mockSpendCurrency,
      destroy: vi.fn(),
    })),
  };
});

// Mock EventBus
vi.mock('../../../../src/core/events/EventBus', () => {
  return {
    EventBus: vi.fn().mockImplementation(() => ({
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      cleanup: vi.fn(),
    })),
  };
});

// --- Mock Weapon Configs ---
export const mockBulletConfig: WeaponConfig = {
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

export const mockLaserConfig: WeaponConfig = {
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

export const mockSlowFieldConfig: WeaponConfig = {
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

export const mockNoUpgradeConfig: WeaponConfig = {
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

export const mockInvalidCostConfig: WeaponConfig = {
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

// --- Setup Function ---
export function setupWeaponUpgraderTest() {
  mockGetCurrentCurrency.mockClear();
  mockSpendCurrency.mockClear();

  const mockEventBusInstance = new EventBus();
  const mockEconomyManager = new EconomyManager(mockEventBusInstance);
  const weaponUpgrader = new WeaponUpgrader(mockEconomyManager);

  return {
    weaponUpgrader,
    mockEconomyManager,
    mockEventBusInstance,
    mockGetCurrentCurrency, // Return mocks for assertions
    mockSpendCurrency,
  };
}