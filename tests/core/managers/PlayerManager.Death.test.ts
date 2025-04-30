/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import PlayerManager from '../../../src/core/managers/PlayerManager'; // Default import
import { EventBus } from '../../../src/core/events/EventBus';
import type { PlayerConfig } from '../../../src/core/config/schemas/playerSchema';
import {
  PLAYER_STATE_UPDATED,
  PLAYER_DIED,
  PLAYER_HIT_ENEMY,
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

describe('PlayerManager: Death', () => {
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

  it('should emit PLAYER_DIED and update state when health drops to 0 or below', () => {
    const initialHealth = mockPlayerConfig.initialHealth;
    const damage = initialHealth + 10; // Damage exceeds health
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
        velocityX: 0, // Should stop moving on death
        isEffectivelyInvulnerable: false, // Invulnerability ends on death
      })
    );
  });
});
