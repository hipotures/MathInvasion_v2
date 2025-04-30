/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import PlayerManager from '../../../src/core/managers/PlayerManager'; // Default import
import { EventBus } from '../../../src/core/events/EventBus';
import type { PlayerConfig } from '../../../src/core/config/schemas/playerSchema';
import {
  PLAYER_HIT_ENEMY,
  PLAYER_HIT_PROJECTILE,
  MOVE_LEFT_START,
  MOVE_LEFT_STOP,
  MOVE_RIGHT_START,
  MOVE_RIGHT_STOP,
} from '../../../src/core/constants/events';

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

describe('PlayerManager: Cleanup', () => {
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

  it('should unregister listeners and destroy helper on destroy', () => {
    // Capture listener references *before* calling destroy
    const moveLeftStartRef = findVoidListener(MOVE_LEFT_START, mockEventBus);
    const moveLeftStopRef = findVoidListener(MOVE_LEFT_STOP, mockEventBus);
    const moveRightStartRef = findVoidListener(MOVE_RIGHT_START, mockEventBus);
    const moveRightStopRef = findVoidListener(MOVE_RIGHT_STOP, mockEventBus);
    const hitEnemyRef = findListener(PLAYER_HIT_ENEMY, mockEventBus);
    const hitProjectileRef = findListener(PLAYER_HIT_PROJECTILE, mockEventBus);

    playerManager.destroy();

    // Verify listeners are unregistered using the captured references
    expect(mockEventBus.off).toHaveBeenCalledWith(MOVE_LEFT_START, moveLeftStartRef);
    expect(mockEventBus.off).toHaveBeenCalledWith(MOVE_LEFT_STOP, moveLeftStopRef);
    expect(mockEventBus.off).toHaveBeenCalledWith(MOVE_RIGHT_START, moveRightStartRef);
    expect(mockEventBus.off).toHaveBeenCalledWith(MOVE_RIGHT_STOP, moveRightStopRef);
    expect(mockEventBus.off).toHaveBeenCalledWith(PLAYER_HIT_ENEMY, hitEnemyRef);
    expect(mockEventBus.off).toHaveBeenCalledWith(PLAYER_HIT_PROJECTILE, hitProjectileRef);

    // Verify helper destroy was called
    expect(mockPlayerPowerupHandlerInstance.destroy).toHaveBeenCalled();
  });
});
