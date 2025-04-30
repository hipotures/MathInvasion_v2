import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PowerupManager } from '../../../src/core/managers/PowerupManager';
import { EventBus } from '../../../src/core/events/EventBus';
import { Logger } from '../../../src/core/utils/Logger';
import { PowerupsConfig, PowerupConfig } from '../../../src/core/config/schemas/powerupSchema'; // Import PowerupConfig too
import * as Events from '../../../src/core/constants/events';
// Import types from the correct file
import type { RequestSpawnPowerupData, PowerupCollectedData, PowerupSpawnedData } from '../../../src/core/managers/PowerupManager';

// Mock dependencies
vi.mock('../../../src/core/events/EventBus');
vi.mock('../../../src/core/utils/Logger');

// Mock Powerup Config Data
const mockPowerupsConfig: PowerupsConfig = [
    {
        id: 'shield',
        name: 'Shield',
        visual: 'shield_icon',
        effect: 'temporary_invulnerability',
        durationMs: 5000,
        dropChance: 0 // Add placeholder dropChance
    },
    {
        id: 'rapid',
        name: 'Rapid Fire',
        visual: 'rapid_fire_icon',
        effect: 'weapon_cooldown_reduction',
        multiplier: 0.5,
        durationMs: 8000,
        dropChance: 0 // Add placeholder dropChance
    },
    {
        id: 'cash',
        name: 'Cash Boost',
        visual: 'cash_icon', // Assuming a visual key
        effect: 'currency_multiplier',
        multiplier: 2,
        durationMs: 10000,
        dropChance: 0 // Add placeholder dropChance
    }
];


