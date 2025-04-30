import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlayerPowerupHandler } from '../../../../src/core/managers/helpers/PlayerPowerupHandler';
import { EventBus } from '../../../../src/core/events/EventBus';
import { Logger } from '../../../../src/core/utils/Logger';
import * as Events from '../../../../src/core/constants/events';
import { PowerupEffectData } from '../../../../src/core/managers/PowerupManager';

// Mock dependencies
const mockLoggerLog = vi.fn();
vi.mock('../../../../src/core/utils/Logger', () => {
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
    return {
        EventBus: vi.fn().mockImplementation(() => ({
            on: mockEventBusOn,
            off: mockEventBusOff,
            emit: vi.fn(),
            cleanup: vi.fn(),
        })),
    };
});

describe('PlayerPowerupHandler', () => {
    let handler: PlayerPowerupHandler;
    let mockEventBus: EventBus;
    let mockLogger: Logger;

    // Helper to get the registered event handler function from the mock
    const getEventHandler = (eventName: string) => {
        return mockEventBusOn.mock.calls.find(call => call[0] === eventName)?.[1];
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockEventBus = new EventBus();
        mockLogger = new Logger();
        handler = new PlayerPowerupHandler(mockEventBus, mockLogger);
    });

    afterEach(() => {
        handler.destroy();
    });

    it('should initialize and register listeners', () => {
        expect(handler).toBeDefined();
        expect(mockLoggerLog).toHaveBeenCalledWith('PlayerPowerupHandler initialized.');
        expect(mockEventBusOn).toHaveBeenCalledWith(
            Events.POWERUP_EFFECT_APPLIED,
            expect.any(Function)
        );
        expect(mockEventBusOn).toHaveBeenCalledWith(
            Events.POWERUP_EFFECT_REMOVED,
            expect.any(Function)
        );
        expect(mockEventBusOn).toHaveBeenCalledTimes(2);
    });

    it('should return shield inactive initially', () => {
        expect(handler.isShieldPowerupActive()).toBe(false);
    });

    describe('handlePowerupEffectApplied', () => {
        it('should activate shield for temporary_invulnerability effect', () => {
            const powerupData: PowerupEffectData = {
                configId: 'shield_powerup',
                effect: 'temporary_invulnerability',
                durationMs: 5000,
            };
            const applyHandler = getEventHandler(Events.POWERUP_EFFECT_APPLIED);
            expect(applyHandler).toBeDefined();

            if (applyHandler) {
                applyHandler(powerupData);
            }

            expect(handler.isShieldPowerupActive()).toBe(true);
            expect(mockLoggerLog).toHaveBeenCalledWith('Player Shield activated for 5000ms');
        });

        it('should ignore powerups with different effects', () => {
            const powerupData: PowerupEffectData = {
                configId: 'rapid_fire',
                effect: 'weapon_cooldown_reduction', // Different effect
                durationMs: 3000,
                multiplier: 0.5,
            };
            const applyHandler = getEventHandler(Events.POWERUP_EFFECT_APPLIED);
            if (applyHandler) applyHandler(powerupData);

            expect(handler.isShieldPowerupActive()).toBe(false); // Should remain inactive
            expect(mockLoggerLog).not.toHaveBeenCalledWith(expect.stringContaining('Player Shield activated'));
        });
    });

    describe('handlePowerupEffectRemoved', () => {
        beforeEach(() => {
            // Activate shield first
            const powerupData: PowerupEffectData = {
                configId: 'shield_powerup',
                effect: 'temporary_invulnerability',
                durationMs: 5000,
            };
            const applyHandler = getEventHandler(Events.POWERUP_EFFECT_APPLIED);
            if (applyHandler) applyHandler(powerupData);
            expect(handler.isShieldPowerupActive()).toBe(true); // Verify activation
            mockLoggerLog.mockClear(); // Clear log calls from activation
        });

        it('should deactivate shield for temporary_invulnerability effect', () => {
            const powerupData: PowerupEffectData = {
                configId: 'shield_powerup',
                effect: 'temporary_invulnerability',
                durationMs: 5000, // Duration needed for type
            };
            const removeHandler = getEventHandler(Events.POWERUP_EFFECT_REMOVED);
            expect(removeHandler).toBeDefined();

            if (removeHandler) {
                removeHandler(powerupData);
            }

            expect(handler.isShieldPowerupActive()).toBe(false); // Reset to inactive
            expect(mockLoggerLog).toHaveBeenCalledWith('Player Shield deactivated.');
        });

        it('should ignore removal events for different effects', () => {
            const powerupData: PowerupEffectData = {
                configId: 'rapid_fire',
                effect: 'weapon_cooldown_reduction', // Different effect
                durationMs: 3000,
                multiplier: 0.5,
            };
            const removeHandler = getEventHandler(Events.POWERUP_EFFECT_REMOVED);
            if (removeHandler) removeHandler(powerupData);

            expect(handler.isShieldPowerupActive()).toBe(true); // Should remain active
            expect(mockLoggerLog).not.toHaveBeenCalledWith('Player Shield deactivated.');
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
        expect(mockLoggerLog).toHaveBeenCalledWith('PlayerPowerupHandler destroyed.');
    });
});