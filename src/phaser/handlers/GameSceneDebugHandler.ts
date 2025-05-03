import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import debugState from '../../core/utils/DebugState';
import * as Events from '../../core/constants/events';
import DebugManager from '../../core/managers/DebugManager';
import PlayerManager from '../../core/managers/PlayerManager';
import WeaponManager from '../../core/managers/WeaponManager';
import { EnemyManager } from '../../core/managers/EnemyManager';
import ProjectileManager from '../../core/managers/ProjectileManager';
import { PowerupManager } from '../../core/managers/PowerupManager';
import EconomyManager from '../../core/managers/EconomyManager';
import HtmlDebugPanel from '../../core/utils/HtmlDebugPanel';
import HtmlDebugLabels from '../../core/utils/HtmlDebugLabels'; // Keep for instantiation
import { DebugPanelUpdater } from './debug/DebugPanelUpdater';
import { DebugObjectInspector } from '../../core/utils/debug/DebugObjectInspector';
import { ProjectileShape } from './event/ProjectileEventHandler';
import { EnemyEntity } from '../entities/EnemyEntity';

// Import the specialized handlers
import { DebugVisualizationHandler } from './debug/handlers/DebugVisualizationHandler'; // Corrected import path
import { DebugInteractionHandler } from './debug/handlers/DebugInteractionHandler';
import { DebugInspectionHandler } from './debug/handlers/DebugInspectionHandler';
import { DebugDrawableObject } from './debug/types/DebugTypes'; // Keep if needed

/**
 * Handles debug visualization and functionality for the game scene.
 * Orchestrates specialized debug handlers.
 */
export class GameSceneDebugHandler {
    private scene: Phaser.Scene;
    private htmlDebugPanel: HtmlDebugPanel;
    private htmlDebugLabels: HtmlDebugLabels; // Instance for visualization handler
    private debugPanelUpdater: DebugPanelUpdater;

    // Specialized handlers
    private visualizationHandler: DebugVisualizationHandler;
    private interactionHandler: DebugInteractionHandler;
    private inspectionHandler: DebugInspectionHandler;

    // References to game objects (needed for handlers)
    private playerSprite: Phaser.Physics.Arcade.Sprite;
    private enemySprites: Map<string, EnemyEntity>;
    private projectileShapes: Map<string, ProjectileShape>;
    private powerupSprites: Map<string, Phaser.Physics.Arcade.Sprite>; // Changed key to string

    constructor(
        scene: Phaser.Scene,
        playerSprite: Phaser.Physics.Arcade.Sprite,
        enemySprites: Map<string, EnemyEntity>,
        projectileShapes: Map<string, ProjectileShape>,
        powerupSprites: Map<string, Phaser.Physics.Arcade.Sprite>, // Changed key to string
        playerManager: PlayerManager,
        weaponManager: WeaponManager,
        enemyManager: EnemyManager,
        projectileManager: ProjectileManager,
        powerupManager: PowerupManager,
        economyManager: EconomyManager,
        debugManager: DebugManager,
        debugObjectInspector: DebugObjectInspector
    ) {
        this.scene = scene;
        this.playerSprite = playerSprite;
        this.enemySprites = enemySprites;
        this.projectileShapes = projectileShapes;
        this.powerupSprites = powerupSprites; // Changed key to string
  
        // Create HTML UI elements first
        this.htmlDebugPanel = new HtmlDebugPanel();
        this.htmlDebugLabels = new HtmlDebugLabels();
        this.htmlDebugLabels.setScene(scene); // Set scene reference for labels

        // --- Instantiate Handlers ---

        // 1. Inspection Handler (manages selected object state)
        this.inspectionHandler = new DebugInspectionHandler(debugObjectInspector);

        // 2. Visualization Handler (draws shapes, labels, uses label instance)
        this.visualizationHandler = new DebugVisualizationHandler(
            scene,
            playerSprite,
            enemySprites,
            projectileShapes,
            powerupSprites, // Changed key to string
            this.htmlDebugLabels // Pass the created labels instance
          );

        // 3. Interaction Handler (sets interactive flags, cursor, forwards clicks)
        this.interactionHandler = new DebugInteractionHandler(
            scene,
            playerSprite,
            enemySprites,
            projectileShapes,
            powerupSprites, // Changed key to string
            this.handleObjectClick.bind(this) // Callback when an object is clicked
          );

        // 4. Debug Panel Updater (collects data, updates HTML panel)
        this.debugPanelUpdater = new DebugPanelUpdater(
            playerManager,
            weaponManager,
            enemyManager,
            projectileManager,
            powerupManager,
            economyManager,
            debugManager,
            this.htmlDebugPanel,
            this.inspectionHandler, // Pass inspection handler
            debugObjectInspector,   // Pass inspector
            playerSprite,
            enemySprites,
            projectileShapes,
            powerupSprites // Changed key to string
          );

        // Bind methods
        this.handleDebugModeChanged = this.handleDebugModeChanged.bind(this);
        this.handleDebugHitTestRequest = this.handleDebugHitTestRequest.bind(this);

        // Register event listeners
        eventBus.on(Events.DEBUG_MODE_CHANGED, this.handleDebugModeChanged);
        eventBus.on(Events.DEBUG_PERFORM_HIT_TEST, this.handleDebugHitTestRequest);

        // Set initial visibility based on debug state
        this.handleDebugModeChanged({ isDebugMode: debugState.isDebugMode });

        logger.log('GameSceneDebugHandler initialized with specialized handlers.');
    }

