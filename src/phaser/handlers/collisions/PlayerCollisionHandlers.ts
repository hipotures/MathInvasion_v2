import Phaser from 'phaser';
import eventBus from '../../../core/events/EventBus';
import logger from '../../../core/utils/Logger';
import { EnemyEntity } from '../../entities/EnemyEntity';
import * as Events from '../../../core/constants/events';
import { PowerupCollectedData } from '../../../core/managers/PowerupManager';
import { ProjectileShape } from '../event/ProjectileEventHandler';
import { PlayerHitEnemyData, PlayerHitProjectileData } from '../types/Collision.types';
import ProjectileManager from '../../../core/managers/ProjectileManager'; // Needed for projectile owner check
import { EnemyManager } from '../../../core/managers/EnemyManager'; // Needed for instant kill

// --- Type Definitions for Function Arguments ---

interface CollisionContext {
    playerSprite: Phaser.Physics.Arcade.Sprite;
    projectileShapes: Map<string, ProjectileShape>;
    powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>;
    powerupGroup: Phaser.GameObjects.Group; // Needed to check if object2 is a powerup
    projectileManager: ProjectileManager; // Needed for player-projectile check
    enemyManager: EnemyManager; // Needed for player-enemy check
}

// --- Player Collision Handler Functions ---

export function handlePlayerEnemyCollision(
    object1: unknown,
    object2: unknown,
    context: CollisionContext
): void {
    // Ensure object1 is the playerSprite and object2 is an EnemyEntity
    let playerSprite: Phaser.Physics.Arcade.Sprite | null = null;
    let enemyEntity: EnemyEntity | null = null;

    if (object1 === context.playerSprite && object2 instanceof EnemyEntity) {
        playerSprite = context.playerSprite; // Assign the known type
        enemyEntity = object2;
    } else if (object2 === context.playerSprite && object1 instanceof EnemyEntity) {
        playerSprite = context.playerSprite; // Assign the known type
        enemyEntity = object1;
    } else {
        return; // Not the collision pair we're looking for
    }

    if (!enemyEntity.instanceId) {
        logger.warn('Player collision with EnemyEntity missing instanceId');
        return;
    }

    logger.debug(`Player collided with enemy: ${enemyEntity.instanceId}`);

    const collisionDamage = enemyEntity.enemyConfig.collisionDamage ?? 0;
    const eventData: PlayerHitEnemyData = {
        enemyInstanceId: enemyEntity.instanceId,
        damage: collisionDamage,
    };
    eventBus.emit(Events.PLAYER_HIT_ENEMY, eventData);

    // Instant kill enemy on player collision (using context.enemyManager)
    context.enemyManager.handleDamage(enemyEntity.instanceId, 9999);
}


export function handlePlayerProjectileCollision(
    object1: unknown,
    object2: unknown,
    context: CollisionContext
): void {
    // Determine which object is the player and which is the projectile shape
    let playerSprite: Phaser.Physics.Arcade.Sprite | null = null;
    let projectileShape: ProjectileShape | null = null;

    if (object1 === context.playerSprite && object2 instanceof Phaser.GameObjects.Shape) {
        const foundEntry = [...context.projectileShapes.entries()].find(([, shape]) => shape === object2);
        if (foundEntry) {
            playerSprite = context.playerSprite; // Assign the known type
            projectileShape = object2 as ProjectileShape;
        }
    } else if (object2 === context.playerSprite && object1 instanceof Phaser.GameObjects.Shape) {
        const foundEntry = [...context.projectileShapes.entries()].find(([, shape]) => shape === object1);
        if (foundEntry) {
            playerSprite = context.playerSprite; // Assign the known type
            projectileShape = object1 as ProjectileShape;
        }
    } else {
        return; // Not the collision pair we're looking for
    }

    if (!projectileShape) return; // Should not happen if logic above is correct

    const projectileId = [...context.projectileShapes.entries()].find(([, shape]) => shape === projectileShape)?.[0];

    if (!projectileId) {
        if (projectileShape?.active) projectileShape.destroy();
        return;
    }

    // Use context.projectileManager
    const projectileOwner = context.projectileManager.getProjectileOwner(projectileId);
    if (projectileOwner !== 'enemy') {
        return; // Only enemy projectiles hit player
    }

    logger.debug(`Player hit by enemy projectile: ${projectileId}`);

    const damage = context.projectileManager.getProjectileDamage(projectileId) ?? 0;
    const eventData: PlayerHitProjectileData = {
        projectileId: projectileId,
        damage: damage,
    };
    eventBus.emit(Events.PLAYER_HIT_PROJECTILE, eventData);

    // Destroy the projectile shape immediately
    projectileShape.destroy();
    context.projectileShapes.delete(projectileId); // Delete from the map via context
}


export function handlePlayerPowerupCollision(
    object1: unknown,
    object2: unknown,
    context: CollisionContext
): void {
    // Determine which object is the player and which is the powerup sprite
    let playerSprite: Phaser.Physics.Arcade.Sprite | null = null;
    let powerupSprite: Phaser.Physics.Arcade.Sprite | null = null;

    if (
        object1 === context.playerSprite &&
        object2 instanceof Phaser.Physics.Arcade.Sprite &&
        context.powerupGroup.contains(object2) // Check if it's in the powerup group via context
    ) {
        playerSprite = context.playerSprite; // Assign the known type
        powerupSprite = object2;
    } else if (
        object2 === context.playerSprite &&
        object1 instanceof Phaser.Physics.Arcade.Sprite &&
        context.powerupGroup.contains(object1) // Check if it's in the powerup group via context
    ) {
        playerSprite = context.playerSprite; // Assign the known type
        powerupSprite = object1;
    } else {
        return; // Not the collision pair we're looking for
    }

    if (!powerupSprite) return;

    // Find the instance ID associated with this sprite using context.powerupSprites
    const instanceIdEntry = [...context.powerupSprites.entries()].find(
        ([, sprite]) => sprite === powerupSprite
    );

    if (!instanceIdEntry) {
        logger.warn('Player collision with unknown powerup sprite.');
        if (powerupSprite?.active) powerupSprite.destroy();
        return;
    }

    const instanceId = instanceIdEntry[0];
    logger.log(`[CollisionHandler] Player collected Powerup Instance ID: ${instanceId}`);
    logger.debug(`Player collected powerup instance: ${instanceId}`);

    // Emit the POWERUP_COLLECTED event for the PowerupManager
    // Convert numeric ID to string 'powerup_X' format
    const instanceIdString = `powerup_${instanceId}`;
    const eventData: PowerupCollectedData = { instanceId: instanceIdString };
    eventBus.emit(Events.POWERUP_COLLECTED, eventData);

    // Destroy the powerup sprite immediately after collection
    powerupSprite.destroy();
    context.powerupSprites.delete(instanceId); // Delete from the map via context
    // Sound playing might be better handled elsewhere (e.g., PowerupManager or Scene EventHandler)
}