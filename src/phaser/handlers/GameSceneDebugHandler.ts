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
import HtmlDebugLabels from '../../core/utils/HtmlDebugLabels'; // Ensure this is imported
import { DebugPanelUpdater } from './debug/DebugPanelUpdater';
import { DebugObjectInspector } from '../../core/utils/debug/DebugObjectInspector';
import { ProjectileShape } from './event/ProjectileEventHandler';
import { EnemyEntity } from '../entities/EnemyEntity';

// Import the new handler classes
import { DebugVisualizationHandler } from './debug/handlers/DebugVisualizationHandler';
import { DebugInteractionHandler } from './debug/handlers/DebugInteractionHandler'; // Keep for cursor setting
import { DebugInspectionHandler } from './debug/handlers/DebugInspectionHandler';
import { DebugDrawableObject } from './debug/types/DebugTypes'; // Import DebugDrawableObject

/**
 * Handles debug visualization and functionality for the game scene
 * This class orchestrates the debug functionality by delegating to specialized handlers
 */
export class GameSceneDebugHandler {
  private scene: Phaser.Scene;
  private htmlDebugPanel: HtmlDebugPanel;
  private htmlDebugLabels: HtmlDebugLabels; // Instance is already here
  private debugPanelUpdater: DebugPanelUpdater;
  
  // Specialized handlers
  private visualizationHandler: DebugVisualizationHandler;
  private interactionHandler: DebugInteractionHandler; // Keep for cursor setting
  private inspectionHandler: DebugInspectionHandler;

  // References to game objects (needed for handlers)
  private playerSprite: Phaser.Physics.Arcade.Sprite;
  private enemySprites: Map<string, EnemyEntity>;
  private projectileShapes: Map<string, ProjectileShape>;
  private powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>;

  constructor(
    scene: Phaser.Scene,
    playerSprite: Phaser.Physics.Arcade.Sprite,
    enemySprites: Map<string, EnemyEntity>,
    projectileShapes: Map<string, ProjectileShape>,
    powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>,
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
    this.powerupSprites = powerupSprites;

    // Create HTML debug panel and labels
    this.htmlDebugPanel = new HtmlDebugPanel();
    this.htmlDebugLabels = new HtmlDebugLabels();
    this.htmlDebugLabels.setScene(scene); // Set the scene reference

    // --- Instantiate InspectionHandler FIRST ---
    this.inspectionHandler = new DebugInspectionHandler(debugObjectInspector);

    // --- Instantiate DebugPanelUpdater SECOND ---
    // Reverted: Does not need inspectionHandler or debugObjectInspector
    this.debugPanelUpdater = new DebugPanelUpdater(
      playerManager,
      weaponManager,
      enemyManager,
      projectileManager,
      powerupManager,
      economyManager,
      debugManager,
      this.htmlDebugPanel,
      // --- Added missing arguments ---
      this.inspectionHandler,
      debugObjectInspector,
      // --- End added ---
      // Pass the object maps needed by collectors within updater
      playerSprite,
      enemySprites,
      projectileShapes,
      powerupSprites
    );

    // --- Create the REMAINING specialized handlers ---
    
    // Visualization handler for drawing debug visuals
    this.visualizationHandler = new DebugVisualizationHandler(
      scene,
      playerSprite,
      enemySprites,
      projectileShapes,
      powerupSprites,
      this.htmlDebugLabels // Pass labels instance
    );
    
    // Interaction handler - Now ONLY sets interactive flag and cursor
    this.interactionHandler = new DebugInteractionHandler(
      scene,
      playerSprite,
      enemySprites,
      projectileShapes,
      powerupSprites,
      this.handleObjectClick.bind(this) 
    );

    // Bind methods
    this.handleDebugModeChanged = this.handleDebugModeChanged.bind(this);
    this.handleDebugHitTestRequest = this.handleDebugHitTestRequest.bind(this); // Bind new handler
    
    // Register event listeners
    eventBus.on(Events.DEBUG_MODE_CHANGED, this.handleDebugModeChanged);
    eventBus.on(Events.DEBUG_PERFORM_HIT_TEST, this.handleDebugHitTestRequest); // Listen for hit test request
    
    // Listen for game pause/resume events - simplified, no input manipulation needed here
    eventBus.on(Events.GAME_PAUSED, () => {
      logger.debug('GameSceneDebugHandler: Game paused');
    });
    
    eventBus.on(Events.GAME_RESUMED, () => {
      logger.debug('GameSceneDebugHandler: Game resumed');
    });
  }

  /**
   * Handles changes to debug mode
   */
  public handleDebugModeChanged(data: { isDebugMode: boolean }): void {
    // Removed duplicate log message - DebugManager already logs this

    this.htmlDebugPanel.setVisible(data.isDebugMode);
    this.htmlDebugLabels.setVisible(data.isDebugMode);
    
    if (this.visualizationHandler) {
        this.visualizationHandler.toggleObjectVisibility(!data.isDebugMode);
    }
    // Still set interactivity for cursor changes
    if (this.interactionHandler) {
        this.interactionHandler.setObjectInteractivity(data.isDebugMode);
    }
    
    // REMOVED management of scene input / canvas pointer events

    if (data.isDebugMode) {
        this.updateDebugVisuals(); 
    } else {
        // Cleanup when turning debug mode OFF
        this.htmlDebugLabels.clearLabels();
        if (this.visualizationHandler) this.visualizationHandler.destroy(); 
        this.inspectionHandler.stopInspecting(); 
    }
  }

