/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import PlayerManager from '../../../src/core/managers/PlayerManager'; // Default import
import { EventBus } from '../../../src/core/events/EventBus';
import type { PlayerConfig } from '../../../src/core/config/schemas/playerSchema';
import {
  PLAYER_STATE_UPDATED,
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

describe('PlayerManager: Initialization & State', () => {
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
