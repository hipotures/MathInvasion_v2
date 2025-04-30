import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ProjectileManager from '../../../src/core/managers/ProjectileManager'; // Default import
import { EventBus } from '../../../src/core/events/EventBus';
import { Logger } from '../../../src/core/utils/Logger';
import * as Events from '../../../src/core/constants/events'; // Import * as Events
// Import specific constants needed
import { PROJECTILE_CREATED, PROJECTILE_DESTROYED, PROJECTILE_EXPLODE, PROJECTILE_HIT_ENEMY } from '../../../src/core/constants/events';
import type { SpawnProjectileData, ProjectileLike } from '../../../src/core/managers/ProjectileManager'; // Import types

// Mock dependencies
vi.mock('../../../src/core/events/EventBus');
vi.mock('../../../src/core/utils/Logger');

describe('ProjectileManager', () => {
    let projectileManager: ProjectileManager;
    let mockEventBus: EventBus;
    let mockLogger: Logger;
    const gameWidth = 800; // Define game bounds for testing
    const gameHeight = 600;
    let emitSpy: ReturnType<typeof vi.spyOn>; // Declare emitSpy here
    let onSpy: ReturnType<typeof vi.spyOn>;
    let offSpy: ReturnType<typeof vi.spyOn>;
    // Variables to capture listener functions
    let spawnListenerFunc: (data: SpawnProjectileData) => void;
    let hitEnemyListenerFunc: (data: { projectileId: string; enemyInstanceId: string }) => void;


    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();

        // Create fresh instances for mocks
        mockEventBus = new EventBus(); // Use the mocked constructor
        mockLogger = new Logger(); // Use the mocked constructor (no args)

        // Mock specific methods if needed
        // Store the spy object
        emitSpy = vi.spyOn(mockEventBus, 'emit'); // Assign spy result here
        offSpy = vi.spyOn(mockEventBus, 'off');
        vi.spyOn(mockLogger, 'log');
        vi.spyOn(mockLogger, 'error');
        vi.spyOn(mockLogger, 'debug'); // Ensure debug is spied on if used internally
        vi.spyOn(mockLogger, 'warn');  // Ensure warn is spied on if used internally

        // Capture listeners when 'on' is called
        onSpy = vi.spyOn(mockEventBus, 'on').mockImplementation((eventName, listener) => {
            if (eventName === Events.SPAWN_PROJECTILE) {
                spawnListenerFunc = listener as (data: SpawnProjectileData) => void;
            } else if (eventName === Events.PROJECTILE_HIT_ENEMY) {
                hitEnemyListenerFunc = listener as (data: { projectileId: string; enemyInstanceId: string }) => void;
            }
            return mockEventBus; // Return mock for chaining
        });


        // Pass EventBus and bounds to constructor
        projectileManager = new ProjectileManager(mockEventBus, gameWidth, gameHeight);
    });

    afterEach(() => {
        projectileManager.destroy(); // Ensure cleanup
    });

    it('should initialize correctly and register listeners', () => {
        expect(projectileManager).toBeDefined();
        // Check if listeners were registered
        expect(onSpy).toHaveBeenCalledWith(Events.SPAWN_PROJECTILE, expect.any(Function));
        expect(onSpy).toHaveBeenCalledWith(PROJECTILE_HIT_ENEMY, expect.any(Function));
        // Check if listeners were captured
        expect(spawnListenerFunc).toBeDefined();
        expect(hitEnemyListenerFunc).toBeDefined();
    });

    it('should spawn a projectile and emit PROJECTILE_CREATED when SPAWN_PROJECTILE event occurs', () => {
        const spawnData: SpawnProjectileData = {
            type: 'bullet',
            owner: 'player',
            x: 100,
            y: 100,
            velocityX: 0,
            velocityY: -200,
            damage: 10,
            radius: 5,
        };

        // Call the captured listener
        expect(spawnListenerFunc).toBeDefined();
        spawnListenerFunc(spawnData);

        // Check that PROJECTILE_CREATED was emitted with expected data
        expect(emitSpy).toHaveBeenCalledWith(PROJECTILE_CREATED, expect.objectContaining({
            type: 'bullet',
            owner: 'player',
            x: 100,
            y: 100,
            id: expect.stringContaining('proj_'),
        }));

        // Verify internal state indirectly via public methods
        const emittedCall = emitSpy.mock.calls.find( (call: any[]) => call[0] === PROJECTILE_CREATED );
        expect(emittedCall).toBeDefined();
        const emittedData = emittedCall?.[1] as { id: string; owner: 'player' | 'enemy'; };
        expect(emittedData).toBeDefined();
        const createdId = emittedData.id;
        expect(projectileManager.getProjectileOwner(createdId)).toBe('player');
        expect(projectileManager.getProjectileDamage(createdId)).toBe(10);
    });

    it('should remove projectile when it goes out of bounds (top) during update', () => {
        const spawnData: SpawnProjectileData = { type: 'bullet', owner: 'player', x: 100, y: 10, velocityX: 0, velocityY: -200, damage: 10, radius: 5 };
        expect(spawnListenerFunc).toBeDefined();
        spawnListenerFunc(spawnData);
        const createdEmitCall = emitSpy.mock.calls.find((call: any[]) => call[0] === PROJECTILE_CREATED);
        const createdId = (createdEmitCall?.[1] as { id: string })?.id;
        expect(createdId).toBeDefined();

        projectileManager.update(100); // 100ms: y = 10 + (-200 * 0.1) = -10

        expect(emitSpy).toHaveBeenCalledWith(PROJECTILE_DESTROYED, { id: createdId });
        expect(projectileManager.getProjectileOwner(createdId)).toBeUndefined();
    });

     it('should remove projectile when it goes out of bounds (bottom) during update', () => {
        const spawnData: SpawnProjectileData = { type: 'bullet', owner: 'player', x: 100, y: gameHeight - 10, velocityX: 0, velocityY: 200, damage: 10, radius: 5 };
        expect(spawnListenerFunc).toBeDefined();
        spawnListenerFunc(spawnData);
        const createdEmitCall = emitSpy.mock.calls.find((call: any[]) => call[0] === PROJECTILE_CREATED);
        const createdId = (createdEmitCall?.[1] as { id: string })?.id;
        expect(createdId).toBeDefined();

        projectileManager.update(100); // 100ms: y = 590 + (200 * 0.1) = 610

        expect(emitSpy).toHaveBeenCalledWith(PROJECTILE_DESTROYED, { id: createdId });
        expect(projectileManager.getProjectileOwner(createdId)).toBeUndefined();
    });

     it('should remove projectile when it goes out of bounds (left) during update', () => {
        const spawnData: SpawnProjectileData = { type: 'bullet', owner: 'player', x: 10, y: 100, velocityX: -200, velocityY: 0, damage: 10, radius: 5 };
        expect(spawnListenerFunc).toBeDefined();
        spawnListenerFunc(spawnData);
        const createdEmitCall = emitSpy.mock.calls.find((call: any[]) => call[0] === PROJECTILE_CREATED);
        const createdId = (createdEmitCall?.[1] as { id: string })?.id;
        expect(createdId).toBeDefined();

        projectileManager.update(100); // 100ms: x = 10 + (-200 * 0.1) = -10

        expect(emitSpy).toHaveBeenCalledWith(PROJECTILE_DESTROYED, { id: createdId });
        expect(projectileManager.getProjectileOwner(createdId)).toBeUndefined();
    });

     it('should remove projectile when it goes out of bounds (right) during update', () => {
        const spawnData: SpawnProjectileData = { type: 'bullet', owner: 'player', x: gameWidth - 10, y: 100, velocityX: 200, velocityY: 0, damage: 10, radius: 5 };
        expect(spawnListenerFunc).toBeDefined();
        spawnListenerFunc(spawnData);
        const createdEmitCall = emitSpy.mock.calls.find((call: any[]) => call[0] === PROJECTILE_CREATED);
        const createdId = (createdEmitCall?.[1] as { id: string })?.id;
        expect(createdId).toBeDefined();

        projectileManager.update(100); // 100ms: x = 790 + (200 * 0.1) = 810

        expect(emitSpy).toHaveBeenCalledWith(PROJECTILE_DESTROYED, { id: createdId });
        expect(projectileManager.getProjectileOwner(createdId)).toBeUndefined();
    });


    it('should handle PROJECTILE_HIT_ENEMY event by removing the projectile', () => {
        const spawnData: SpawnProjectileData = { type: 'bullet', owner: 'player', x: 100, y: 100, velocityX: 0, velocityY: -200, damage: 10, radius: 5 };
        expect(spawnListenerFunc).toBeDefined();
        spawnListenerFunc(spawnData);
        const createdEmitCall = emitSpy.mock.calls.find((call: any[]) => call[0] === PROJECTILE_CREATED);
        const createdId = (createdEmitCall?.[1] as { id: string })?.id;
        expect(createdId).toBeDefined();
        expect(projectileManager.getProjectileOwner(createdId)).toBe('player'); // Verify exists

        // Call the captured listener
        expect(hitEnemyListenerFunc).toBeDefined();
        hitEnemyListenerFunc({ projectileId: createdId, enemyInstanceId: 'enemy-1' });

        expect(projectileManager.getProjectileOwner(createdId)).toBeUndefined(); // Verify removed
        expect(emitSpy).toHaveBeenCalledWith(PROJECTILE_DESTROYED, { id: createdId });
    });


    it('should decrement timeToExplodeMs and trigger explosion when timer reaches zero during update', () => {
        const spawnData: SpawnProjectileData = {
            type: 'enemy_bomb',
            owner: 'enemy',
            x: 200,
            y: 200,
            velocityX: 0,
            velocityY: 50,
            damage: 50,
            radius: 30,
            timeToExplodeMs: 100 // 100ms timer
        };
        expect(spawnListenerFunc).toBeDefined();
        spawnListenerFunc(spawnData);
        const createdEmitCall = emitSpy.mock.calls.find((call: any[]) => call[0] === PROJECTILE_CREATED);
        const createdId = (createdEmitCall?.[1] as { id: string })?.id;
        expect(createdId).toBeDefined();

        projectileManager.update(50); // Simulate 50ms passing
        expect(emitSpy).not.toHaveBeenCalledWith(PROJECTILE_EXPLODE, expect.anything());
        expect(projectileManager.getProjectileOwner(createdId)).toBe('enemy'); // Still exists

        projectileManager.update(60); // Simulate another 60ms passing (total 110ms)
        expect(projectileManager.getProjectileOwner(createdId)).toBeUndefined(); // Projectile removed after explosion

        // Check PROJECTILE_EXPLODE was emitted with correct data at some point
        const expectedExplodePayload = expect.objectContaining({
            id: createdId,
            type: 'enemy_bomb',
            owner: 'enemy',
            x: expect.any(Number),
            y: expect.any(Number),
            damage: 50,
            radius: 30
        });
        expect(emitSpy).toHaveBeenCalledWith(PROJECTILE_EXPLODE, expectedExplodePayload);

         // Check if PROJECTILE_DESTROYED was also emitted internally at some point
        expect(emitSpy).toHaveBeenCalledWith(PROJECTILE_DESTROYED, { id: createdId });
    });

     it('should update projectile position based on velocity during update', () => {
        const spawnData: SpawnProjectileData = { type: 'bullet', owner: 'player', x: 100, y: 100, velocityX: 10, velocityY: -20, damage: 10, radius: 5 };
        expect(spawnListenerFunc).toBeDefined();
        spawnListenerFunc(spawnData);
        const createdEmitCall = emitSpy.mock.calls.find((call: any[]) => call[0] === PROJECTILE_CREATED);
        const createdId = (createdEmitCall?.[1] as { id: string })?.id;
        expect(createdId).toBeDefined();

        projectileManager.update(1000); // Simulate 1 second (1000ms)

        expect(projectileManager.getProjectileOwner(createdId)).toBe('player');
        // Check it wasn't destroyed unexpectedly
        expect(emitSpy).not.toHaveBeenCalledWith(PROJECTILE_DESTROYED, { id: createdId });
    });

    it('should correctly return projectile owner via public method', () => {
        const spawnPlayerData: SpawnProjectileData = { type: 'bullet', owner: 'player', x: 100, y: 100, velocityX: 0, velocityY: -200, damage: 10, radius: 5 };
        const spawnEnemyData: SpawnProjectileData = { type: 'enemy_bullet', owner: 'enemy', x: 200, y: 200, velocityX: 0, velocityY: 200, damage: 5, radius: 5 };

        expect(spawnListenerFunc).toBeDefined();

        // Spawn player projectile and get its ID
        emitSpy.mockClear();
        spawnListenerFunc(spawnPlayerData);
        const playerEmitCall = emitSpy.mock.calls.find((call: any[]) => call[0] === PROJECTILE_CREATED && call[1].owner === 'player');
        const playerProjId = (playerEmitCall?.[1] as { id: string })?.id;
        expect(playerProjId).toBeDefined();

        // Spawn enemy projectile and get its ID
        emitSpy.mockClear();
        spawnListenerFunc(spawnEnemyData);
        const enemyEmitCall = emitSpy.mock.calls.find((call: any[]) => call[0] === PROJECTILE_CREATED && call[1].owner === 'enemy');
        const enemyProjId = (enemyEmitCall?.[1] as { id: string })?.id;
        expect(enemyProjId).toBeDefined();

        expect(projectileManager.getProjectileOwner(playerProjId)).toBe('player');
        expect(projectileManager.getProjectileOwner(enemyProjId)).toBe('enemy');
        expect(projectileManager.getProjectileOwner('non-existent')).toBeUndefined();
    });

     it('should correctly return projectile damage via public method', () => {
        const spawnPlayerData: SpawnProjectileData = { type: 'bullet', owner: 'player', x: 100, y: 100, velocityX: 0, velocityY: -200, damage: 10, radius: 5 };
        const spawnEnemyData: SpawnProjectileData = { type: 'enemy_bullet', owner: 'enemy', x: 200, y: 200, velocityX: 0, velocityY: 200, damage: 5, radius: 5 };

        expect(spawnListenerFunc).toBeDefined();

        // Spawn player projectile and get its ID
        emitSpy.mockClear();
        spawnListenerFunc(spawnPlayerData);
        const playerEmitCall = emitSpy.mock.calls.find((call: any[]) => call[0] === PROJECTILE_CREATED && call[1].owner === 'player');
        const playerProjId = (playerEmitCall?.[1] as { id: string })?.id;
        expect(playerProjId).toBeDefined();

        // Spawn enemy projectile and get its ID
        emitSpy.mockClear();
        spawnListenerFunc(spawnEnemyData);
        const enemyEmitCall = emitSpy.mock.calls.find((call: any[]) => call[0] === PROJECTILE_CREATED && call[1].owner === 'enemy');
        const enemyProjId = (enemyEmitCall?.[1] as { id: string })?.id;
        expect(enemyProjId).toBeDefined();

        expect(projectileManager.getProjectileDamage(playerProjId)).toBe(10);
        expect(projectileManager.getProjectileDamage(enemyProjId)).toBe(5);
        expect(projectileManager.getProjectileDamage('non-existent')).toBeUndefined();
    });

    it('should clean up listeners on destroy', () => {
        projectileManager.destroy();
        // Check that 'off' was called with the correct event names and the captured listeners
        expect(offSpy).toHaveBeenCalledWith(Events.SPAWN_PROJECTILE, spawnListenerFunc);
        expect(offSpy).toHaveBeenCalledWith(PROJECTILE_HIT_ENEMY, hitEnemyListenerFunc);
    });

});