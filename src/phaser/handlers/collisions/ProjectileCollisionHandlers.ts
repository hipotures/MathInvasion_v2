import Phaser from 'phaser';
import eventBus from '../../../core/events/EventBus';
import logger from '../../../core/utils/Logger';
import { EnemyEntity } from '../../entities/EnemyEntity';
import * as Events from '../../../core/constants/events';
import { ProjectileShape } from '../event/ProjectileEventHandler';
import { ProjectileHitEnemyData } from '../types/Collision.types';
import ProjectileManager from '../../../core/managers/ProjectileManager'; // Needed for projectile state/owner

// --- Type Definitions for Function Arguments ---

// Define a context specific to projectile collisions, or reuse/import a broader one
interface ProjectileCollisionContext {
    projectileShapes: Map<string, ProjectileShape>;
    projectileManager: ProjectileManager;
    // Add other needed properties like enemyManager if projectile-enemy interactions become more complex
}

// --- Projectile Collision Handler Function ---

export function handleProjectileEnemyCollision(
    object1: unknown,
    object2: unknown,
    context: ProjectileCollisionContext
): void {
    // Determine which object is the projectile shape and which is the enemy
    let projectileShape: ProjectileShape | null = null;
    let enemyEntity: EnemyEntity | null = null;

    // Check if object1 is a Shape and object2 is an EnemyEntity
    if (object1 instanceof Phaser.GameObjects.Shape && object2 instanceof EnemyEntity) {
        const foundEntry = [...context.projectileShapes.entries()].find(([, shape]) => shape === object1);
        if (foundEntry) {
            projectileShape = object1 as ProjectileShape;
            enemyEntity = object2;
        }
    // Check if object2 is a Shape and object1 is an EnemyEntity
    } else if (object2 instanceof Phaser.GameObjects.Shape && object1 instanceof EnemyEntity) {
        const foundEntry = [...context.projectileShapes.entries()].find(([, shape]) => shape === object2);
        if (foundEntry) {
            projectileShape = object2 as ProjectileShape;
            enemyEntity = object1;
        }
    }

    // If neither combination matches, exit
    if (!projectileShape || !enemyEntity) {
        return; // Not the collision pair we're looking for
    }

    if (!enemyEntity.instanceId) {
        logger.warn('Projectile/Enemy collision with invalid enemy entity');
        if (projectileShape?.active) projectileShape.destroy(); // Clean up projectile if possible
        return;
    }

    // Find the ID by looking up the shape object in the map values
    const projectileId = [...context.projectileShapes.entries()].find(
        ([, shape]) => shape === projectileShape
    )?.[0];

    if (!projectileId) {
        if (projectileShape?.active) projectileShape.destroy();
        return;
    }

    // Use context.projectileManager
    const projectileOwner = context.projectileManager.getProjectileOwner(projectileId);
    if (projectileOwner !== 'player') {
        return; // Only player projectiles hit enemies
    }

    logger.debug(`Projectile ${projectileId} hit enemy ${enemyEntity.instanceId}`);

    // Get projectile state to fetch damage using context.projectileManager
    const projectileState = context.projectileManager.getProjectileState(projectileId);
    if (!projectileState) {
        logger.warn(`Could not get state for projectile ${projectileId} during collision.`);
        if (projectileShape?.active) projectileShape.destroy();
        context.projectileShapes.delete(projectileId); // Use context map
        return;
    }

    // Apply damage and destroy projectile
    const damage = projectileState.damage ?? 0;

    if (damage > 0) {
        const eventData: ProjectileHitEnemyData = {
            projectileId: projectileId,
            enemyInstanceId: enemyEntity.instanceId,
            damage: damage,
        };
        eventBus.emit(Events.PROJECTILE_HIT_ENEMY, eventData);
    } else {
        logger.warn(`Projectile ${projectileId} hit enemy ${enemyEntity.instanceId} but damage was ${damage}. No event emitted.`);
    }

    // Destroy the projectile shape immediately
    if (projectileShape?.active) {
        projectileShape.destroy();
    }
    context.projectileShapes.delete(projectileId); // Delete from the map via context
}