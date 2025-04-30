/// <reference types="vitest/globals" />

// Explicitly import from vitest
import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest'; // Import vi (removed unused Mock)
import PlayerManager from '../../../src/core/managers/PlayerManager'; // Default import
import { EventBus } from '../../../src/core/events/EventBus';
import { Logger } from '../../../src/core/utils/Logger'; // Logger is used by PlayerManager internally, keep import if needed by mocks later? No, remove if mockLogger removed.
import type { PlayerConfig } from '../../../src/core/config/schemas/playerSchema';
// import type EconomyManager from '../../../src/core/managers/EconomyManager'; // Removed unused import
import {
  PLAYER_STATE_UPDATED,
  PLAYER_DIED,
  PLAYER_HIT_ENEMY,
  PLAYER_HIT_PROJECTILE,
  PLAYER_INVULNERABILITY_START,
  PLAYER_INVULNERABILITY_END,
  MOVE_LEFT_START,
  MOVE_LEFT_STOP,
  MOVE_RIGHT_START,
  MOVE_RIGHT_STOP,
} from '../../../src/core/constants/events'; // Removed unused POWERUP events
import { PlayerPowerupHandler } from '../../../src/core/managers/helpers/PlayerPowerupHandler'; // Import class for mocking
// Mock dependencies using vi
vi.mock('../../../src/core/events/EventBus');
vi.mock('../../../src/core/utils/Logger');
// Mock the helper - we test the manager's interaction with it, not the helper itself here
// Mock the helper module using vi.fn() for the class and its methods
const mockPlayerPowerupHandlerInstance = {
  isShieldPowerupActive: vi.fn().mockReturnValue(false), // Default mock behavior
  destroy: vi.fn(),
  handlePowerupEffectApplied: vi.fn(),
  handlePowerupEffectRemoved: vi.fn(),
};
vi.mock('../../../src/core/managers/helpers/PlayerPowerupHandler', () => {
  // Return a mock constructor that returns our predefined instance
  return {
    PlayerPowerupHandler: vi.fn().mockImplementation(() => mockPlayerPowerupHandlerInstance),
  };
});

