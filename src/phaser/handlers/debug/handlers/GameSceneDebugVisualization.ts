import Phaser from 'phaser';
import logger from '../../../../core/utils/Logger';
import HtmlDebugLabels from '../../../../core/utils/HtmlDebugLabels';
import { EnemyEntity } from '../../../entities/EnemyEntity';
import { ProjectileShape } from '../../event/ProjectileEventHandler';
import { DebugDrawableObject, InspectionState } from '../types/DebugTypes';
import eventBus from '../../../../core/events/EventBus';

/**
 * Handles drawing debug visualizations (shapes, labels) for game objects.
 */
export class DebugVisualizationHandler {
    private scene: Phaser.Scene;
    private htmlDebugLabels: HtmlDebugLabels;
    private physicsDebugGraphics: Phaser.GameObjects.Graphics | null = null;

    // References to game objects for drawing visuals
    private playerSprite: Phaser.Physics.Arcade.Sprite;
    private enemySprites: Map<string, EnemyEntity>;
    private projectileShapes: Map<string, ProjectileShape>;
    private powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>;

    // Graphics object for custom debug drawings (like inspection highlights)
    private customDebugGraphics: Phaser.GameObjects.Graphics;

    constructor(
        scene: Phaser.Scene,
        playerSprite: Phaser.Physics.Arcade.Sprite,
        enemySprites: Map<string, EnemyEntity>,
        projectileShapes: Map<string, ProjectileShape>,
        powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>,
        htmlDebugLabels: HtmlDebugLabels // Receive the shared instance
    ) {
        this.scene = scene;
        this.playerSprite = playerSprite;
        this.enemySprites = enemySprites;
        this.projectileShapes = projectileShapes;
        this.powerupSprites = powerupSprites;
        this.htmlDebugLabels = htmlDebugLabels;

        // Create graphics objects
        this.physicsDebugGraphics = this.scene.physics.world.createDebugGraphic();
        this.customDebugGraphics = this.scene.add.graphics({ lineStyle: { width: 2, color: 0xffff00 }, fillStyle: { color: 0xffff00, alpha: 0.3 } });
        this.customDebugGraphics.setDepth(1001); // Ensure it's above most things

        // Set initial visibility based on debug state (will be managed by main handler)
        this.setVisible(false); // Start hidden
        
        // Listen for canvas resize events
        eventBus.on('CANVAS_RESIZED', this.handleCanvasResized.bind(this));
    }

    /**
     * Sets the visibility of all debug graphics and labels managed by this handler.
     * @param visible True to show, false to hide.
     */
    public setVisible(visible: boolean): void {
        if (this.physicsDebugGraphics) {
            this.physicsDebugGraphics.setVisible(visible);
            if (!visible) this.physicsDebugGraphics.clear();
        }
        this.customDebugGraphics.setVisible(visible);
        if (!visible) this.customDebugGraphics.clear();

        this.htmlDebugLabels.setVisible(visible);
        if (!visible) this.htmlDebugLabels.clearLabels();
    }

    /**
     * Updates all debug visuals (custom shapes, labels). Physics debug is handled by Phaser.
     * @param inspectionState Current inspection state to highlight the selected object.
     */
    public updateDebugVisuals(inspectionState: InspectionState): void {
        this.customDebugGraphics.clear();
        // We don't clear labels here anymore, updateLabel handles adding/updating/positioning
        // this.htmlDebugLabels.clearLabels();

        const currentLabelIds = new Set(this.htmlDebugLabels.getAllLabelIds());
        const processedLabelIds = new Set<string>();

        const processObject = (obj: DebugDrawableObject) => {
            if (!obj || !obj.active) return;

            const instanceId = obj.getData('instanceId') || (obj === this.playerSprite ? 'player' : 'unknown');
            const configId = obj.getData('configId') || 'N/A';
            const objectType = obj.getData('objectType') || 'unknown';
            const labelId = `debuglabel_${objectType}_${instanceId}`;

            // Add to processed set
            processedLabelIds.add(labelId);

            // Update the label for this object using the correct method
            this.htmlDebugLabels.updateLabel(
                labelId,
                `${objectType}:${instanceId}\nCfg:${configId}`,
                obj.x,
                obj.y,
                '#ffffff', // Default color
                obj
            );

            // Draw inspection highlight if this object is selected, using correct state properties
            const isInspected = inspectionState.id === instanceId && inspectionState.type === objectType;
            if (isInspected) {
                this.drawInspectionHighlight(obj);
                // Update label to show it's selected
                this.htmlDebugLabels.updateLabel(
                    labelId,
                    `⭐ ${objectType}:${instanceId} ⭐\nCfg:${configId}`,
                    obj.x,
                    obj.y,
                    '#ffff00', // Yellow for selected objects
                    obj
                );
            }
        };

        // Process all objects
        processObject(this.playerSprite);
        this.enemySprites.forEach(processObject);
        this.projectileShapes.forEach(processObject);
        this.powerupSprites.forEach(processObject);

        // Remove labels for objects that no longer exist or are inactive
        currentLabelIds.forEach(labelId => {
            if (!processedLabelIds.has(labelId)) {
                this.htmlDebugLabels.removeLabel(labelId);
            }
        });
    }

