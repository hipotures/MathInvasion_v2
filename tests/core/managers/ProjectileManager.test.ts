import { describe, it, expect, beforeEach, vi, Mocked } from 'vitest';
import ProjectileManager from '../../../src/core/managers/ProjectileManager';
import { EventBus } from '../../../src/core/events/EventBus';
import {
  PROJECTILE_CREATED,
  PROJECTILE_DESTROYED,
  PROJECTILE_EXPLODE,
  SPAWN_PROJECTILE,
  PROJECTILE_HIT_ENEMY,
} from '../../../src/core/constants/events';
import { SpawnProjectileData, ProjectileLike } from '../../../src/core/managers/ProjectileManager';

// Define local interface for hit data payload
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

describe('ProjectileManager', () => {
  let projectileManager: ProjectileManager;
  let mockEventBus: Mocked<EventBus>;
  const worldWidth = 800;
  const worldHeight = 600;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventBus = vi.mocked(new EventBus());
    projectileManager = new ProjectileManager(mockEventBus, worldWidth, worldHeight);
  });

  describe('Initialization', () => {
    it('should initialize correctly and register listeners', () => {
      expect(projectileManager).toBeDefined();
      expect(mockEventBus.on).toHaveBeenCalledWith(SPAWN_PROJECTILE, expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith(PROJECTILE_HIT_ENEMY, expect.any(Function));
    });
  });

  describe('Spawning & State', () => {
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

  describe('Destruction', () => {
    let projectileId: string;
    let activeProjectilesMap: Map<string, ProjectileLike>;

    beforeEach(() => {
      // Spawn a projectile for destruction tests
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
      if (spawnHandler) spawnHandler(spawnData);
      projectileId = 'proj_0'; // Assuming first projectile gets this ID
      activeProjectilesMap = projectileManager['activeProjectiles'] as Map<string, ProjectileLike>;
      expect(activeProjectilesMap.size).toBe(1); // Ensure it was spawned
      vi.mocked(mockEventBus.emit).mockClear(); // Clear spawn emit
    });

    it('should remove a projectile and emit PROJECTILE_DESTROYED when PROJECTILE_HIT_ENEMY event occurs', () => {
      const hitData: ProjectileHitEnemyData = {
        projectileId: projectileId,
        enemyInstanceId: 'enemy-1',
      };
      const hitHandler = findListener<ProjectileHitEnemyData>(PROJECTILE_HIT_ENEMY, mockEventBus);
      expect(hitHandler).toBeDefined();

      if (hitHandler) hitHandler(hitData);

      expect(activeProjectilesMap.size).toBe(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith(PROJECTILE_DESTROYED, { id: projectileId });
    });

    it('should remove a projectile and emit PROJECTILE_DESTROYED when it goes out of bounds (top)', () => {
      const projectileState = activeProjectilesMap.get(projectileId);
      if (projectileState) projectileState.y = -10; // Move out of bounds

      projectileManager.update(16); // Simulate one frame

      expect(activeProjectilesMap.size).toBe(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith(PROJECTILE_DESTROYED, { id: projectileId });
    });

    it('should remove a projectile and emit PROJECTILE_DESTROYED when it goes out of bounds (bottom)', () => {
      const projectileState = activeProjectilesMap.get(projectileId);
      if (projectileState) projectileState.y = worldHeight + 10; // Move out of bounds

      projectileManager.update(16);

      expect(activeProjectilesMap.size).toBe(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith(PROJECTILE_DESTROYED, { id: projectileId });
    });

    it('should remove a projectile and emit PROJECTILE_DESTROYED when it goes out of bounds (left)', () => {
      const projectileState = activeProjectilesMap.get(projectileId);
      if (projectileState) projectileState.x = -10; // Move out of bounds

      projectileManager.update(16);

      expect(activeProjectilesMap.size).toBe(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith(PROJECTILE_DESTROYED, { id: projectileId });
    });

    it('should remove a projectile and emit PROJECTILE_DESTROYED when it goes out of bounds (right)', () => {
      const projectileState = activeProjectilesMap.get(projectileId);
      if (projectileState) projectileState.x = worldWidth + 10; // Move out of bounds

      projectileManager.update(16);

      expect(activeProjectilesMap.size).toBe(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith(PROJECTILE_DESTROYED, { id: projectileId });
    });

    it('should trigger explosion and emit PROJECTILE_EXPLODE for bombs when timer expires', () => {
      // Spawn a bomb specifically for this test
      vi.mocked(mockEventBus.emit).mockClear(); // Clear previous spawn
      activeProjectilesMap.clear(); // Clear previous projectile

      const bombSpawnData: SpawnProjectileData = {
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
      if (spawnHandler) spawnHandler(bombSpawnData);
      const bombId = 'proj_0'; // It will be the first one again
      expect(activeProjectilesMap.size).toBe(1);
      const bombState = activeProjectilesMap.get(bombId);
      expect(bombState?.timeToExplodeMs).toBe(1000);
      vi.mocked(mockEventBus.emit).mockClear(); // Clear bomb spawn emit

      // Simulate time passing
      projectileManager.update(500); // Halfway
      expect(bombState?.timeToExplodeMs).toBe(500);
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(PROJECTILE_EXPLODE, expect.anything());

      projectileManager.update(510); // Past the explosion time
      expect(activeProjectilesMap.size).toBe(0); // Projectile removed
      expect(mockEventBus.emit).toHaveBeenCalledWith(PROJECTILE_EXPLODE, {
        id: bombId,
        x: expect.any(Number), // Position updated
        y: expect.any(Number),
        radius: 100,
        damage: 50,
        owner: 'enemy',
        type: 'enemy_bomb',
      });
      // Ensure PROJECTILE_DESTROYED is also called for cleanup
      expect(mockEventBus.emit).toHaveBeenCalledWith(PROJECTILE_DESTROYED, { id: bombId });
    });
  });

  describe('Getters', () => {
    it('should return correct projectile owner', () => {
      const spawnDataPlayer: SpawnProjectileData = {
        type: 'bullet',
        x: 100,
        y: 200,
        velocityX: 0,
        velocityY: -500,
        owner: 'player' as const,
        damage: 10,
      };
      const spawnDataEnemy: SpawnProjectileData = {
        type: 'enemy_bomb',
        x: 300,
        y: 400,
        velocityX: 0,
        velocityY: 50,
        owner: 'enemy' as const,
        damage: 50,
      };
      const spawnHandler = findListener<SpawnProjectileData>(SPAWN_PROJECTILE, mockEventBus);
      if (spawnHandler) {
        spawnHandler(spawnDataPlayer); // ID: proj_0
        spawnHandler(spawnDataEnemy); // ID: proj_1
      }

      expect(projectileManager.getProjectileOwner('proj_0')).toBe('player');
      expect(projectileManager.getProjectileOwner('proj_1')).toBe('enemy');
      expect(projectileManager.getProjectileOwner('proj_unknown')).toBeUndefined();
    });

    it('should return correct projectile damage', () => {
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
      const spawnHandler = findListener<SpawnProjectileData>(SPAWN_PROJECTILE, mockEventBus);
      if (spawnHandler) {
        spawnHandler(spawnDataPlayer); // ID: proj_0
        spawnHandler(spawnDataEnemy); // ID: proj_1
      }

      expect(projectileManager.getProjectileDamage('proj_0')).toBe(15);
      expect(projectileManager.getProjectileDamage('proj_1')).toBe(75);
      expect(projectileManager.getProjectileDamage('proj_unknown')).toBeUndefined();
    });
  });

  describe('Cleanup', () => {
    it('should clean up listeners on destroy', () => {
      // Capture listener references before destroy
      const spawnHandlerRef = findListener<SpawnProjectileData>(SPAWN_PROJECTILE, mockEventBus);
      const hitHandlerRef = findListener<ProjectileHitEnemyData>(
        PROJECTILE_HIT_ENEMY,
        mockEventBus
      );
      expect(spawnHandlerRef).toBeDefined(); // Ensure listeners were registered
      expect(hitHandlerRef).toBeDefined();

      projectileManager.destroy();

      // Use captured references in .off assertions
      expect(mockEventBus.off).toHaveBeenCalledWith(SPAWN_PROJECTILE, spawnHandlerRef);
      expect(mockEventBus.off).toHaveBeenCalledWith(PROJECTILE_HIT_ENEMY, hitHandlerRef);
    });
  });
});
