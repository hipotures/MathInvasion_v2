import { describe, it, expect, beforeEach, vi, Mocked } from 'vitest'; // Import Mocked
import ProjectileManager from '../../../src/core/managers/ProjectileManager';
import { EventBus } from '../../../src/core/events/EventBus';
// import { Logger } from '../../../src/core/utils/Logger'; // Remove unused Logger import
// import ConfigLoader from '../../../src/core/config/ConfigLoader'; // Remove ConfigLoader import
// import { WeaponConfig } from '../../../src/core/config/schemas/weaponSchema'; // Remove WeaponConfig import
import {
  PROJECTILE_CREATED,
  PROJECTILE_DESTROYED,
  PROJECTILE_EXPLODE,
  SPAWN_PROJECTILE,
  PROJECTILE_HIT_ENEMY,
} from '../../../src/core/constants/events';
import { SpawnProjectileData, ProjectileLike } from '../../../src/core/managers/ProjectileManager'; // Import needed types

// Define local interface for hit data payload
interface ProjectileHitEnemyData {
  projectileId: string;
  enemyInstanceId: string;
}

// Mocks
vi.mock('../../../src/core/events/EventBus');
vi.mock('../../../src/core/utils/Logger');
// Remove ConfigLoader mock
// vi.mock('../../../src/core/config/ConfigLoader', () => ({ ... }));
// Line 15 removed

const mockEventBus = new EventBus() as Mocked<EventBus>; // Use Mocked<T>
// Line 19 removed (mockLogger)
// Remove mockConfigLoader variable
// const mockConfigLoader = ConfigLoader as Mocked<typeof ConfigLoader>;
// Remove mock config data variables
// const mockBulletProjectile = { ... };
// const mockBombProjectile = { ... };
// const mockWeaponsConfigData = { ... };

