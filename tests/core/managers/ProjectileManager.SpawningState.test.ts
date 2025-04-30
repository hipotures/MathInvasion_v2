import { describe, it, expect, beforeEach, vi, Mocked } from 'vitest';
import ProjectileManager from '../../../src/core/managers/ProjectileManager';
import { EventBus } from '../../../src/core/events/EventBus';
import { PROJECTILE_CREATED, SPAWN_PROJECTILE } from '../../../src/core/constants/events';
import { SpawnProjectileData, ProjectileLike } from '../../../src/core/managers/ProjectileManager';

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

describe('ProjectileManager: Spawning & State', () => {
  let projectileManager: ProjectileManager;
  let mockEventBus: Mocked<EventBus>;
  const worldWidth = 800;
  const worldHeight = 600;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventBus = vi.mocked(new EventBus());
    projectileManager = new ProjectileManager(mockEventBus, worldWidth, worldHeight);
  });

  it('should spawn a projectile and emit PROJECTILE_CREATED on SPAWN_PROJECTILE event', () => {
    const spawnData: SpawnProjectileData = {
      type: 'bullet',
      x: 100,
      y: 200,
      velocityX: 0,
      velocityY: -500,
      owner: 'player' as const,
      damage: 10,
    };
    const spawnHandler = findListener<SpawnProjectileData>(SPAWN_PROJECTILE, mockEventBus);
    expect(spawnHandler).toBeDefined();

    if (spawnHandler) spawnHandler(spawnData);

    const activeProjectilesMap = projectileManager['activeProjectiles'] as Map<
      string,
      ProjectileLike
    >;
    expect(activeProjectilesMap.size).toBe(1);
    const projectileState = activeProjectilesMap.get('proj_0'); // Check generated ID
    expect(projectileState).toBeDefined();
    expect(projectileState?.type).toBe(spawnData.type);
    expect(projectileState?.x).toBe(spawnData.x);
    expect(projectileState?.y).toBe(spawnData.y);
    expect(projectileState?.owner).toBe(spawnData.owner);
    expect(projectileState?.damage).toBe(spawnData.damage);

    expect(mockEventBus.emit).toHaveBeenCalledWith(PROJECTILE_CREATED, {
      id: 'proj_0',
      type: 'bullet',
      x: 100,
      y: 200,
      owner: 'player',
    });
  });

  it('should spawn a bomb projectile with timer and radius', () => {
    const spawnData: SpawnProjectileData = {
      type: 'enemy_bomb',
      x: 300,
      y: 400,
      velocityX: 0,
      velocityY: 50,
      owner: 'enemy' as const,
      damage: 50,
      radius: 100,
      timeToExplodeMs: 1000,
    };
    const spawnHandler = findListener<SpawnProjectileData>(SPAWN_PROJECTILE, mockEventBus);
    expect(spawnHandler).toBeDefined();

    if (spawnHandler) spawnHandler(spawnData);

    const activeProjectilesMap = projectileManager['activeProjectiles'] as Map<
      string,
      ProjectileLike
    >;
    expect(activeProjectilesMap.size).toBe(1);
    const projectileState = activeProjectilesMap.get('proj_0');
    expect(projectileState).toBeDefined();
    expect(projectileState?.type).toBe(spawnData.type);
    expect(projectileState?.owner).toBe(spawnData.owner);
    expect(projectileState?.damage).toBe(spawnData.damage);
    expect(projectileState?.radius).toBe(spawnData.radius);
    expect(projectileState?.timeToExplodeMs).toBe(spawnData.timeToExplodeMs);

    expect(mockEventBus.emit).toHaveBeenCalledWith(PROJECTILE_CREATED, {
      id: 'proj_0',
      type: 'enemy_bomb',
      x: 300,
      y: 400,
      owner: 'enemy',
    });
  });

  it('should update projectile positions in update method', () => {
    const spawnData: SpawnProjectileData = {
      type: 'bullet',
      x: 100,
      y: 200,
      velocityX: 10,
      velocityY: -20,
      owner: 'player' as const,
      damage: 10,
    };
    const spawnHandler = findListener<SpawnProjectileData>(SPAWN_PROJECTILE, mockEventBus);
    if (spawnHandler) spawnHandler(spawnData);

    const projectileId = 'proj_0';
    const activeProjectilesMap = projectileManager['activeProjectiles'] as Map<
      string,
      ProjectileLike
    >;
    const initialState = activeProjectilesMap.get(projectileId);
    expect(initialState?.x).toBe(100);
    expect(initialState?.y).toBe(200);

    const deltaTime = 100; // 100ms
    projectileManager.update(deltaTime);

    const updatedState = activeProjectilesMap.get(projectileId);
    // x = 100 + 10 * (100 / 1000) = 101
    // y = 200 + (-20) * (100 / 1000) = 198
    expect(updatedState?.x).toBeCloseTo(100 + spawnData.velocityX * (deltaTime / 1000));
    expect(updatedState?.y).toBeCloseTo(200 + spawnData.velocityY * (deltaTime / 1000));
  });
});
