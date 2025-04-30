/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import PlayerManager from '../../../src/core/managers/PlayerManager'; // Default import
import { EventBus } from '../../../src/core/events/EventBus';
import type { PlayerConfig } from '../../../src/core/config/schemas/playerSchema';
import {
  PLAYER_STATE_UPDATED,
  MOVE_LEFT_START,
  MOVE_LEFT_STOP,
  MOVE_RIGHT_START,
  MOVE_RIGHT_STOP,
} from '../../../src/core/constants/events';

// Mocks
vi.mock('../../../src/core/events/EventBus');
vi.mock('../../../src/core/utils/Logger'); // PlayerManager uses Logger internally

// Mock the helper (minimal needed for setup)
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
type VoidListenerFn = () => void;

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

describe('PlayerManager: Movement', () => {
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