    /**
     * Handles changes to debug mode, toggling visibility and interactivity.
     */
    public handleDebugModeChanged(data: { isDebugMode: boolean }): void {
        const isDebugMode = data.isDebugMode;
        logger.debug(`GameSceneDebugHandler: Debug mode changed to ${isDebugMode ? 'ON' : 'OFF'}`);

        // Toggle visibility for UI and visuals
        this.htmlDebugPanel.setVisible(isDebugMode);
        this.visualizationHandler.setVisible(isDebugMode); // Handles labels and graphics

        // Toggle game object visibility (hide in debug, show otherwise)
        this.visualizationHandler.toggleObjectVisibility(!isDebugMode);

        // Toggle interactivity (for cursor changes and potential future use)
        this.interactionHandler.setObjectInteractivity(isDebugMode);

        // Disable pointer events on the game canvas when debug mode is active
        const gameCanvas = this.scene.game.canvas;
        if (gameCanvas) {
            gameCanvas.style.pointerEvents = isDebugMode ? 'none' : 'auto';
        }

        // --- TEMP DEBUG: Disable scene input plugin ---
        // if (this.scene.input) {
        //     this.scene.input.enabled = !isDebugMode;
        //     logger.debug(`[Debug Text Select] Scene input plugin enabled: ${!isDebugMode}`);
        // }
        // --- END TEMP DEBUG ---

        if (!isDebugMode) {
            // Additional cleanup when turning OFF
            this.inspectionHandler.stopInspecting();
        } else {
            // Refresh visuals when turning ON
            this.updateDebugVisuals();
        }
    }

    /**
     * Main update loop for debug visuals. Called by GameScene.
     */
    public updateDebugVisuals(): void {
        if (!debugState.isDebugMode) return;

        // Update visualization handler (draws labels, highlights)
        this.visualizationHandler.updateDebugVisuals(this.inspectionHandler.getInspectionState());

        // Update the HTML debug panel content
        this.debugPanelUpdater.update();
    }

    /**
     * Callback passed to InteractionHandler. Forwards the clicked object
     * to the InspectionHandler to manage the inspection state.
     */
    private handleObjectClick(gameObject: Phaser.GameObjects.GameObject): void {
        if (!debugState.isDebugMode) return; // Should not happen if interactivity is off, but safety check

        const stateChanged = this.inspectionHandler.handleObjectClick(gameObject);
        if (stateChanged) {
            // If inspection state changed, immediately update visuals to reflect it
            this.updateDebugVisuals();
            
            // Make sure debug panel is updated with the newly selected object
            this.debugPanelUpdater.update();
        }
    }

