import logger from '../../utils/Logger';
import { EventBus as EventBusType } from '../../events/EventBus';
import * as Events from '../../constants/events';
import { PlayerPowerupHandler } from '../helpers/PlayerPowerupHandler';
import {
    type PlayerHitEnemyData,
    type PlayerHitProjectileData,
    type PlayerStateUpdateData,
} from '../types/PlayerManager.types';
import { INVULNERABILITY_DURATION_MS } from '../../constants/gameplay';

// --- Type Definitions for Function Arguments ---

// Using refs for mutable state managed by the main class
interface PlayerStateRef {
    isMovingLeft: boolean;
    isMovingRight: boolean;
    health: number;
    isInvulnerable: boolean;
    invulnerabilityTimer: number;
    velocityX: number; // Needed for stopping on death
}

interface DamageArgs {
    stateRef: PlayerStateRef;
    playerPowerupHandler: PlayerPowerupHandler;
    eventBus: EventBusType;
    emitStateUpdateFn: () => void; // Function to trigger state update emission
}

// --- Action Functions ---

export function handlePlayerHitEnemy(
    data: PlayerHitEnemyData,
    { stateRef, playerPowerupHandler, eventBus, emitStateUpdateFn }: DamageArgs
): void {
    // Check both post-hit invulnerability and shield powerup
    if (
        stateRef.isInvulnerable ||
        playerPowerupHandler.isShieldPowerupActive() ||
        stateRef.health <= 0
    ) {
        logger.debug(`Player hit enemy ${data.enemyInstanceId}, but is invulnerable.`);
        return;
    }

    stateRef.health -= data.damage;
    logger.log(
        `Player took ${data.damage} damage from enemy ${data.enemyInstanceId}. Health: ${stateRef.health}`
    );

    if (stateRef.health <= 0) {
        stateRef.health = 0;
        logger.log('Player has died!');
        eventBus.emit(Events.PLAYER_DIED);
        // Stop movement immediately on death
        stateRef.velocityX = 0;
        stateRef.isMovingLeft = false;
        stateRef.isMovingRight = false;
    } else {
        // Apply post-hit invulnerability
        stateRef.isInvulnerable = true;
        stateRef.invulnerabilityTimer = INVULNERABILITY_DURATION_MS;
        eventBus.emit(Events.PLAYER_INVULNERABILITY_START);
        logger.debug(`Player invulnerability started (${stateRef.invulnerabilityTimer}ms)`);
    }
    emitStateUpdateFn(); // Trigger state update emission
}

export function handlePlayerHitProjectile(
    data: PlayerHitProjectileData,
    { stateRef, playerPowerupHandler, eventBus, emitStateUpdateFn }: DamageArgs
): void {
    // Check both post-hit invulnerability and shield powerup
    if (
        stateRef.isInvulnerable ||
        playerPowerupHandler.isShieldPowerupActive() ||
        stateRef.health <= 0
    ) {
        logger.debug(`Player hit projectile ${data.projectileId}, but is invulnerable.`);
        return;
    }

    stateRef.health -= data.damage;
    logger.log(
        `Player took ${data.damage} damage from projectile ${data.projectileId}. Health: ${stateRef.health}`
    );

    if (stateRef.health <= 0) {
        stateRef.health = 0;
        logger.log('Player has died!');
        eventBus.emit(Events.PLAYER_DIED);
        // Stop movement immediately on death
        stateRef.velocityX = 0;
        stateRef.isMovingLeft = false;
        stateRef.isMovingRight = false;
    } else {
        // Apply post-hit invulnerability
        stateRef.isInvulnerable = true;
        stateRef.invulnerabilityTimer = INVULNERABILITY_DURATION_MS;
        eventBus.emit(Events.PLAYER_INVULNERABILITY_START);
        logger.debug(`Player invulnerability started (${stateRef.invulnerabilityTimer}ms)`);
    }
    emitStateUpdateFn(); // Trigger state update emission
}