import { describe, it, expect, beforeEach, vi, Mocked } from 'vitest';
import ProjectileManager from '../../../src/core/managers/ProjectileManager';
import { EventBus } from '../../../src/core/events/EventBus';
import { SPAWN_PROJECTILE, PROJECTILE_HIT_ENEMY } from '../../../src/core/constants/events';
import { SpawnProjectileData } from '../../../src/core/managers/ProjectileManager';

// Mocks
vi.mock('../../../src/core/events/EventBus');
vi.mock('../../../src/core/utils/Logger'); // ProjectileManager uses Logger internally

// Define local interface for hit data payload (needed for listener check)
interface ProjectileHitEnemyData {
  projectileId: string;
  enemyInstanceId: string;
}

describe('ProjectileManager: Initialization', () => {
  let projectileManager: ProjectileManager;
  let mockEventBus: Mocked<EventBus>;
  const worldWidth = 800;
  const worldHeight = 600;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventBus = vi.mocked(new EventBus());
    projectileManager = new ProjectileManager(mockEventBus, worldWidth, worldHeight);
  });

  it('should initialize correctly and register listeners', () => {
    expect(projectileManager).toBeDefined();
    expect(mockEventBus.on).toHaveBeenCalledWith(SPAWN_PROJECTILE, expect.any(Function));
    expect(mockEventBus.on).toHaveBeenCalledWith(PROJECTILE_HIT_ENEMY, expect.any(Function));
  });
});
