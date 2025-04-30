/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import PlayerManager from '../../../src/core/managers/PlayerManager'; // Default import
import { EventBus } from '../../../src/core/events/EventBus';
import type { PlayerConfig } from '../../../src/core/config/schemas/playerSchema';
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
} from '../../../src/core/constants/events';
// Removed unused import

// Mocks
vi.mock('../../../src/core/events/EventBus');
vi.mock('../../../src/core/utils/Logger'); // PlayerManager uses Logger internally

// Mock the helper
const mockPlayerPowerupHandlerInstance = {
  isShieldPowerupActive: vi.fn().mockReturnValue(false),
  destroy: vi.fn(),
  handlePowerupEffectApplied: vi.fn(),
  handlePowerupEffectRemoved: vi.fn(),
};
vi.mock('../../../src/core/managers/helpers/PlayerPowerupHandler', () => {
  return {
    PlayerPowerupHandler: vi.fn().mockImplementation(() => mockPlayerPowerupHandlerInstance),
  };
}); // Correctly closed mock

// Helper to find the specific listener function attached to the mock EventBus
// Define specific listener types
type ListenerFn<T> = (payload: T) => void;
type VoidListenerFn = () => void;

const findListener = <T>(
  eventName: string,
  mockBus: Mocked<EventBus>
): ListenerFn<T> | undefined => {
  const call = mockBus.on.mock.calls.find(
    // Ensure type safety in the find callback
    (c): c is [string, ListenerFn<T>] => c[0] === eventName
  );
  return call ? call[1] : undefined;
};

const findVoidListener = (
  eventName: string,
  mockBus: Mocked<EventBus>
): VoidListenerFn | undefined => {
  const call = mockBus.on.mock.calls.find(
    // Ensure type safety in the find callback
    (c): c is [string, VoidListenerFn] => c[0] === eventName
  );
  return call ? call[1] : undefined;
};