describe('PowerupManager', () => {
    // Declare variables in the describe scope
    let powerupManager: PowerupManager;
    let mockEventBus: EventBus;
    let mockLogger: Logger;
    let emitSpy: ReturnType<typeof vi.spyOn>;
    let onSpy: ReturnType<typeof vi.spyOn>;
    let offSpy: ReturnType<typeof vi.spyOn>;
    // Variables to capture listener functions
    let requestSpawnListener: (data: RequestSpawnPowerupData) => void;
    let collectedListener: (data: PowerupCollectedData) => void;

    beforeEach(() => {
        vi.clearAllMocks();

        mockEventBus = new EventBus();
        mockLogger = new Logger();

        // Store spies
        emitSpy = vi.spyOn(mockEventBus, 'emit');
        offSpy = vi.spyOn(mockEventBus, 'off');
        vi.spyOn(mockLogger, 'log');
        vi.spyOn(mockLogger, 'debug');
        vi.spyOn(mockLogger, 'warn');
        vi.spyOn(mockLogger, 'error');

        // Capture listeners when 'on' is called
        onSpy = vi.spyOn(mockEventBus, 'on').mockImplementation((eventName, listener) => {
            if (eventName === Events.REQUEST_SPAWN_POWERUP) {
                requestSpawnListener = listener as (data: RequestSpawnPowerupData) => void;
            } else if (eventName === Events.POWERUP_COLLECTED) {
                collectedListener = listener as (data: PowerupCollectedData) => void;
            }
            // Return the mock instance for chaining or other purposes if needed
            return mockEventBus;
        });

        // Create manager instance AFTER setting up the 'on' spy
        powerupManager = new PowerupManager(mockEventBus, mockLogger, mockPowerupsConfig);
    });

    afterEach(() => {
        powerupManager.destroy(); // Ensure cleanup
    });

    // --- Tests --- (Now outside beforeEach)

    it('should initialize correctly', () => {
        expect(powerupManager).toBeDefined();
        expect(mockLogger.log).toHaveBeenCalledWith('PowerupManager initialized.');
    });

    it('should register listeners on init', () => {
        powerupManager.init(); // Call init to trigger listener registration
        expect(mockLogger.log).toHaveBeenCalledWith('PowerupManager listeners registered.');
        // Check that 'on' was called with the correct event names
        expect(onSpy).toHaveBeenCalledWith(Events.REQUEST_SPAWN_POWERUP, expect.any(Function));
        expect(onSpy).toHaveBeenCalledWith(Events.POWERUP_COLLECTED, expect.any(Function));
        // Ensure the listener variables were captured
        expect(requestSpawnListener).toBeDefined();
        expect(collectedListener).toBeDefined();
    });

    it('should handle REQUEST_SPAWN_POWERUP and emit POWERUP_SPAWNED', () => {
        powerupManager.init(); // Register listeners first

        const requestData: RequestSpawnPowerupData = {
            x: 100,
            y: 200,
            enemyId: 'enemy-1'
        };

        // Call the captured listener
        expect(requestSpawnListener).toBeDefined(); // Ensure listener was captured
        requestSpawnListener(requestData);

        // Check that POWERUP_SPAWNED was emitted
        expect(emitSpy).toHaveBeenCalledWith(Events.POWERUP_SPAWNED, expect.objectContaining({
            instanceId: 0, // First instance ID should be 0
            configId: expect.any(String), // Config ID will be one of the mocks
            x: 100,
            y: 200,
            visual: expect.any(String), // Visual key from the selected config
        }));

        // Check logger debug message - expect the full string or a more specific pattern
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringMatching(/^Powerup spawned: .+ \(Instance ID: \d+\) at \(\d+, \d+\)$/));
    });

     it('should handle POWERUP_COLLECTED, apply effect, and emit POWERUP_EFFECT_APPLIED', () => {
        powerupManager.init();

        // 1. Spawn a powerup first to get an instance ID
        const requestData: RequestSpawnPowerupData = { x: 100, y: 200, enemyId: 'enemy-1' };
        expect(requestSpawnListener).toBeDefined();
        requestSpawnListener(requestData);

        // Get the spawned powerup data from the emit call
        const spawnedEmitCall = emitSpy.mock.calls.find(call => call[0] === Events.POWERUP_SPAWNED);
        expect(spawnedEmitCall).toBeDefined();
        const spawnedData = spawnedEmitCall?.[1] as PowerupSpawnedData; // Use corrected import type
        const instanceId = spawnedData.instanceId;
        const configId = spawnedData.configId;
        const expectedConfig = mockPowerupsConfig.find(p => p.id === configId);
        expect(expectedConfig).toBeDefined();

        // 2. Simulate the POWERUP_COLLECTED event
        const collectedData: PowerupCollectedData = { instanceId };
        expect(collectedListener).toBeDefined(); // Ensure listener was captured
        collectedListener(collectedData);

        // 3. Check that POWERUP_EFFECT_APPLIED was emitted
        expect(emitSpy).toHaveBeenCalledWith(Events.POWERUP_EFFECT_APPLIED, expect.objectContaining({
            configId: expectedConfig!.id,
            effect: expectedConfig!.effect,
            multiplier: expectedConfig!.multiplier, // Will be undefined for shield
            durationMs: expectedConfig!.durationMs,
        }));

        // Check logger message
        expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining(`Powerup collected: ${expectedConfig!.name}`));
        expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining(`Applying powerup effect: ${expectedConfig!.effect}`));

        // TODO: Add test to check if spawnedPowerups map is cleared for this instanceId (requires internal access or another event)
    });

    it('should update timers and remove expired effects, emitting events', () => {
        powerupManager.init();
        vi.useFakeTimers(); // Use fake timers for this test

        // 1. Spawn and collect a powerup (e.g., shield with 5000ms duration)
        const requestData: RequestSpawnPowerupData = { x: 100, y: 200, enemyId: 'enemy-1' };
        expect(requestSpawnListener).toBeDefined();
        expect(collectedListener).toBeDefined();
        // Force spawn of shield for predictability
        const shieldConfig = mockPowerupsConfig.find(p => p.id === 'shield')!;
        vi.spyOn(Math, 'random').mockReturnValue(0); // Ensure first config (shield) is picked
        requestSpawnListener(requestData);
        const spawnedEmitCall = emitSpy.mock.calls.find(call => call[0] === Events.POWERUP_SPAWNED);
        const spawnedData = spawnedEmitCall?.[1] as PowerupSpawnedData; // Use corrected import type
        const instanceId = spawnedData.instanceId;

        const collectedData: PowerupCollectedData = { instanceId };
        collectedListener(collectedData);
        emitSpy.mockClear(); // Clear emit calls after setup

        // 2. Advance time partially
        powerupManager.update(3000); // Pass 3000ms
        expect(emitSpy).not.toHaveBeenCalledWith(Events.POWERUP_EFFECT_REMOVED, expect.anything());
        expect(emitSpy).not.toHaveBeenCalledWith(Events.POWERUP_EXPIRED, expect.anything());

        // 3. Advance time past expiration
        powerupManager.update(2500); // Pass another 2500ms (total 5500ms)

        // 4. Check events were emitted
        expect(emitSpy).toHaveBeenCalledWith(Events.POWERUP_EFFECT_REMOVED, expect.objectContaining({
            configId: 'shield',
            effect: 'temporary_invulnerability',
            durationMs: 5000,
        }));
        expect(emitSpy).toHaveBeenCalledWith(Events.POWERUP_EXPIRED, { configId: 'shield' });

        // Check logger message
        expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Removing powerup effect: temporary_invulnerability'));

        vi.restoreAllMocks(); // Restore Math.random
        vi.useRealTimers(); // Restore real timers
    });

     it('should reset timer if same effect type is collected again', () => {
        powerupManager.init();
        vi.useFakeTimers();

        // Force spawn/collect shield
        vi.spyOn(Math, 'random').mockReturnValue(0);
        expect(requestSpawnListener).toBeDefined();
        expect(collectedListener).toBeDefined();

        // Collect first shield
        requestSpawnListener({ x: 100, y: 100, enemyId: 'e1' });
        let spawnedEmitCall = emitSpy.mock.calls.find(call => call[0] === Events.POWERUP_SPAWNED);
        let spawnedData = spawnedEmitCall?.[1] as PowerupSpawnedData; // Use corrected import type
        collectedListener({ instanceId: spawnedData.instanceId });
        emitSpy.mockClear(); // Clear emits after first collection

        // Advance time partially (e.g., 3000ms)
        powerupManager.update(3000);

        // Collect second shield
        requestSpawnListener({ x: 200, y: 200, enemyId: 'e2' });
        spawnedEmitCall = emitSpy.mock.calls.find(call => call[0] === Events.POWERUP_SPAWNED); // Find the new spawn event
        spawnedData = spawnedEmitCall?.[1] as PowerupSpawnedData; // Use corrected import type
        collectedListener({ instanceId: spawnedData.instanceId });

        // Check POWERUP_EFFECT_APPLIED was NOT emitted again (timer just reset)
        expect(emitSpy).not.toHaveBeenCalledWith(Events.POWERUP_EFFECT_APPLIED, expect.anything());
        expect(mockLogger.debug).toHaveBeenCalledWith('Resetting timer for active effect: temporary_invulnerability');

        // Advance time past original expiration (e.g., 2500ms more, total 5500ms)
        powerupManager.update(2500);
        // Effect should NOT have expired yet because timer was reset
        expect(emitSpy).not.toHaveBeenCalledWith(Events.POWERUP_EFFECT_REMOVED, expect.anything());
        expect(emitSpy).not.toHaveBeenCalledWith(Events.POWERUP_EXPIRED, expect.anything());

         // Advance time past the *new* expiration (e.g., 3000ms more, total 8500ms from start, 5500ms from reset)
        powerupManager.update(3000);
        // Effect SHOULD have expired now
        expect(emitSpy).toHaveBeenCalledWith(Events.POWERUP_EFFECT_REMOVED, expect.objectContaining({ configId: 'shield' }));
        expect(emitSpy).toHaveBeenCalledWith(Events.POWERUP_EXPIRED, { configId: 'shield' });

        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('should unregister listeners on destroy', () => {
        powerupManager.init(); // Register first
        powerupManager.destroy();
        // Check that 'off' was called with the correct event names and any function,
        // because the manager calls .bind(this) again in unregisterListeners, creating new function references.
        // Alternatively, capture the bound functions if needed, but checking event name is usually sufficient.
        expect(offSpy).toHaveBeenCalledWith(Events.REQUEST_SPAWN_POWERUP, expect.any(Function));
        expect(offSpy).toHaveBeenCalledWith(Events.POWERUP_COLLECTED, expect.any(Function));
        expect(mockLogger.log).toHaveBeenCalledWith('PowerupManager destroyed.');
    });

});