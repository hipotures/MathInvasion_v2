import { describe, it, expect, beforeEach, vi, Mocked } from 'vitest';
import ProjectileManager from '../../../src/core/managers/ProjectileManager';
import { EventBus } from '../../../src/core/events/EventBus';
import { SPAWN_PROJECTILE, PROJECTILE_HIT_ENEMY } from '../../../src/core/constants/events';
import { SpawnProjectileData } from '../../../src/core/managers/ProjectileManager';

// Define local interface for hit data payload (needed for listener check)
interface ProjectileHitEnemyData {
  projectileId: string;
  enemyInstanceId: string;
}

// Mocks
vi.mock('../../../src/core/events/EventBus');
vi.mock('../../../src/core/utils/Logger'); // ProjectileManager uses Logger internally

// Helper to find the specific listener function attached to the mock EventBus
// Define specific listener type
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

describe('ProjectileManager: Cleanup', () => {
  let projectileManager: ProjectileManager;
  let mockEventBus: Mocked<EventBus>;
  const worldWidth = 800;
  const worldHeight = 600;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventBus = vi.mocked(new EventBus());
    projectileManager = new ProjectileManager(mockEventBus, worldWidth, worldHeight);
  });

  it('should clean up listeners on destroy', () => {
    // Capture listener references before destroy
    const spawnHandlerRef = findListener<SpawnProjectileData>(SPAWN_PROJECTILE, mockEventBus);
    const hitHandlerRef = findListener<ProjectileHitEnemyData>(PROJECTILE_HIT_ENEMY, mockEventBus);
    expect(spawnHandlerRef).toBeDefined(); // Ensure listeners were registered
    expect(hitHandlerRef).toBeDefined();

    projectileManager.destroy();

    // Use captured references in .off assertions
    expect(mockEventBus.off).toHaveBeenCalledWith(SPAWN_PROJECTILE, spawnHandlerRef);
    expect(mockEventBus.off).toHaveBeenCalledWith(PROJECTILE_HIT_ENEMY, hitHandlerRef);
  });
});
