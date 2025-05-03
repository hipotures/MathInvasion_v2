import Phaser from 'phaser';
import LoggerInstance, { Logger as LoggerType } from '../../../core/utils/Logger';
import EventBusInstance, { EventBus as EventBusType } from '../../../core/events/EventBus';
import * as Events from '../../../core/constants/events';
import { EnemyConfig } from '../../../core/config/schemas/enemySchema';
import { EnemyEntity } from '../EnemyEntity'; // Import the main class for type hints

// --- Type Definitions for Function Arguments ---

interface BehaviorContext {
    entity: EnemyEntity; // Reference to the main entity instance
    time: number;
    delta: number;
    logger: LoggerType;
    eventBus: EventBusType;
}

// --- Behavior Functions ---

export function handleMovement({ entity, time, logger, delta }: BehaviorContext): void {
    if (!entity.body || !entity.active) {
        return;
    }
    // Use getters for private properties
    const baseSpeedMultiplier = entity.getBaseSpeedMultiplier();
    const currentSlowMultiplier = entity.getCurrentSlowMultiplier();
    const speed = entity.enemyConfig.baseSpeed * baseSpeedMultiplier * currentSlowMultiplier;

    // Visual indicator for slow (optional) - This might be better handled by a visual component/handler
    if (currentSlowMultiplier < 1.0) {
        entity.setTint(0xadd8e6); // Light blue tint when slowed
    } else {
        // Check tint before clearing
        if (entity.tintTopLeft === 0xadd8e6) {
            entity.clearTint();
        }
    }

    // Apply movement based on pattern
    switch (entity.enemyConfig.movementPattern) {
        case 'invader_standard':
        case 'invader_support':
            if (entity.body.blocked.right) {
                entity.setVelocityX(-speed);
            } else if (entity.body.blocked.left) {
                entity.setVelocityX(speed);
            }
            // Ensure velocity is maintained if blocked
            if (Math.abs(entity.body.velocity.x) < speed * 0.9 && (entity.body.blocked.right || entity.body.blocked.left)) {
                entity.setVelocityX(entity.body.velocity.x >= 0 ? speed : -speed);
            } else if (Math.abs(entity.body.velocity.x) < 1 && !entity.body.blocked.right && !entity.body.blocked.left) {
                // If somehow stopped mid-air, restart movement
                entity.setVelocityX(speed * (Math.random() < 0.5 ? -1 : 1));
            }
            // Gentle downward movement
            if (entity.y < -10) { entity.setVelocityY(0); } else { entity.setVelocityY(speed * 0.1); }
            break;

        case 'boss_weaving': {
            const frequency = 0.001;
            const amplitude = speed * 1.5;
            const horizontalVelocity = Math.sin(time * frequency) * amplitude;
            entity.setVelocityX(horizontalVelocity);
            if (entity.y < -10) { entity.setVelocityY(0); } else { entity.setVelocityY(speed * 0.5); }
            break;
        }
        case 'bomber_dive': {
            if (entity.body.velocity.x !== 0) entity.setVelocityX(0); // Ensure no horizontal movement
            if (entity.y < -10) { entity.setVelocityY(0); } else { entity.setVelocityY(speed * 1.5); } // Faster downward movement
            break;
        }
        case 'strafe_horizontal': {
            if (entity.body.blocked.right) {
                entity.setVelocityX(-speed);
            } else if (entity.body.blocked.left) {
                entity.setVelocityX(speed);
            }
            if (Math.abs(entity.body.velocity.x) < speed * 0.9 && (entity.body.blocked.right || entity.body.blocked.left)) {
                entity.setVelocityX(entity.body.velocity.x >= 0 ? speed : -speed);
            } else if (Math.abs(entity.body.velocity.x) < 1 && !entity.body.blocked.right && !entity.body.blocked.left) {
                entity.setVelocityX(speed * (Math.random() < 0.5 ? -1 : 1));
            }
            // Very slow downward movement
            if (entity.y < -10) { entity.setVelocityY(0); } else { entity.setVelocityY(speed * 0.05); }
            break;
        }
        default:
            logger.warn(`Unknown movement pattern: ${entity.enemyConfig.movementPattern}`);
            if (entity.body.velocity.x !== 0) entity.setVelocityX(0);
            if (entity.y < -10) { entity.setVelocityY(0); } else { entity.setVelocityY(speed); } // Default downward movement
            break;
    }
}