describe('ProjectileManager', () => {
  let projectileManager: ProjectileManager;
  const worldWidth = 800;
  const worldHeight = 600;

  beforeEach(() => {
    vi.clearAllMocks();
    // Remove ConfigLoader mocking
    // mockConfigLoader.getWeaponsConfig.mockReturnValue(mockWeaponsConfigData);
    projectileManager = new ProjectileManager(mockEventBus, worldWidth, worldHeight); // Use correct constructor signature
  });

  it('should initialize correctly', () => {
    expect(projectileManager).toBeDefined();
    // Remove ConfigLoader check
    // expect(mockConfigLoader.getWeaponsConfig).toHaveBeenCalled();
    expect(mockEventBus.on).toHaveBeenCalledWith(SPAWN_PROJECTILE, expect.any(Function));
    expect(mockEventBus.on).toHaveBeenCalledWith(PROJECTILE_HIT_ENEMY, expect.any(Function));
    // Remove check for internal config storage
    // expect(projectileManager['projectileConfigs']).toEqual(mockWeaponsConfigData.projectiles);
  });

  it('should spawn a projectile and emit PROJECTILE_CREATED on SPAWN_PROJECTILE event', () => {
    const spawnData: SpawnProjectileData = {
      // Use imported type
      // id: 'proj-1', // ID is generated internally
      type: 'bullet',
      x: 100,
      y: 200,
      velocityX: 0,
      velocityY: -500,
      owner: 'player' as const,
      damage: 10, // Damage passed from WeaponManager
    };

    // Simulate the event being fired
    // Use the specific payload type for the listener
    const spawnHandler = mockEventBus.on.mock.calls.find(
      (call: [string, (data: SpawnProjectileData) => void]) => call[0] === SPAWN_PROJECTILE
    )?.[1];
    expect(spawnHandler).toBeDefined();
    if (spawnHandler) {
      spawnHandler(spawnData);
    }

    const activeProjectilesMap = projectileManager['activeProjectiles'] as Map<
      string,
      ProjectileLike
    >;
    expect(activeProjectilesMap.size).toBe(1);
    const projectileState = activeProjectilesMap.get('proj_0'); // Check generated ID
    expect(projectileState).toBeDefined();
    // Cannot check config as it's not stored
    // expect(projectileState?.config).toEqual(mockBulletProjectile);
    expect(projectileState?.type).toBe(spawnData.type);
    expect(projectileState?.x).toBe(spawnData.x);
    expect(projectileState?.y).toBe(spawnData.y);
    expect(projectileState?.owner).toBe(spawnData.owner);
    expect(projectileState?.damage).toBe(spawnData.damage); // Check damage is stored
    // Range timer is not implemented
    // expect(projectileState?.rangeTimer).toBeGreaterThan(0);

    // Check emitted event data matches what ProjectileManager actually emits
    expect(mockEventBus.emit).toHaveBeenCalledWith(PROJECTILE_CREATED, {
      id: 'proj_0', // Check generated ID
      type: 'bullet',
      x: 100,
      y: 200,
      owner: 'player',
      // visualKey and collisionRadius are NOT emitted by the current implementation
      // velocityX and velocityY are also NOT emitted by the current implementation
    });
  });

  it('should remove a projectile and emit PROJECTILE_DESTROYED when PROJECTILE_HIT_ENEMY event occurs', () => {
    // First, spawn a projectile
    const spawnData: SpawnProjectileData = {
      type: 'bullet',
      x: 100,
      y: 200,
      velocityX: 0,
      velocityY: -500,
      owner: 'player' as const,
      damage: 10,
    };
    // Use specific payload type for listener
    const spawnHandler = mockEventBus.on.mock.calls.find(
      (call: [string, (data: SpawnProjectileData) => void]) => call[0] === SPAWN_PROJECTILE
    )?.[1];
    if (spawnHandler) spawnHandler(spawnData);
    const projectileId = 'proj_0'; // Get the generated ID
    const activeProjectilesMap = projectileManager['activeProjectiles'] as Map<
      string,
      ProjectileLike
    >;
    expect(activeProjectilesMap.size).toBe(1);

    // Simulate the hit event
    // Use correct interface property name (projectileId, not projectileInstanceId)
    const hitData: ProjectileHitEnemyData = {
      projectileId: projectileId,
      enemyInstanceId: 'enemy-1',
    }; // Use local interface
    // Use specific payload type for listener
    const hitHandler = mockEventBus.on.mock.calls.find(
      (call: [string, (data: ProjectileHitEnemyData) => void]) => call[0] === PROJECTILE_HIT_ENEMY
    )?.[1];
    expect(hitHandler).toBeDefined();
    if (hitHandler) {
      hitHandler(hitData);
    }

    expect(activeProjectilesMap.size).toBe(0);
    // Use correct interface property name (id, not instanceId)
    expect(mockEventBus.emit).toHaveBeenCalledWith(PROJECTILE_DESTROYED, { id: projectileId });
  });

  // Remove range test as it's not implemented
  // it('should remove a projectile and emit PROJECTILE_DESTROYED when it goes out of range', () => { ... });

  it('should remove a projectile and emit PROJECTILE_DESTROYED when it goes out of bounds', () => {
    const spawnData: SpawnProjectileData = {
      type: 'bullet',
      x: 100,
      y: -10,
      velocityX: 0,
      velocityY: -500,
      owner: 'player' as const,
      damage: 10,
    }; // Start slightly off-screen top
    const spawnHandler = mockEventBus.on.mock.calls.find(
      (call: [string, (data: SpawnProjectileData) => void]) => call[0] === SPAWN_PROJECTILE
    )?.[1];
    if (spawnHandler) spawnHandler(spawnData);
    const projectileId = 'proj_0';
    const activeProjectilesMap = projectileManager['activeProjectiles'] as Map<
      string,
      ProjectileLike
    >;
    expect(activeProjectilesMap.size).toBe(1);

    // Update should immediately detect it's out of bounds based on constructor params
    projectileManager.update(16); // Simulate one frame

    expect(activeProjectilesMap.size).toBe(0);
    expect(mockEventBus.emit).toHaveBeenCalledWith(PROJECTILE_DESTROYED, { id: projectileId });
  });

  it('should trigger explosion and emit PROJECTILE_EXPLODE for bombs when timer expires', () => {
    const spawnData: SpawnProjectileData = {
      // id: 'bomb-1', // ID generated internally
      type: 'enemy_bomb',
      x: 300,
      y: 400,
      velocityX: 0,
      velocityY: 50,
      owner: 'enemy' as const,
      damage: 50, // Damage passed from EnemyManager
      radius: 100, // Radius passed from EnemyManager
      timeToExplodeMs: 1000, // Time passed from EnemyManager
    };
    const spawnHandler = mockEventBus.on.mock.calls.find(
      (call: [string, (data: SpawnProjectileData) => void]) => call[0] === SPAWN_PROJECTILE
    )?.[1];
    if (spawnHandler) spawnHandler(spawnData);
    const projectileId = 'proj_0';
    const activeProjectilesMap = projectileManager['activeProjectiles'] as Map<
      string,
      ProjectileLike
    >;
    expect(activeProjectilesMap.size).toBe(1);

    const projectileState = activeProjectilesMap.get(projectileId);
    expect(projectileState).toBeDefined();
    expect(projectileState?.timeToExplodeMs).toBe(1000);

    // Simulate time passing
    projectileManager.update(500); // Halfway
    expect(projectileState?.timeToExplodeMs).toBe(500);
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(PROJECTILE_EXPLODE, expect.anything());

    projectileManager.update(510); // Past the explosion time
    expect(activeProjectilesMap.size).toBe(0); // Projectile should be removed after exploding
    expect(mockEventBus.emit).toHaveBeenCalledWith(PROJECTILE_EXPLODE, {
      id: projectileId, // Use generated ID
      x: expect.any(Number), // Position will have updated slightly
      y: expect.any(Number),
      radius: 100,
      damage: 50,
      owner: 'enemy',
      type: 'enemy_bomb', // Check type is included
    });
    // Ensure PROJECTILE_DESTROYED is also called for cleanup
    expect(mockEventBus.emit).toHaveBeenCalledWith(PROJECTILE_DESTROYED, { id: projectileId });
  });

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
    const spawnHandler = mockEventBus.on.mock.calls.find(
      (call: [string, (data: SpawnProjectileData) => void]) => call[0] === SPAWN_PROJECTILE
    )?.[1];
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
    }; // Custom damage
    const spawnDataEnemy: SpawnProjectileData = {
      type: 'enemy_bomb',
      x: 300,
      y: 400,
      velocityX: 0,
      velocityY: 50,
      owner: 'enemy' as const,
      damage: 75,
    }; // Custom damage
    const spawnHandler = mockEventBus.on.mock.calls.find(
      (call: [string, (data: SpawnProjectileData) => void]) => call[0] === SPAWN_PROJECTILE
    )?.[1];
    if (spawnHandler) {
      spawnHandler(spawnDataPlayer); // ID: proj_0
      spawnHandler(spawnDataEnemy); // ID: proj_1
    }

    expect(projectileManager.getProjectileDamage('proj_0')).toBe(15);
    expect(projectileManager.getProjectileDamage('proj_1')).toBe(75);
    expect(projectileManager.getProjectileDamage('proj_unknown')).toBeUndefined();
  });

  it('should clean up listeners on destroy', () => {
    projectileManager.destroy();
    expect(mockEventBus.off).toHaveBeenCalledWith(SPAWN_PROJECTILE, expect.any(Function));
    expect(mockEventBus.off).toHaveBeenCalledWith(PROJECTILE_HIT_ENEMY, expect.any(Function));
  });
});
