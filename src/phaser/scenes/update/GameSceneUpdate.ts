import Phaser from 'phaser';
import logger from '../../../core/utils/Logger';
import eventBus from '../../../core/events/EventBus';
import * as Events from '../../../core/constants/events';
import { GameManagers, GameObjects, GameHandlers, GameComponents } from '../types/GameSceneTypes';
import { GameSceneCollisionHandler } from '../../handlers/GameSceneCollisionHandler'; // Needed for manual overlap call

/**
 * Handles the main update loop logic for the GameScene.
 */
export class GameSceneUpdate {
    private scene: Phaser.Scene;
    private managers: GameManagers;
    private gameObjects: GameObjects;
    private handlers: GameHandlers;
    private components: GameComponents;

    constructor(
        scene: Phaser.Scene,
        managers: GameManagers,
        gameObjects: GameObjects,
        handlers: GameHandlers,
        components: GameComponents
    ) {
        this.scene = scene;
        this.managers = managers;
        this.gameObjects = gameObjects;
        this.handlers = handlers;
        this.components = components;
    }

    /**
     * The main update loop called by Phaser.
     * @param time The current time.
     * @param delta The delta time in ms since the last frame.
     */
    public update(time: number, delta: number): void {
        // Only update game logic if not paused (check via event manager)
        if (!this.components.eventManager.isPauseActive()) {
            // Update core managers (pass delta in milliseconds)
            this.managers.inputManager.update(delta);
            this.managers.playerManager.update(delta);
            this.managers.weaponManager.update(delta);
            this.managers.projectileManager.update(delta);
            this.managers.enemyManager.update(delta);
            this.managers.powerupManager.update(delta);

            // Removed: processEndOfFrame for collision manager
        }

        // Always update debug visuals, even when paused
        if (this.handlers.debugHandler) {
            this.handlers.debugHandler.updateDebugVisuals();
            // --- MANUAL OVERLAP CHECK & HANDLING ---
            this.triggerManualPowerupOverlap();
            // --- END MANUAL OVERLAP CHECK ---
        }

        // --- Powerup Out-of-Bounds Check ---
        this.checkPowerupsOutOfBounds();
        // --- End Powerup Check ---
    }

    // --- Helper for Manual Powerup Overlap Check & Handling ---
    private triggerManualPowerupOverlap(): void {
        // Only run if necessary components exist
        if (!this.gameObjects?.playerSprite?.body || !this.gameObjects?.powerupGroup) {
            return;
        }

        const playerBody = this.gameObjects.playerSprite.body as Phaser.Physics.Arcade.Body;
        // Ensure player body is valid for checks
        if (!playerBody.enable || !playerBody.isCircle || playerBody.radius <= 0) {
            return;
        }
        const playerRadius = playerBody.radius;
        const playerCenter = playerBody.center;

        this.gameObjects.powerupGroup.children.each((powerupGO) => {
            const powerupSprite = powerupGO as Phaser.Physics.Arcade.Sprite;
            // Check if powerup sprite and its body are active and valid
            if (powerupSprite.active && powerupSprite.body) {
                const powerupBody = powerupSprite.body as Phaser.Physics.Arcade.Body;
                if (powerupBody.enable && powerupBody.isCircle && powerupBody.radius > 0) {
                    const powerupRadius = powerupBody.radius;
                    const powerupCenter = powerupBody.center;
                    const distance = Phaser.Math.Distance.Between(
                        playerCenter.x, playerCenter.y,
                        powerupCenter.x, powerupCenter.y
                    );
                    const radiiSum = playerRadius + powerupRadius;

                    if (distance < radiiSum) {
                        const shouldOverlap = playerBody.enable && powerupBody.enable &&
                            !(playerBody.checkCollision.none || powerupBody.checkCollision.none) &&
                            Phaser.Geom.Intersects.CircleToCircle(
                                new Phaser.Geom.Circle(playerCenter.x, playerCenter.y, playerRadius),
                                new Phaser.Geom.Circle(powerupCenter.x, powerupCenter.y, powerupRadius)
                            );

                        if (shouldOverlap) {
                            // Call the collision handler wrapper method directly
                            this.handlers.collisionHandler.onPlayerPowerupCollision(this.gameObjects.playerSprite, powerupSprite); // Use 'on' prefix
                        }
                    }
                }
            }
            return true; // Continue iteration
        });
    }
    // --- End Helper ---

    // --- Helper for Powerup Out-of-Bounds Check ---
    private checkPowerupsOutOfBounds(): void {
        if (!this.gameObjects?.powerupGroup) return;

        const gameHeight = this.scene.cameras.main.height;
        const removalMargin = 50; // How far below the screen before removing

        const powerupsToRemove: Phaser.Physics.Arcade.Sprite[] = [];

        this.gameObjects.powerupGroup.children.each((powerupGO) => {
            const powerupSprite = powerupGO as Phaser.Physics.Arcade.Sprite;
            if (powerupSprite.y > gameHeight + removalMargin) {
                powerupsToRemove.push(powerupSprite);
            }
            return true; // Continue iteration
        });

        powerupsToRemove.forEach(powerupSprite => {
            const numericInstanceId = powerupSprite.getData('instanceId'); // This is the number
            if (numericInstanceId !== undefined) {
                const instanceIdString = `powerup_${numericInstanceId}`; // Create the string ID
                logger.debug(`Powerup ${instanceIdString} out of bounds, destroying.`);
                // Emit event for PowerupManager cleanup BEFORE destroying sprite/removing from map
                eventBus.emit(Events.POWERUP_OUT_OF_BOUNDS, { instanceId: instanceIdString }); // Emit string ID
                // Remove from the map stored in GameObjects using the string ID
                this.gameObjects.powerupSprites.delete(instanceIdString); // Use string ID
            } else {
                logger.warn('Found out-of-bounds powerup sprite without instanceId, destroying anyway.');
            }
            powerupSprite.destroy(); // Destroy the sprite (implicitly removes from group)
        });
    }
    // --- End Helper ---
}