export function handleShooting({ entity, time, delta, logger, eventBus }: BehaviorContext): void {
    if (!entity.enemyConfig.canShoot || !entity.enemyConfig.shootConfig || !entity.active) {
        return;
    }

    // Use getter and setter for cooldown timer
    let currentCooldown = entity.getShootCooldownTimer();
    currentCooldown -= delta;

    if (currentCooldown <= 0) {
        // Check if the entity is sufficiently on screen to shoot
        if (entity.y >= 50) { // Threshold to start shooting
            logger.debug(`Enemy ${entity.instanceId} requesting fire (y >= 50).`);
            
            // Add detailed logging before emitting the event
            logger.debug(`Enemy ${entity.instanceId} - Config ID: ${entity.enemyConfig.id}, canShoot: ${entity.enemyConfig.canShoot}`);
            if (entity.enemyConfig.shootConfig) {
                logger.debug(`Enemy ${entity.instanceId} - Shoot Config: type=${entity.enemyConfig.shootConfig.projectileType}, cooldown=${entity.enemyConfig.shootConfig.cooldownMs}`);
            } else {
                logger.error(`Enemy ${entity.instanceId} - !!! shootConfig is MISSING or undefined !!!`);
            }

            if (entity.scene) { // Ensure scene context exists
                // Double-check shootConfig before emitting
                if (entity.enemyConfig.shootConfig) {
                    eventBus.emit(Events.ENEMY_REQUEST_FIRE, {
                        instanceId: entity.instanceId,
                        x: entity.x,
                        y: entity.getBottomCenter().y, // Fire from bottom center
                        shootConfig: entity.enemyConfig.shootConfig,
                    });
                    logger.debug(`Enemy ${entity.instanceId} - ENEMY_REQUEST_FIRE event emitted.`);
                    // Reset cooldown using setter ONLY after successful fire attempt
                    currentCooldown = entity.enemyConfig.shootConfig.cooldownMs;
                } else {
                     logger.error(`Enemy ${entity.instanceId} - Aborted firing due to missing shootConfig.`);
                     // Reset cooldown anyway to prevent rapid error logging
                     currentCooldown = 5000; // Default long cooldown on error
                }
            } else {
                logger.error(`Enemy ${entity.instanceId} tried to fire but scene context is missing.`);
                // Reset cooldown anyway
                currentCooldown = 5000;
            }
        } else {
            // Reset cooldown even if not firing, prevents instant firing when reaching threshold
            // Check if shootConfig exists before accessing cooldownMs
            if (entity.enemyConfig.shootConfig) {
                currentCooldown = entity.enemyConfig.shootConfig.cooldownMs;
            } else {
                // If shootConfig is missing but canShoot was true, use a default cooldown
                logger.warn(`Enemy ${entity.instanceId} has canShoot=true but missing shootConfig. Using default cooldown.`);
                currentCooldown = 5000; // Default long cooldown
            }
            logger.debug(`Enemy ${entity.instanceId} ready to fire but not far enough on screen (y=${entity.y}). Cooldown reset.`);
        }
    }
    // Update the entity's timer via setter
    entity.setShootCooldownTimer(currentCooldown);
}

export function checkOffScreen({ entity, logger, eventBus }: BehaviorContext): void {
    if (!entity.active || !entity.scene) return; // Check if active and scene exists

    // Check if below the bottom edge of the camera viewport
    if (entity.y > entity.scene.cameras.main.height + entity.displayHeight) {
        logger.debug(`Enemy ${entity.instanceId} went off-screen at y=${entity.y}. Destroying.`);
        eventBus.emit(Events.ENEMY_OFF_SCREEN, { instanceId: entity.instanceId });

        // Deactivate and disable physics immediately
        entity.setActive(false).setVisible(false);
        if (entity.body) {
            entity.disableBody(true, true); // Disable body and remove from physics world
        }
        // The actual destruction might be handled by EnemyManager listening to ENEMY_OFF_SCREEN
    }
}