describe('PlayerManager', () => {
  let playerManager: PlayerManager;
  let mockEventBus: Mocked<EventBus>;
  let mockPlayerConfig: PlayerConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEventBus = vi.mocked(new EventBus());
    mockPlayerConfig = {
      initialHealth: 100,
      moveSpeed: 200,
      invulnerabilityDurationMs: 1000,
    };

    // Reset mock handler state
    mockPlayerPowerupHandlerInstance.isShieldPowerupActive.mockReturnValue(false);

    playerManager = new PlayerManager(mockEventBus, mockPlayerConfig);
  });

  describe('Initialization & State', () => {
    it('should initialize with correct health from config and emit initial state', () => {
      expect(mockEventBus.emit).toHaveBeenCalledWith(PLAYER_STATE_UPDATED, {
        health: mockPlayerConfig.initialHealth,
        velocityX: 0,
        velocityY: 0,
        x: 0,
        y: 0,
        isEffectivelyInvulnerable: false,
      });
    });

    it('should register event listeners on initialization', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith(PLAYER_HIT_ENEMY, expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith(PLAYER_HIT_PROJECTILE, expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith(MOVE_LEFT_START, expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith(MOVE_LEFT_STOP, expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith(MOVE_RIGHT_START, expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith(MOVE_RIGHT_STOP, expect.any(Function));
    });
  });

  describe('Damage & Invulnerability', () => {
    it('should decrease health and emit state update when handling PLAYER_HIT_ENEMY', () => {
      const initialHealth = mockPlayerConfig.initialHealth;
      const damage = 10;
      const hitEnemyHandler = findListener<{ damage: number; enemyId: string }>(
        PLAYER_HIT_ENEMY,
        mockEventBus
      );
      if (!hitEnemyHandler) throw new Error('PLAYER_HIT_ENEMY handler not registered');

      hitEnemyHandler({ damage, enemyId: 'enemy1' });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        PLAYER_STATE_UPDATED,
        expect.objectContaining({ health: initialHealth - damage })
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith(PLAYER_INVULNERABILITY_START);
    });

    it('should decrease health and emit state update when handling PLAYER_HIT_PROJECTILE', () => {
      const initialHealth = mockPlayerConfig.initialHealth;
      const damage = 5;
      const hitProjectileHandler = findListener<{ damage: number; projectileId: string }>(
        PLAYER_HIT_PROJECTILE,
        mockEventBus
      );
      if (!hitProjectileHandler) throw new Error('PLAYER_HIT_PROJECTILE handler not registered');

      hitProjectileHandler({ damage, projectileId: 'proj1' });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        PLAYER_STATE_UPDATED,
        expect.objectContaining({ health: initialHealth - damage })
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith(PLAYER_INVULNERABILITY_START);
    });

    it('should not decrease health if already invulnerable (post-hit)', () => {
      const hitEnemyHandler = findListener<{ damage: number; enemyId: string }>(
        PLAYER_HIT_ENEMY,
        mockEventBus
      );
      if (!hitEnemyHandler) throw new Error('PLAYER_HIT_ENEMY handler not registered');

      hitEnemyHandler({ damage: 1, enemyId: 'enemy1' }); // Trigger invulnerability
      vi.mocked(mockEventBus.emit).mockClear();

      hitEnemyHandler({ damage: 10, enemyId: 'enemy2' }); // Hit again

      expect(mockEventBus.emit).not.toHaveBeenCalledWith(PLAYER_INVULNERABILITY_START);
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        PLAYER_STATE_UPDATED,
        expect.objectContaining({ health: expect.any(Number) })
      );
    });

    it('should not decrease health if shield powerup is active', () => {
      mockPlayerPowerupHandlerInstance.isShieldPowerupActive.mockReturnValue(true);
      const initialHealth = mockPlayerConfig.initialHealth;
      const hitEnemyHandler = findListener<{ damage: number; enemyId: string }>(
        PLAYER_HIT_ENEMY,
        mockEventBus
      );
      if (!hitEnemyHandler) throw new Error('PLAYER_HIT_ENEMY handler not registered');

      hitEnemyHandler({ damage: 50, enemyId: 'enemy_shield_test' });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        PLAYER_STATE_UPDATED,
        expect.objectContaining({ health: initialHealth })
      );
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(PLAYER_INVULNERABILITY_START);
    });

    it('should handle invulnerability timer in update method', () => {
      const hitEnemyHandler = findListener<{ damage: number; enemyId: string }>(
        PLAYER_HIT_ENEMY,
        mockEventBus
      );
      if (!hitEnemyHandler) throw new Error('PLAYER_HIT_ENEMY handler not registered');

      hitEnemyHandler({ damage: 1, enemyId: 'enemy1' }); // Start invulnerability
      expect(mockEventBus.emit).toHaveBeenCalledWith(PLAYER_INVULNERABILITY_START);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((playerManager as any).isInvulnerable).toBe(true);

      playerManager.update(mockPlayerConfig.invulnerabilityDurationMs / 2); // Less than duration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((playerManager as any).isInvulnerable).toBe(true);
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(PLAYER_INVULNERABILITY_END);

      playerManager.update(mockPlayerConfig.invulnerabilityDurationMs / 2); // Exactly duration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((playerManager as any).isInvulnerable).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(PLAYER_INVULNERABILITY_END);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        PLAYER_STATE_UPDATED,
        expect.objectContaining({ isEffectivelyInvulnerable: false })
      );
    });

    it('should report isEffectivelyInvulnerable correctly based on shield powerup state', () => {
      const moveLeftStartHandler = findVoidListener(MOVE_LEFT_START, mockEventBus);
      const moveLeftStopHandler = findVoidListener(MOVE_LEFT_STOP, mockEventBus);
      if (!moveLeftStartHandler || !moveLeftStopHandler)
        throw new Error('Movement handlers not registered');

      // Shield Active
      mockPlayerPowerupHandlerInstance.isShieldPowerupActive.mockReturnValue(true);
      moveLeftStopHandler();
      vi.mocked(mockEventBus.emit).mockClear();
      moveLeftStartHandler();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        PLAYER_STATE_UPDATED,
        expect.objectContaining({ isEffectivelyInvulnerable: true })
      );

      // Shield Inactive
      vi.mocked(mockEventBus.emit).mockClear();
      mockPlayerPowerupHandlerInstance.isShieldPowerupActive.mockReturnValue(false);
      moveLeftStopHandler();
      vi.mocked(mockEventBus.emit).mockClear();
      moveLeftStartHandler();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        PLAYER_STATE_UPDATED,
        expect.objectContaining({ isEffectivelyInvulnerable: false })
      );
    });
  });

  describe('Death', () => {
    it('should emit PLAYER_DIED and update state when health drops to 0 or below', () => {
      const initialHealth = mockPlayerConfig.initialHealth;
      const damage = initialHealth + 10;
      const hitEnemyHandler = findListener<{ damage: number; enemyId: string }>(
        PLAYER_HIT_ENEMY,
        mockEventBus
      );
      if (!hitEnemyHandler) throw new Error('PLAYER_HIT_ENEMY handler not registered');

      hitEnemyHandler({ damage, enemyId: 'enemy1' });

      expect(mockEventBus.emit).toHaveBeenCalledWith(PLAYER_DIED);
      const stateUpdateCalls = vi
        .mocked(mockEventBus.emit)
        .mock.calls.filter((call) => call[0] === PLAYER_STATE_UPDATED);
      const lastStateUpdate = stateUpdateCalls[stateUpdateCalls.length - 1][1];
      expect(lastStateUpdate.health).toBeLessThanOrEqual(0);
      expect(lastStateUpdate).toEqual(
        expect.objectContaining({
          velocityX: 0,
          isEffectivelyInvulnerable: false,
        })
      );
    });
  });

  describe('Movement', () => {
    it('should update velocityX and emit state when MOVE_LEFT_START event is received', () => {
      const moveLeftStartHandler = findVoidListener(MOVE_LEFT_START, mockEventBus);
      if (!moveLeftStartHandler) throw new Error('MOVE_LEFT_START handler not registered');
      moveLeftStartHandler();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        PLAYER_STATE_UPDATED,
        expect.objectContaining({ velocityX: -mockPlayerConfig.moveSpeed })
      );
    });

    it('should update velocityX and emit state when MOVE_RIGHT_START event is received', () => {
      const moveRightStartHandler = findVoidListener(MOVE_RIGHT_START, mockEventBus);
      if (!moveRightStartHandler) throw new Error('MOVE_RIGHT_START handler not registered');
      moveRightStartHandler();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        PLAYER_STATE_UPDATED,
        expect.objectContaining({ velocityX: mockPlayerConfig.moveSpeed })
      );
    });

    it('should update velocityX to 0 and emit state when MOVE_LEFT_STOP event is received', () => {
      const moveLeftStartHandler = findVoidListener(MOVE_LEFT_START, mockEventBus);
      const moveLeftStopHandler = findVoidListener(MOVE_LEFT_STOP, mockEventBus);
      if (!moveLeftStartHandler || !moveLeftStopHandler)
        throw new Error('Movement handlers not registered');
      moveLeftStartHandler();
      vi.mocked(mockEventBus.emit).mockClear();
      moveLeftStopHandler();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        PLAYER_STATE_UPDATED,
        expect.objectContaining({ velocityX: 0 })
      );
    });

    it('should update velocityX to 0 and emit state when MOVE_RIGHT_STOP event is received', () => {
      const moveRightStartHandler = findVoidListener(MOVE_RIGHT_START, mockEventBus);
      const moveRightStopHandler = findVoidListener(MOVE_RIGHT_STOP, mockEventBus);
      if (!moveRightStartHandler || !moveRightStopHandler)
        throw new Error('Movement handlers not registered');
      moveRightStartHandler();
      vi.mocked(mockEventBus.emit).mockClear();
      moveRightStopHandler();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        PLAYER_STATE_UPDATED,
        expect.objectContaining({ velocityX: 0 })
      );
    });

    it('should handle overlapping movement commands correctly', () => {
      const moveLeftStartHandler = findVoidListener(MOVE_LEFT_START, mockEventBus);
      const moveRightStartHandler = findVoidListener(MOVE_RIGHT_START, mockEventBus);
      const moveLeftStopHandler = findVoidListener(MOVE_LEFT_STOP, mockEventBus);
      const moveRightStopHandler = findVoidListener(MOVE_RIGHT_STOP, mockEventBus);
      if (
        !moveLeftStartHandler ||
        !moveRightStartHandler ||
        !moveLeftStopHandler ||
        !moveRightStopHandler
      ) {
        throw new Error('Movement handlers not registered');
      }

      moveLeftStartHandler(); // Press Left
      expect(mockEventBus.emit).toHaveBeenLastCalledWith(
        PLAYER_STATE_UPDATED,
        expect.objectContaining({ velocityX: -mockPlayerConfig.moveSpeed })
      );

      moveRightStartHandler(); // Press Right (while Left pressed)
      expect(mockEventBus.emit).toHaveBeenLastCalledWith(
        PLAYER_STATE_UPDATED,
        expect.objectContaining({ velocityX: mockPlayerConfig.moveSpeed })
      );

      moveLeftStopHandler(); // Release Left (Right pressed)
      expect(mockEventBus.emit).toHaveBeenLastCalledWith(
        PLAYER_STATE_UPDATED,
        expect.objectContaining({ velocityX: mockPlayerConfig.moveSpeed })
      );

      moveRightStopHandler(); // Release Right
      expect(mockEventBus.emit).toHaveBeenLastCalledWith(
        PLAYER_STATE_UPDATED,
        expect.objectContaining({ velocityX: 0 })
      );
    });
  });

  describe('Cleanup', () => {
    it('should unregister listeners and destroy helper on destroy', () => {
      const moveLeftStartRef = findVoidListener(MOVE_LEFT_START, mockEventBus);
      const moveLeftStopRef = findVoidListener(MOVE_LEFT_STOP, mockEventBus);
      const moveRightStartRef = findVoidListener(MOVE_RIGHT_START, mockEventBus);
      const moveRightStopRef = findVoidListener(MOVE_RIGHT_STOP, mockEventBus);
      const hitEnemyRef = findListener(PLAYER_HIT_ENEMY, mockEventBus);
      const hitProjectileRef = findListener(PLAYER_HIT_PROJECTILE, mockEventBus);

      playerManager.destroy();

      expect(mockEventBus.off).toHaveBeenCalledWith(MOVE_LEFT_START, moveLeftStartRef);
      expect(mockEventBus.off).toHaveBeenCalledWith(MOVE_LEFT_STOP, moveLeftStopRef);
      expect(mockEventBus.off).toHaveBeenCalledWith(MOVE_RIGHT_START, moveRightStartRef);
      expect(mockEventBus.off).toHaveBeenCalledWith(MOVE_RIGHT_STOP, moveRightStopRef);
      expect(mockEventBus.off).toHaveBeenCalledWith(PLAYER_HIT_ENEMY, hitEnemyRef);
      expect(mockEventBus.off).toHaveBeenCalledWith(PLAYER_HIT_PROJECTILE, hitProjectileRef);

      expect(mockPlayerPowerupHandlerInstance.destroy).toHaveBeenCalled();
    });
  });
});