  /**
   * Updates all debug visuals (custom ones)
   */
  public updateDebugVisuals(): void {
    if (!debugState.isDebugMode) return;
    if (this.visualizationHandler) {
       this.visualizationHandler.updateDebugVisuals(this.inspectionHandler.getInspectionState());
    }
    if (this.debugPanelUpdater) {
       this.debugPanelUpdater.update();
    }
  }

  /**
   * Handles the logic when an interactive object is determined to be clicked.
   * @param gameObject The game object that was clicked
   */
  private handleObjectClick(gameObject: Phaser.GameObjects.GameObject): void {
    const stateChanged = this.inspectionHandler.handleObjectClick(gameObject);
    if (stateChanged) {
      this.updateDebugVisuals();
    }
  }
  
  /**
   * Handles the DEBUG_PERFORM_HIT_TEST event emitted by UIScene.
   * Performs manual hit detection using world coordinates and object bounds.
   * @param data Object containing pointer screen coordinates { x: number, y: number }
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

    // If we have object type and ID, use them to find the corresponding game object
    if (objectType && objectId) {
      // Try to find the object based on its type and ID
      let hitObject: Phaser.GameObjects.GameObject | null = null;
      
      // Check player
      if (objectType === 'player') {
        hitObject = this.playerSprite;
      }
      
      // Check enemies
      else if (objectType === 'enemy') {
        // Find the enemy with the matching ID
        for (const [_, enemy] of this.enemySprites.entries()) {
          if (enemy && enemy.active && enemy.instanceId === objectId) {
            hitObject = enemy;
            break;
          }
        }
      }
      
      // Check projectiles
      else if (objectType === 'projectile') {
        // Find the projectile with the matching ID
        if (this.projectileShapes.has(objectId)) {
          hitObject = this.projectileShapes.get(objectId) || null;
        }
      }
      
      // Check powerups
      else if (objectType === 'powerup') {
        // Find the powerup with the matching ID
        const powerupId = parseInt(objectId, 10);
        if (!isNaN(powerupId) && this.powerupSprites.has(powerupId)) {
          hitObject = this.powerupSprites.get(powerupId) || null;
        }
      }
      
      // Process result
      if (hitObject) {
        this.handleObjectClick(hitObject);
        return;
      }
    }
    
    // Fallback to the coordinate-based method if we couldn't find an object by ID
    const pointerX = data.x;
    const pointerY = data.y;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointerX, pointerY);
    const worldX = worldPoint.x;
    const worldY = worldPoint.y;

    let hitObject: Phaser.GameObjects.GameObject | null = null;

    // Gather all potentially interactive objects
    const allObjects: DebugDrawableObject[] = [];
    if (this.playerSprite && this.playerSprite.active) allObjects.push(this.playerSprite);
    this.enemySprites.forEach(sprite => { if (sprite && sprite.active) allObjects.push(sprite); });
    this.projectileShapes.forEach(shape => { if (shape && shape.active) allObjects.push(shape); });
    this.powerupSprites.forEach(sprite => { if (sprite && sprite.active) allObjects.push(sprite); });

    // Iterate and check bounds (reverse order for top-most)
    for (let i = allObjects.length - 1; i >= 0; i--) {
        const obj = allObjects[i];
        let bounds: Phaser.Geom.Rectangle | null = null;

        try {
            // Prioritize physics body bounds if available
            const body = (obj as any).body as Phaser.Physics.Arcade.Body | undefined;
            // Ensure body exists and has getBounds method
            if (body && typeof body.getBounds === 'function') {
                 // Create a new Rectangle to store the bounds
                 const bodyBoundsRect = new Phaser.Geom.Rectangle();
                 body.getBounds(bodyBoundsRect); // Populate the rectangle
                 bounds = bodyBoundsRect;
            } else if (typeof obj.getBounds === 'function') {
                 // Fallback to GameObject's getBounds
                 const objBoundsRect = new Phaser.Geom.Rectangle();
                 obj.getBounds(objBoundsRect); // Populate the rectangle
                 bounds = objBoundsRect;
            }
            
            if (bounds && bounds.contains(worldX, worldY)) {
                hitObject = obj;
                break; // Found hit
            }
        } catch (e) {
            // Silently continue to next object
        }
    }

    // Process result
    if (hitObject) {
        this.handleObjectClick(hitObject);
    } else {
        this.inspectionHandler.stopInspecting();
        this.updateDebugVisuals();
    }
  }


  /**
   * Cleans up resources used by this handler
   */
  public destroy(): void {
    // Remove event listeners
    eventBus.off(Events.DEBUG_MODE_CHANGED, this.handleDebugModeChanged);
    eventBus.off(Events.DEBUG_PERFORM_HIT_TEST, this.handleDebugHitTestRequest); 
    eventBus.off(Events.GAME_PAUSED, () => {}); 
    eventBus.off(Events.GAME_RESUMED, () => {});
    
    // Destroy handlers and UI elements
    if (this.visualizationHandler) this.visualizationHandler.destroy();
    if (this.interactionHandler) this.interactionHandler.destroy(); 
    if (this.inspectionHandler) this.inspectionHandler.destroy();
    if (this.htmlDebugPanel) this.htmlDebugPanel.destroy();
    if (this.htmlDebugLabels) this.htmlDebugLabels.destroy();
    if (this.debugPanelUpdater && typeof this.debugPanelUpdater.destroy === 'function') {
        this.debugPanelUpdater.destroy();
    }
    
    logger.log('GameSceneDebugHandler destroyed and listeners removed');
  }
}