describe('PlayerManager', () => {
  let playerManager: PlayerManager;
  let mockEventBus: Mocked<EventBus>; // Use Mocked type
  // let mockLogger: Mocked<Logger>; // Removed unused variable
  let mockPlayerConfig: PlayerConfig;
  // let mockEconomyManager: EconomyManager; // Removed unused variable
  // let mockPlayerPowerupHandler: Mocked<PlayerPowerupHandler>; // Removed unused variable

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create fresh mock instances using vi.mocked
    mockEventBus = vi.mocked(new EventBus());
    // mockLogger = vi.mocked(new Logger()); // Removed unused variable
    mockPlayerConfig = {
      initialHealth: 100,
      moveSpeed: 200,
      invulnerabilityDurationMs: 1000, // Example duration
    };
    // mockEconomyManager = {} as EconomyManager; // Placeholder if needed

    // Instantiate the manager with mocks - Constructor only takes eventBus and config
    playerManager = new PlayerManager(mockEventBus, mockPlayerConfig);

    // Get the instance of the mocked helper created within the PlayerManager constructor
    // This relies on the assumption PlayerManager instantiates it internally.
    // If PlayerPowerupHandler is injected, adjust this.
    // We might need to spy on the constructor or adjust the mock setup if this doesn't work directly.
    // For now, let's assume PlayerManager creates it and we can access it or test its effects indirectly.
    // A better approach might be to inject the mocked handler. Let's refine this if needed.

    // Re-mocking the constructor call to capture the instance might be complex.
    // Let's test by verifying PlayerManager calls the *methods* of the handler instance.
    // We know the mock constructor was called once due to the vi.mock setup.
  });

  it('should initialize with correct health from config and emit initial state', () => {
    // Health is private, check the emitted event
    // Speed is managed internally based on input, but initial config value is stored.
    // We can't directly test moveSpeed application without simulating input events.
    // Let's verify the initial state emission.
    expect(mockEventBus.emit).toHaveBeenCalledWith(PLAYER_STATE_UPDATED, {
      health: mockPlayerConfig.initialHealth,
      velocityX: 0, // Initial velocity
      velocityY: 0,
      x: 0, // Initial position (assuming 0 for test)
      y: 0,
      isEffectivelyInvulnerable: false, // Should be false due to mock default
    });
  });

  it('should register event listeners on initialization', () => {
    expect(mockEventBus.on).toHaveBeenCalledWith(PLAYER_HIT_ENEMY, expect.any(Function));
    expect(mockEventBus.on).toHaveBeenCalledWith(PLAYER_HIT_PROJECTILE, expect.any(Function));
    // Powerup handler listeners are mocked, verify PlayerManager *delegates* by checking mock calls later
  });

  it('should decrease health and emit state update when handling PLAYER_HIT_ENEMY', () => {
    const initialHealth = mockPlayerConfig.initialHealth; // Get initial health from config
    const damage = 10;
    const enemyId = 'enemy1';

    // Simulate the event - Find the handler function registered with mockEventBus.on
    const hitEnemyHandler = vi
      .mocked(mockEventBus.on)
      .mock.calls.find((call) => call[0] === PLAYER_HIT_ENEMY)?.[1];
    if (!hitEnemyHandler) throw new Error('PLAYER_HIT_ENEMY handler not registered');
    hitEnemyHandler({ damage, enemyId });

    // Check emitted state for updated health
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      PLAYER_STATE_UPDATED,
      expect.objectContaining({
        health: initialHealth - damage,
      })
    );
    // PLAYER_INVULNERABILITY_START has no payload
    expect(mockEventBus.emit).toHaveBeenCalledWith(PLAYER_INVULNERABILITY_START);
  });

  it('should decrease health and emit state update when handling PLAYER_HIT_PROJECTILE', () => {
    const initialHealth = mockPlayerConfig.initialHealth; // Get initial health from config
    const damage = 5;
    const projectileId = 'proj1';

    // Simulate the event
    const hitProjectileHandler = vi
      .mocked(mockEventBus.on)
      .mock.calls.find((call) => call[0] === PLAYER_HIT_PROJECTILE)?.[1];
    if (!hitProjectileHandler) throw new Error('PLAYER_HIT_PROJECTILE handler not registered');
    hitProjectileHandler({ damage, projectileId });

    // Check emitted state for updated health
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      PLAYER_STATE_UPDATED,
      expect.objectContaining({
        health: initialHealth - damage,
      })
    );
    // PLAYER_INVULNERABILITY_START has no payload
    expect(mockEventBus.emit).toHaveBeenCalledWith(PLAYER_INVULNERABILITY_START);
  });

  it('should not decrease health if already invulnerable', () => {
    // Manually set invulnerable state for testing
    // Manually set internal state for testing (use with caution)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (playerManager as any).isInvulnerable = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (playerManager as any).invulnerabilityTimer = 500; // Set some time remaining

    // const initialHealth = mockPlayerConfig.initialHealth; // Removed unused variable
    const damage = 10;

    // Simulate hit event
    const hitEnemyHandler = vi
      .mocked(mockEventBus.on)
      .mock.calls.find((call) => call[0] === PLAYER_HIT_ENEMY)?.[1];
    if (!hitEnemyHandler) throw new Error('PLAYER_HIT_ENEMY handler not registered');
    hitEnemyHandler({ damage, enemyId: 'enemy1' });

    // Verify that taking damage doesn't happen (PLAYER_INVULNERABILITY_START is not emitted)
    // Clear previous emit calls to be sure
    vi.mocked(mockEventBus.emit).mockClear();
    hitEnemyHandler({ damage, enemyId: 'enemy1' }); // Hit again while invulnerable

    // Assert that the damage/invulnerability logic was skipped
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(PLAYER_INVULNERABILITY_START);
    // Also check that health didn't change by checking the *next* state update (if any)
    // or by adding a getter if necessary (but let's avoid for now)
  });

  it('should emit PLAYER_DIED and update state when health drops to 0 or below', () => {
    const initialHealth = mockPlayerConfig.initialHealth;
    const damage = initialHealth + 10; // Ensure health drops below 0

    // Simulate hit event
    const hitEnemyHandler = vi
      .mocked(mockEventBus.on)
      .mock.calls.find((call) => call[0] === PLAYER_HIT_ENEMY)?.[1];
    if (!hitEnemyHandler) throw new Error('PLAYER_HIT_ENEMY handler not registered');
    hitEnemyHandler({ damage, enemyId: 'enemy1' });

    // Check PLAYER_DIED was emitted (no payload)
    expect(mockEventBus.emit).toHaveBeenCalledWith(PLAYER_DIED);
    // Check the final state update shows health <= 0 and stopped movement
    const stateUpdateCalls = vi
      .mocked(mockEventBus.emit)
      .mock.calls.filter((call) => call[0] === PLAYER_STATE_UPDATED);
    const lastStateUpdate = stateUpdateCalls[stateUpdateCalls.length - 1][1];
    expect(lastStateUpdate.health).toBeLessThanOrEqual(0); // This check is correct
    expect(lastStateUpdate).toEqual(
      expect.objectContaining({
        // isMovingLeft/Right are not part of the payload
        // Remove the health check from here, it's checked above
        velocityX: 0, // Should stop
        isEffectivelyInvulnerable: false, // Should not be invulnerable when dead
      })
    );
  });

  it('should handle invulnerability timer in update method', () => {
    // Start invulnerability
    const hitEnemyHandler = vi
      .mocked(mockEventBus.on)
      .mock.calls.find((call) => call[0] === PLAYER_HIT_ENEMY)?.[1];
    if (!hitEnemyHandler) throw new Error('PLAYER_HIT_ENEMY handler not registered');
    hitEnemyHandler({ damage: 1, enemyId: 'enemy1' }); // Take minimal damage to trigger invulnerability

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((playerManager as any).isInvulnerable).toBe(true);
    // PLAYER_INVULNERABILITY_START has no payload
    expect(mockEventBus.emit).toHaveBeenCalledWith(PLAYER_INVULNERABILITY_START);

    // Simulate time passing (less than duration)
    playerManager.update(mockPlayerConfig.invulnerabilityDurationMs / 2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((playerManager as any).isInvulnerable).toBe(true);
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(PLAYER_INVULNERABILITY_END); // Corrected assertion (no payload)

    // Simulate time passing (exactly duration)
    playerManager.update(mockPlayerConfig.invulnerabilityDurationMs / 2); // Total time = duration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((playerManager as any).isInvulnerable).toBe(false);
    // PLAYER_INVULNERABILITY_END has no payload
    expect(mockEventBus.emit).toHaveBeenCalledWith(PLAYER_INVULNERABILITY_END);
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      PLAYER_STATE_UPDATED,
      expect.objectContaining({
        // isInvulnerable is internal state
        isEffectivelyInvulnerable: false, // Assuming no powerup shield
      })
    );
  });

  // Add tests for movement state changes by simulating events
  it('should update velocityX and emit state when MOVE_LEFT_START event is received', () => {
    // Find the handler PlayerManager registered for MOVE_LEFT_START
    const moveLeftStartHandler = vi
      .mocked(mockEventBus.on)
      .mock.calls.find((call) => call[0] === MOVE_LEFT_START)?.[1];
    if (!moveLeftStartHandler) throw new Error('MOVE_LEFT_START handler not registered');
    moveLeftStartHandler();

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      PLAYER_STATE_UPDATED,
      expect.objectContaining({
        velocityX: -mockPlayerConfig.moveSpeed, // Check velocity is negative speed
      })
    );
  });

  it('should update velocityX and emit state when MOVE_RIGHT_START event is received', () => {
    const moveRightStartHandler = vi
      .mocked(mockEventBus.on)
      .mock.calls.find((call) => call[0] === MOVE_RIGHT_START)?.[1];
    if (!moveRightStartHandler) throw new Error('MOVE_RIGHT_START handler not registered');
    moveRightStartHandler();

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      PLAYER_STATE_UPDATED,
      expect.objectContaining({
        velocityX: mockPlayerConfig.moveSpeed, // Check velocity is positive speed
      })
    );
  });

  it('should update velocityX to 0 and emit state when MOVE_LEFT_STOP event is received', () => {
    // Start moving first
    const moveLeftStartHandler = vi
      .mocked(mockEventBus.on)
      .mock.calls.find((call) => call[0] === MOVE_LEFT_START)?.[1];
    if (!moveLeftStartHandler) throw new Error('MOVE_LEFT_START handler not registered');
    moveLeftStartHandler();
    vi.mocked(mockEventBus.emit).mockClear(); // Clear mocks to check only the stop event

    // Stop moving
    const moveLeftStopHandler = vi
      .mocked(mockEventBus.on)
      .mock.calls.find((call) => call[0] === MOVE_LEFT_STOP)?.[1];
    if (!moveLeftStopHandler) throw new Error('MOVE_LEFT_STOP handler not registered');
    moveLeftStopHandler();

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      PLAYER_STATE_UPDATED,
      expect.objectContaining({
        velocityX: 0, // Check velocity is zero
      })
    );
  });

  it('should update velocityX to 0 and emit state when MOVE_RIGHT_STOP event is received', () => {
    // Start moving first
    const moveRightStartHandler = vi
      .mocked(mockEventBus.on)
      .mock.calls.find((call) => call[0] === MOVE_RIGHT_START)?.[1];
    if (!moveRightStartHandler) throw new Error('MOVE_RIGHT_START handler not registered');
    moveRightStartHandler();
    vi.mocked(mockEventBus.emit).mockClear(); // Clear mocks

    // Stop moving
    const moveRightStopHandler = vi
      .mocked(mockEventBus.on)
      .mock.calls.find((call) => call[0] === MOVE_RIGHT_STOP)?.[1];
    if (!moveRightStopHandler) throw new Error('MOVE_RIGHT_STOP handler not registered');
    moveRightStopHandler();

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      PLAYER_STATE_UPDATED,
      expect.objectContaining({
        velocityX: 0, // Check velocity is zero
      })
    );
  });

  // Test interaction with PlayerPowerupHandler by checking the outcome (isEffectivelyInvulnerable state)
  it('should report isEffectivelyInvulnerable correctly based on shield powerup state', () => {
    // --- Test Case 1: Shield Active ---
    // 1. Mock the handler instance's method to return true
    mockPlayerPowerupHandlerInstance.isShieldPowerupActive.mockReturnValue(true);

    // 2. Trigger PlayerManager to emit a state update reliably
    //    Simulate stopping then starting movement to guarantee velocity change -> emit
    const moveLeftStopHandler = vi
      .mocked(mockEventBus.on)
      .mock.calls.find((call) => call[0] === MOVE_LEFT_STOP)?.[1];
    const moveLeftStartHandler = vi
      .mocked(mockEventBus.on)
      .mock.calls.find((call) => call[0] === MOVE_LEFT_START)?.[1];
    if (!moveLeftStopHandler || !moveLeftStartHandler)
      throw new Error('Movement handlers not registered');
    moveLeftStopHandler(); // Ensure velocity is 0
    vi.mocked(mockEventBus.emit).mockClear(); // Clear emits before the action we care about
    moveLeftStartHandler(); // Start moving, should trigger emit

    // 3. Verify the emitted state reflects the active shield
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      PLAYER_STATE_UPDATED,
      expect.objectContaining({
        isEffectivelyInvulnerable: true,
      })
    );

    // --- Test Case 2: Shield Inactive ---
    vi.mocked(mockEventBus.emit).mockClear(); // Clear mocks again

    // 4. Mock the handler instance's method to return false
    mockPlayerPowerupHandlerInstance.isShieldPowerupActive.mockReturnValue(false);

    // 5. Trigger PlayerManager to emit another state update reliably
    moveLeftStopHandler(); // Stop
    vi.mocked(mockEventBus.emit).mockClear();
    moveLeftStartHandler(); // Start again

    // 6. Verify the emitted state reflects the inactive shield
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      PLAYER_STATE_UPDATED,
      expect.objectContaining({
        isEffectivelyInvulnerable: false, // Should be false now
      })
    );
  });

  it('should unregister listeners on destroy', () => {
    playerManager.destroy();
    // Check that the manager's own listeners are removed
    expect(mockEventBus.off).toHaveBeenCalledWith(MOVE_LEFT_START, expect.any(Function));
    expect(mockEventBus.off).toHaveBeenCalledWith(MOVE_LEFT_STOP, expect.any(Function));
    expect(mockEventBus.off).toHaveBeenCalledWith(MOVE_RIGHT_START, expect.any(Function));
    expect(mockEventBus.off).toHaveBeenCalledWith(MOVE_RIGHT_STOP, expect.any(Function));
    expect(mockEventBus.off).toHaveBeenCalledWith(PLAYER_HIT_ENEMY, expect.any(Function));
    expect(mockEventBus.off).toHaveBeenCalledWith(PLAYER_HIT_PROJECTILE, expect.any(Function));
    // PlayerManager no longer listens for these directly
    // expect(mockEventBus.off).toHaveBeenCalledWith(POWERUP_EFFECT_APPLIED, expect.any(Function));
    // expect(mockEventBus.off).toHaveBeenCalledWith(POWERUP_EFFECT_REMOVED, expect.any(Function));

    // Verify the helper instance's destroy mock was called
    expect(mockPlayerPowerupHandlerInstance.destroy).toHaveBeenCalled();
  });
});