    /**
     * Handles the DEBUG_PERFORM_HIT_TEST event (e.g., from clicking a label).
     * Finds the corresponding game object and triggers the inspection handler.
     */
    private handleDebugHitTestRequest(data: {
        x: number,
        y: number,
        objectType?: string,
        objectId?: string,
        labelId?: string
    }): void {
        if (!debugState.isDebugMode) return;

        const objectType = data.objectType;
        const objectId = data.objectId;
        let hitObject: Phaser.GameObjects.GameObject | null = null;

        // --- Find Object by Type and ID (More reliable than coordinates) ---
        if (objectType && objectId) {
            switch (objectType) {
                case 'player':
                    hitObject = this.playerSprite;
                    break;
                case 'enemy':
                    hitObject = this.enemySprites.get(objectId) || null;
                    break;
                case 'projectile':
                    hitObject = this.projectileShapes.get(objectId) || null;
                    break;
                case 'powerup':
                    // objectId is now 'powerup_X', use it directly as the key
                    hitObject = this.powerupSprites.get(objectId) || null;
                    if (!hitObject) {
                         logger.warn(`Could not find powerup sprite with ID: ${objectId}`);
                    }
                    break;
            }
        }

        // --- Fallback: Coordinate-based Hit Test (Less reliable) ---
        if (!hitObject) {
            const worldPoint = this.scene.cameras.main.getWorldPoint(data.x, data.y);
            const worldX = worldPoint.x;
            const worldY = worldPoint.y;

            const allObjects: DebugDrawableObject[] = [
                this.playerSprite,
                ...Array.from(this.enemySprites.values()),
                ...Array.from(this.projectileShapes.values()),
                ...Array.from(this.powerupSprites.values()) // Values remain sprites
            ].filter(obj => obj?.active) as DebugDrawableObject[]; // Filter out inactive/null

            // Iterate reverse for top-most object
            for (let i = allObjects.length - 1; i >= 0; i--) {
                const obj = allObjects[i];
                let bounds: Phaser.Geom.Rectangle | Phaser.Geom.Circle | null = null;
                const body = (obj as any).body as Phaser.Physics.Arcade.Body | undefined;

                try {
                    if (body) {
                        bounds = body.isCircle
                            ? new Phaser.Geom.Circle(body.center.x, body.center.y, body.radius)
                            : new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
                    } else if (typeof obj.getBounds === 'function') {
                        bounds = obj.getBounds();
                    }

                    if (bounds && bounds.contains(worldX, worldY)) {
                        hitObject = obj;
                        break;
                    }
                } catch (e) { /* Ignore errors during hit testing */ }
            }
        }

        // --- Process Result ---
        if (hitObject) {
            this.handleObjectClick(hitObject); // Use the same logic as direct object click
        } else {
            // Clicked outside any known object or label target
            this.inspectionHandler.stopInspecting();
            this.updateDebugVisuals(); // Update visuals to remove highlight
        }
    }

    /**
     * Cleans up resources used by this handler and its sub-handlers.
     */
    public destroy(): void {
        // Remove event listeners
        eventBus.off(Events.DEBUG_MODE_CHANGED, this.handleDebugModeChanged);
        eventBus.off(Events.DEBUG_PERFORM_HIT_TEST, this.handleDebugHitTestRequest);

        // Destroy handlers and UI elements
        if (this.visualizationHandler) this.visualizationHandler.destroy();
        if (this.interactionHandler) this.interactionHandler.destroy();
        if (this.inspectionHandler) this.inspectionHandler.destroy();
        if (this.htmlDebugPanel) this.htmlDebugPanel.destroy();
        // htmlDebugLabels is destroyed by visualizationHandler

        if (this.debugPanelUpdater && typeof this.debugPanelUpdater.destroy === 'function') {
            this.debugPanelUpdater.destroy();
        }

        logger.log('GameSceneDebugHandler destroyed and listeners removed');
    }
}