    /**
     * Draws a highlight around the inspected object.
     * @param obj The game object to highlight.
     */
    private drawInspectionHighlight(obj: DebugDrawableObject): void {
        const body = (obj as any).body as Phaser.Physics.Arcade.Body | undefined;
        
        // Draw collision area (red)
        if (body && body.enable) {
            this.customDebugGraphics.lineStyle(2, 0xff0000, 1); // Red for collision areas
            if (body.isCircle) {
                this.customDebugGraphics.strokeCircle(body.center.x, body.center.y, body.radius);
            } else {
                this.customDebugGraphics.strokeRect(body.x, body.y, body.width, body.height);
            }
        }
        
        // Draw selection highlight (magenta)
        this.customDebugGraphics.lineStyle(2, 0xff00ff); // Magenta highlight
        this.customDebugGraphics.fillStyle(0xff00ff, 0.2);

        if (body) {
            if (body.isCircle) {
                this.customDebugGraphics.strokeCircle(body.center.x, body.center.y, body.radius + 2); // Slightly larger circle
                this.customDebugGraphics.fillCircle(body.center.x, body.center.y, body.radius + 2); // Enable fill
            } else {
                this.customDebugGraphics.strokeRect(body.x - 1, body.y - 1, body.width + 2, body.height + 2); // Slightly larger rect
                this.customDebugGraphics.fillRect(body.x - 1, body.y - 1, body.width + 2, body.height + 2); // Enable fill
            }
        } else if (typeof obj.getBounds === 'function') {
            const bounds = obj.getBounds();
            this.customDebugGraphics.strokeRect(bounds.x - 1, bounds.y - 1, bounds.width + 2, bounds.height + 2);
            this.customDebugGraphics.fillRect(bounds.x - 1, bounds.y - 1, bounds.width + 2, bounds.height + 2); // Enable fill
        }
        
        // Draw a more visible selection indicator
        this.customDebugGraphics.lineStyle(3, 0xffff00, 1); // Yellow outline
        if (body) {
            if (body.isCircle) {
                // Draw a circle around the object
                this.customDebugGraphics.strokeCircle(body.center.x, body.center.y, body.radius + 5);
            } else {
                // Draw a rectangle around the object
                this.customDebugGraphics.strokeRect(body.x - 3, body.y - 3, body.width + 6, body.height + 6);
            }
        } else if (typeof obj.getBounds === 'function') {
            const bounds = obj.getBounds();
            this.customDebugGraphics.strokeRect(bounds.x - 3, bounds.y - 3, bounds.width + 6, bounds.height + 6);
        }
        
        this.customDebugGraphics.lineStyle(2, 0xffff00); // Reset to default for next object (if any)
        this.customDebugGraphics.fillStyle(0xffff00, 0.3); // Reset fill
    }

     /**
     * Optional: Draws bounding box or circle for an object.
     * Physics debug usually handles this better.
     * @param obj The game object.
     */
    // private drawBounds(obj: DebugDrawableObject): void {
    //     const body = (obj as any).body as Phaser.Physics.Arcade.Body | undefined;
    //     this.customDebugGraphics.lineStyle(1, 0x00ff00); // Green bounds
    //     if (body) {
    //         if (body.isCircle) {
    //             this.customDebugGraphics.strokeCircle(body.center.x, body.center.y, body.radius);
    //         } else {
    //             this.customDebugGraphics.strokeRect(body.x, body.y, body.width, body.height);
    //         }
    //     } else if (typeof obj.getBounds === 'function') {
    //         const bounds = obj.getBounds();
    //         this.customDebugGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    //     }
    //      this.customDebugGraphics.lineStyle(2, 0xffff00); // Reset style
    // }


    /**
     * Handle canvas resize events
     */
    private handleCanvasResized(data: { width: number, height: number }): void {
        // Clear and redraw debug graphics
        if (this.physicsDebugGraphics) {
            this.physicsDebugGraphics.clear();
        }
        this.customDebugGraphics.clear();
        
        // Trigger label repositioning by simulating a resize
        this.htmlDebugLabels.setScene(this.scene);
    }

    /**
     * Cleans up graphics objects and labels.
     */
    public destroy(): void {
        // Remove event listeners
        eventBus.off('CANVAS_RESIZED', this.handleCanvasResized.bind(this));
        if (this.physicsDebugGraphics) {
            this.physicsDebugGraphics.destroy();
            this.physicsDebugGraphics = null;
        }
        this.customDebugGraphics.destroy();
        this.htmlDebugLabels.destroy(); // Destroy the labels instance
        logger.log('DebugVisualizationHandler destroyed.');
    }
}