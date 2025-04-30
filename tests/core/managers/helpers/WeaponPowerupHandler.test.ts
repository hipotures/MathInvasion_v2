import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WeaponPowerupHandler } from '../../../../src/core/managers/helpers/WeaponPowerupHandler';
import { EventBus } from '../../../../src/core/events/EventBus';
import { Logger } from '../../../../src/core/utils/Logger';
import * as Events from '../../../../src/core/constants/events';
import { PowerupEffectData } from '../../../../src/core/managers/PowerupManager';

// Mock dependencies
const mockLoggerLog = vi.fn();
vi.mock('../../../../src/core/utils/Logger', () => {
    // Mock the Logger class constructor and its methods
    return {
        Logger: vi.fn().mockImplementation(() => ({
            log: mockLoggerLog,
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
        })),
    };
});

const mockEventBusOn = vi.fn();
const mockEventBusOff = vi.fn();
vi.mock('../../../../src/core/events/EventBus', () => {
    // Mock the EventBus class constructor and its methods
    return {
        EventBus: vi.fn().mockImplementation(() => ({
            on: mockEventBusOn,
            off: mockEventBusOff,
            emit: vi.fn(), // Not used by handler directly, but good practice to mock
            cleanup: vi.fn(),
        })),
    };
});

describe('WeaponPowerupHandler', () => {
    let handler: WeaponPowerupHandler;
    let mockEventBus: EventBus;
    let mockLogger: Logger;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks(); // Clears call history etc.

        // Create instances using mocked constructors
        mockEventBus = new EventBus();
        mockLogger = new Logger();
        handler = new WeaponPowerupHandler(mockEventBus, mockLogger);
    });

    afterEach(() => {
        handler.destroy(); // Ensure cleanup for each test
    });

    it('should initialize and register listeners', () => {
        expect(handler).toBeDefined();
        expect(mockLoggerLog).toHaveBeenCalledWith('WeaponPowerupHandler initialized.');
        // Check if listeners were registered
        expect(mockEventBusOn).toHaveBeenCalledWith(
            Events.POWERUP_EFFECT_APPLIED,
            expect.any(Function) // The bound handler function
        );
        expect(mockEventBusOn).toHaveBeenCalledWith(
            Events.POWERUP_EFFECT_REMOVED,
            expect.any(Function) // The bound handler function
        );
        expect(mockEventBusOn).toHaveBeenCalledTimes(2);
    });

    it('should return default cooldown multiplier initially', () => {
        expect(handler.getCurrentCooldownMultiplier()).toBe(1.0);
    });

    describe('handlePowerupEffectApplied', () => {
        it('should activate rapid fire and set multiplier for weapon_cooldown_reduction', () => {
            const powerupData: PowerupEffectData = {
                // instanceId: 'p1', // Removed invalid property
                configId: 'rapid_fire',
                effect: 'weapon_cooldown_reduction',
                durationMs: 5000,
                multiplier: 0.5, // Example multiplier
            };

            // Simulate the event being triggered by calling the handler directly
            // We access the internal handler function via the mock's call history
            const applyHandler = mockEventBusOn.mock.calls.find(
                (call) => call[0] === Events.POWERUP_EFFECT_APPLIED
            )?.[1];
            expect(applyHandler).toBeDefined();

            if (applyHandler) {
                applyHandler(powerupData);
            }

            expect(handler.getCurrentCooldownMultiplier()).toBe(0.5);
            expect(mockLoggerLog).toHaveBeenCalledWith('Rapid Fire activated! Cooldown multiplier: 0.5');
        });

        it('should use default multiplier if provided multiplier is invalid', () => {
            const powerupData: PowerupEffectData = {
                // instanceId: 'p2', // Removed invalid property
                configId: 'rapid_fire_broken',
                effect: 'weapon_cooldown_reduction',
                durationMs: 5000,
                multiplier: -0.2, // Invalid multiplier
            };
            const applyHandler = mockEventBusOn.mock.calls.find(
                (call) => call[0] === Events.POWERUP_EFFECT_APPLIED
            )?.[1];
            if (applyHandler) applyHandler(powerupData);

            expect(handler.getCurrentCooldownMultiplier()).toBe(0.5); // Uses default 0.5
             expect(mockLoggerLog).toHaveBeenCalledWith('Rapid Fire activated! Cooldown multiplier: 0.5');
        });

         it('should use default multiplier if multiplier is missing', () => {
            const powerupData: PowerupEffectData = {
                // instanceId: 'p3', // Removed invalid property
                configId: 'rapid_fire_no_multi',
                effect: 'weapon_cooldown_reduction',
                durationMs: 5000,
                // multiplier missing
            };
            const applyHandler = mockEventBusOn.mock.calls.find(
                (call) => call[0] === Events.POWERUP_EFFECT_APPLIED
            )?.[1];
            if (applyHandler) applyHandler(powerupData);

            expect(handler.getCurrentCooldownMultiplier()).toBe(0.5); // Uses default 0.5
             expect(mockLoggerLog).toHaveBeenCalledWith('Rapid Fire activated! Cooldown multiplier: 0.5');
        });

        it('should ignore powerups with different effects', () => {
            const powerupData: PowerupEffectData = {
                // instanceId: 'p4', // Removed invalid property
                configId: 'shield',
                effect: 'temporary_invulnerability', // Different effect
                durationMs: 3000,
            };
            const applyHandler = mockEventBusOn.mock.calls.find(
                (call) => call[0] === Events.POWERUP_EFFECT_APPLIED
            )?.[1];
            if (applyHandler) applyHandler(powerupData);

            expect(handler.getCurrentCooldownMultiplier()).toBe(1.0); // Should remain default
            expect(mockLoggerLog).not.toHaveBeenCalledWith(expect.stringContaining('Rapid Fire activated'));
        });
    });

    describe('handlePowerupEffectRemoved', () => {
        beforeEach(() => {
            // Activate rapid fire first
            const powerupData: PowerupEffectData = {
                // instanceId: 'p1', // Removed invalid property
                configId: 'rapid_fire',
                effect: 'weapon_cooldown_reduction',
                durationMs: 5000,
                multiplier: 0.6,
            };
             const applyHandler = mockEventBusOn.mock.calls.find(
                (call) => call[0] === Events.POWERUP_EFFECT_APPLIED
            )?.[1];
            if (applyHandler) applyHandler(powerupData);
            expect(handler.getCurrentCooldownMultiplier()).toBe(0.6); // Verify activation
            mockLoggerLog.mockClear(); // Clear log calls from activation
        });

        it('should deactivate rapid fire and reset multiplier for weapon_cooldown_reduction', () => {
            const powerupData: PowerupEffectData = {
                // instanceId: 'p1', // Removed invalid property
                configId: 'rapid_fire',
                effect: 'weapon_cooldown_reduction',
                // Duration/multiplier not strictly needed for removal logic, but need duration for type
                durationMs: 5000, // Added duration to satisfy type
            };

            // Simulate the removal event
             const removeHandler = mockEventBusOn.mock.calls.find(
                (call) => call[0] === Events.POWERUP_EFFECT_REMOVED
            )?.[1];
            expect(removeHandler).toBeDefined();
            if (removeHandler) removeHandler(powerupData);


            expect(handler.getCurrentCooldownMultiplier()).toBe(1.0); // Reset to default
            expect(mockLoggerLog).toHaveBeenCalledWith('Rapid Fire deactivated.');
        });

        it('should ignore removal events for different effects', () => {
             const powerupData: PowerupEffectData = {
                // instanceId: 'p4', // Removed invalid property
                configId: 'shield',
                effect: 'temporary_invulnerability', // Different effect
                durationMs: 3000, // Added duration to satisfy type
            };
             const removeHandler = mockEventBusOn.mock.calls.find(
                (call) => call[0] === Events.POWERUP_EFFECT_REMOVED
            )?.[1];
             if (removeHandler) removeHandler(powerupData);

            expect(handler.getCurrentCooldownMultiplier()).toBe(0.6); // Should remain active
            expect(mockLoggerLog).not.toHaveBeenCalledWith('Rapid Fire deactivated.');
        });
    });

     it('should unregister listeners on destroy', () => {
        handler.destroy();
        expect(mockEventBusOff).toHaveBeenCalledWith(
            Events.POWERUP_EFFECT_APPLIED,
            expect.any(Function)
        );
        expect(mockEventBusOff).toHaveBeenCalledWith(
            Events.POWERUP_EFFECT_REMOVED,
            expect.any(Function)
        );
        expect(mockEventBusOff).toHaveBeenCalledTimes(2);
        expect(mockLoggerLog).toHaveBeenCalledWith('WeaponPowerupHandler destroyed.');
    });
});