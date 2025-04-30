import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WeaponUpgrader, type UpgradeResult } from '../../../../src/core/managers/helpers/WeaponUpgrader';
import type EconomyManager from '../../../../src/core/managers/EconomyManager';
import type { WeaponConfig } from '../../../../src/core/config/schemas/weaponSchema';
import { EventBus } from '../../../../src/core/events/EventBus'; // Import EventBus type

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

    beforeEach(async () => { // Make async again
        // Reset mocks before each test
        mockGetCurrentCurrency.mockClear();
        mockSpendCurrency.mockClear();

        // Instantiate mocks correctly
        mockEventBusInstance = new EventBus(); // Instantiate the mocked EventBus

        // Dynamically import the mocked EconomyManager constructor
        const { default: EconomyManagerMock } = await import('../../../../src/core/managers/EconomyManager');
        // Pass the mocked EventBus instance to the constructor
        mockEconomyManager = new EconomyManagerMock(mockEventBusInstance) as EconomyManager;
        weaponUpgrader = new WeaponUpgrader(mockEconomyManager);
    });

    // Removed extra closing brace from previous file state

    // --- calculateNextUpgradeCost Tests ---

    describe('calculateNextUpgradeCost', () => {
        it('should calculate the correct cost for level 0 -> 1', () => {
            const cost = weaponUpgrader.calculateNextUpgradeCost(mockBulletConfig, 0);
            // baseCost * costMultiplier^0 = 100 * 1.5^0 = 100 * 1 = 100
            expect(cost).toBe(100);
        });

        it('should calculate the correct cost for level 1 -> 2', () => {
            const cost = weaponUpgrader.calculateNextUpgradeCost(mockBulletConfig, 1);
            // baseCost * costMultiplier^1 = 100 * 1.5^1 = 100 * 1.5 = 150
            expect(cost).toBe(150);
        });

        it('should calculate the correct cost for level 5 -> 6', () => {
            const cost = weaponUpgrader.calculateNextUpgradeCost(mockLaserConfig, 5);
            // baseCost * costMultiplier^5 = 150 * 1.6^5 = 150 * 10.48576 = 1572.864
            expect(cost).toBe(1573); // Rounded
        });

        it('should return null if weapon has no upgrade configuration', () => {
             // Test the actual logic: attemptUpgrade checks for .upgrade, calculateNextUpgradeCost also checks
            const configWithoutUpgrade = { ...mockNoUpgradeConfig, upgrade: undefined as any };
            const cost = weaponUpgrader.calculateNextUpgradeCost(configWithoutUpgrade, 0);
            expect(cost).toBeNull();
        });

         it('should return null if weapon has no valid baseCost defined in config', () => {
             // Modify the config directly for this test case to remove baseCost
            const configWithoutBaseCost = { ...mockInvalidCostConfig, baseCost: undefined as any };
            const cost = weaponUpgrader.calculateNextUpgradeCost(configWithoutBaseCost, 0);
            expect(cost).toBeNull();
        });

        // Could add a test for negative baseCost if the schema allowed it
    });

    // --- attemptUpgrade Tests ---

    describe('attemptUpgrade', () => {
        it('should return success: false if weapon has no upgrade config', () => {
             // Test the actual logic: attemptUpgrade checks for .upgrade
            const configWithoutUpgrade = { ...mockNoUpgradeConfig, upgrade: undefined as any };
            const result = weaponUpgrader.attemptUpgrade(configWithoutUpgrade, 0);
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
            // Level 1 stats (multipliers applied 0 times, levelFactor = 0)
            expect(result.newCooldown).toBe(500); // 500 * 0.9^0
            expect(result.newDamage).toBe(10);    // 10 * 1.2^0
            expect(result.newProjectileSpeed).toBe(600); // 600 * 1.1^0
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
            // Level 2 stats (multipliers applied 1 time, levelFactor = 1)
            expect(result.newCooldown).toBe(450); // 500 * 0.9^1
            expect(result.newDamage).toBe(12);    // 10 * 1.2^1
            expect(result.newProjectileSpeed).toBe(660); // 600 * 1.1^1
        });

         it('should successfully upgrade level 3 -> 4 and calculate new stats (rounded)', () => {
            const currentLevel = 3;
            // Cost = 100 * 1.5^3 = 100 * 3.375 = 337.5 -> 338
            const expectedCost = 338;
            mockGetCurrentCurrency.mockReturnValue(expectedCost);
            mockSpendCurrency.mockReturnValue(true);

            const result = weaponUpgrader.attemptUpgrade(mockBulletConfig, currentLevel);

            expect(result.success).toBe(true);
            expect(mockSpendCurrency).toHaveBeenCalledWith(expectedCost);
            expect(result.newLevel).toBe(4);
            // Level 4 stats (multipliers applied 3 times, levelFactor = 3)
            // Cooldown: 500 * 0.9^3 = 500 * 0.729 = 364.5 -> 365
            expect(result.newCooldown).toBe(365);
            // Damage: 10 * 1.2^3 = 10 * 1.728 = 17.28 -> 17
            expect(result.newDamage).toBe(17);
            // Speed: 600 * 1.1^3 = 600 * 1.331 = 798.6 -> 799
            expect(result.newProjectileSpeed).toBe(799);
        });


        it('should handle missing damage multiplier correctly', () => {
            const currentLevel = 1;
            // Cost = 200 * 1.4^1 = 280
            const expectedCost = 280;
            mockGetCurrentCurrency.mockReturnValue(expectedCost);
            mockSpendCurrency.mockReturnValue(true);

            // Use slow field config which has no damage multiplier
            const result = weaponUpgrader.attemptUpgrade(mockSlowFieldConfig, currentLevel);

            expect(result.success).toBe(true);
            expect(mockSpendCurrency).toHaveBeenCalledWith(expectedCost);
            expect(result.newLevel).toBe(2);
            // Level 2 stats (multipliers applied 1 time, levelFactor = 1)
            // Cooldown: 2000 * 0.95^1 = 1900
            expect(result.newCooldown).toBe(1900);
            // No damage multiplier, no base damage
            expect(result.newDamage).toBeUndefined();
            // No speed multiplier
            expect(result.newProjectileSpeed).toBeUndefined();
        });

         it('should handle missing speed multiplier correctly', () => {
            const currentLevel = 1;
            // Cost = 150 * 1.6^1 = 240
            const expectedCost = 240;
            mockGetCurrentCurrency.mockReturnValue(expectedCost);
            mockSpendCurrency.mockReturnValue(true);

            // Use laser config which has no speed multiplier
            const result = weaponUpgrader.attemptUpgrade(mockLaserConfig, currentLevel);

            expect(result.success).toBe(true);
            expect(mockSpendCurrency).toHaveBeenCalledWith(expectedCost);
            expect(result.newLevel).toBe(2);
            // Level 2 stats (multipliers applied 1 time, levelFactor = 1)
            // Cooldown: 1000 * 0.85^1 = 850
            expect(result.newCooldown).toBe(850);
            // Damage: 5 * 1.3^1 = 6.5 -> 7
            expect(result.newDamage).toBe(7);
             // No speed multiplier
            expect(result.newProjectileSpeed).toBeUndefined();
        });

         it('should handle missing base damage correctly (damage upgrade has no effect)', () => {
            // Modify bullet config to remove baseDamage
            const noBaseDamageConfig = {
                ...mockBulletConfig,
                baseDamage: undefined,
            };
            const currentLevel = 1;
            const expectedCost = 150; // 100 * 1.5^1
            mockGetCurrentCurrency.mockReturnValue(expectedCost);
            mockSpendCurrency.mockReturnValue(true);

            const result = weaponUpgrader.attemptUpgrade(noBaseDamageConfig, currentLevel);

            expect(result.success).toBe(true);
            expect(mockSpendCurrency).toHaveBeenCalledWith(expectedCost);
            expect(result.newLevel).toBe(2);
            expect(result.newCooldown).toBe(450); // Still calculated
            expect(result.newDamage).toBeUndefined(); // Undefined because baseDamage is missing
            expect(result.newProjectileSpeed).toBe(660); // Still calculated
        });

         it('should handle missing base projectile speed correctly (uses default 400)', () => {
            // Modify bullet config to remove projectileSpeed
            const noBaseSpeedConfig = {
                ...mockBulletConfig,
                projectileSpeed: undefined,
            };
            const currentLevel = 1;
            const expectedCost = 150; // 100 * 1.5^1
            mockGetCurrentCurrency.mockReturnValue(expectedCost);
            mockSpendCurrency.mockReturnValue(true);

            const result = weaponUpgrader.attemptUpgrade(noBaseSpeedConfig, currentLevel);

            expect(result.success).toBe(true);
            expect(mockSpendCurrency).toHaveBeenCalledWith(expectedCost);
            expect(result.newLevel).toBe(2);
            expect(result.newCooldown).toBe(450); // Still calculated
            expect(result.newDamage).toBe(12);    // Still calculated
            // Speed: 400 (default) * 1.1^1 = 440
            expect(result.newProjectileSpeed).toBe(440);
        });
    });
});