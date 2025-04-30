import { describe, it, expect, beforeEach, vi, Mocked } from 'vitest';
import ProjectileManager from '../../../src/core/managers/ProjectileManager';
import { EventBus } from '../../../src/core/events/EventBus';
import { SPAWN_PROJECTILE } from '../../../src/core/constants/events';
import { SpawnProjectileData } from '../../../src/core/managers/ProjectileManager';

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

describe('ProjectileManager: Getters', () => {
  let projectileManager: ProjectileManager;
  let mockEventBus: Mocked<EventBus>;
  const worldWidth = 800;
  const worldHeight = 600;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventBus = vi.mocked(new EventBus());
    projectileManager = new ProjectileManager(mockEventBus, worldWidth, worldHeight);

    // Spawn projectiles for getter tests
    const spawnDataPlayer: SpawnProjectileData = {
      type: 'bullet',
      x: 100,
      y: 200,
      velocityX: 0,
      velocityY: -500,
      owner: 'player' as const,
      damage: 15,
    };
    const spawnDataEnemy: SpawnProjectileData = {
      type: 'enemy_bomb',
      x: 300,
      y: 400,
      velocityX: 0,
      velocityY: 50,
      owner: 'enemy' as const,
      damage: 75,
    };
    // Manually call the handler
    if (projectileManager['handleSpawnProjectile']) {
      projectileManager['handleSpawnProjectile'](spawnDataPlayer); // ID: proj_0
      projectileManager['handleSpawnProjectile'](spawnDataEnemy); // ID: proj_1
    }
  });

  it('should return correct projectile owner', () => {
    expect(projectileManager.getProjectileOwner('proj_0')).toBe('player');
    expect(projectileManager.getProjectileOwner('proj_1')).toBe('enemy');
    expect(projectileManager.getProjectileOwner('proj_unknown')).toBeUndefined();
  });

  it('should return correct projectile damage', () => {
    expect(projectileManager.getProjectileDamage('proj_0')).toBe(15);
    expect(projectileManager.getProjectileDamage('proj_1')).toBe(75);
    expect(projectileManager.getProjectileDamage('proj_unknown')).toBeUndefined();
  });
});
