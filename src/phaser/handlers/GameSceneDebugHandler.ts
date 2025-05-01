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
import HtmlDebugLabels from '../../core/utils/HtmlDebugLabels';
import { DebugPanelUpdater } from './debug/DebugPanelUpdater';
import { DebugObjectInspector } from '../../core/utils/debug/DebugObjectInspector';
import { ProjectileShape } from './event/ProjectileEventHandler';
import { EnemyEntity } from '../entities/EnemyEntity';

// Import the new handler classes
import { DebugVisualizationHandler } from './debug/handlers/DebugVisualizationHandler';
import { DebugInteractionHandler } from './debug/handlers/DebugInteractionHandler';
import { DebugInspectionHandler } from './debug/handlers/DebugInspectionHandler';

/**
 * Handles debug visualization and functionality for the game scene
 * This class orchestrates the debug functionality by delegating to specialized handlers
 */
export class GameSceneDebugHandler {
  private scene: Phaser.Scene;
  private htmlDebugPanel: HtmlDebugPanel;
  private htmlDebugLabels: HtmlDebugLabels;
  private debugPanelUpdater: DebugPanelUpdater;
  
  // Specialized handlers
  private visualizationHandler: DebugVisualizationHandler;
  private interactionHandler: DebugInteractionHandler;
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

    // Instantiate the DebugPanelUpdater
    this.debugPanelUpdater = new DebugPanelUpdater(
      playerManager,
      weaponManager,
      enemyManager,
      projectileManager,
      powerupManager,
      economyManager,
      debugManager,
      this.htmlDebugPanel,
      playerSprite,
      enemySprites,
      this.projectileShapes,
      powerupSprites
    );

    // Create the specialized handlers
    
    // Visualization handler for drawing debug visuals
    this.visualizationHandler = new DebugVisualizationHandler(
      scene,
      playerSprite,
      enemySprites,
      projectileShapes,
      powerupSprites,
      this.htmlDebugLabels
    );
    
    // Inspection handler for object inspection
    this.inspectionHandler = new DebugInspectionHandler(debugObjectInspector);
    
    // Interaction handler for making objects interactive
    this.interactionHandler = new DebugInteractionHandler(
      scene,
      playerSprite,
      enemySprites,
      projectileShapes,
      powerupSprites,
      this.handleObjectClick.bind(this),
      this.handleSceneClick.bind(this)
    );

    // Bind methods
    this.handleDebugModeChanged = this.handleDebugModeChanged.bind(this);
    
    // Register event listeners
    eventBus.on(Events.DEBUG_MODE_CHANGED, this.handleDebugModeChanged);
    
    // Listen for game pause/resume events to ensure objects remain interactive
    eventBus.on(Events.GAME_PAUSED, () => {
      logger.debug('GameSceneDebugHandler: Game paused, ensuring objects remain interactive');
      if (debugState.isDebugMode) {
        // Re-enable interactivity for all objects when paused
        this.interactionHandler.setObjectInteractivity(true);
      }
    });
    
    eventBus.on(Events.GAME_RESUMED, () => {
      logger.debug('GameSceneDebugHandler: Game resumed');
      if (debugState.isDebugMode) {
        // Re-enable interactivity for all objects when resumed
        this.interactionHandler.setObjectInteractivity(true);
      }
    });
  }

  /**
   * Handles changes to debug mode
   * @param data Debug mode change data
   */
  public handleDebugModeChanged(data: { isDebugMode: boolean }): void {
    logger.log(`Debug mode changed to: ${data.isDebugMode}`);

    // Toggle HTML debug panel and labels
    this.htmlDebugPanel.setVisible(data.isDebugMode);
    this.htmlDebugLabels.setVisible(data.isDebugMode);

    // Toggle object visibility
    this.visualizationHandler.toggleObjectVisibility(!data.isDebugMode);

    // Toggle object interactivity
    this.interactionHandler.setObjectInteractivity(data.isDebugMode);

    // Update all sprites to show/hide debug info and set interactivity
    if (data.isDebugMode) {
      this.updateDebugVisuals();
    } else {
      // Clear all debug labels and stop inspecting when debug mode is disabled
      this.htmlDebugLabels.clearLabels();
      this.inspectionHandler.stopInspecting(); // Stop inspecting if debug mode is turned off
    }
  }

  /**
   * Updates all debug visuals
   */
  public updateDebugVisuals(): void {
    // Only proceed if debug mode is enabled
    if (!debugState.isDebugMode) return;

    // Update visuals using the visualization handler
    this.visualizationHandler.updateDebugVisuals(this.inspectionHandler.getInspectionState());

    // Update HTML debug panel using the updater
    this.debugPanelUpdater.update();
  }

  /**
   * Handles a click on a game object
   * @param gameObject The game object that was clicked
   */
  private handleObjectClick(gameObject: Phaser.GameObjects.GameObject): void {
    if (!debugState.isDebugMode) return; // Only allow clicks in debug mode
    
    // Log the clicked object to the console
    logger.debug("Clicked object:", gameObject);
    
    // Delegate to the inspection handler
    const stateChanged = this.inspectionHandler.handleObjectClick(gameObject);
    
    // Force redraw to update highlight color immediately if state changed
    if (stateChanged) {
      this.updateDebugVisuals();
    }
  }
  
  /**
   * Handles a click on the scene
   * @param pointer The pointer that triggered the click
   */
  private handleSceneClick(pointer: Phaser.Input.Pointer): void {
    if (!debugState.isDebugMode) return;
    
    logger.debug("Scene clicked at:", pointer.x, pointer.y);
    logger.debug("Debug mode is active:", debugState.isDebugMode);
    logger.debug("Player sprite position:", this.playerSprite.x, this.playerSprite.y);
    
    // Log all active game objects
    logger.debug("Active game objects:");
    logger.debug("Player:", this.playerSprite.active ? "Active" : "Inactive");
    logger.debug("Enemy count:", this.enemySprites.size);
    logger.debug("Projectile count:", this.projectileShapes.size);
    logger.debug("Powerup count:", this.powerupSprites.size);
    
    // Check if any objects are interactive
    logger.debug("Player interactive:", this.playerSprite.input ? "Yes" : "No");
  }

  /**
   * Cleans up resources used by this handler
   */
  public destroy(): void {
    // Remove event listeners
    eventBus.off(Events.DEBUG_MODE_CHANGED, this.handleDebugModeChanged);
    
    // Remove pause/resume event listeners
    eventBus.off(Events.GAME_PAUSED, () => {});
    eventBus.off(Events.GAME_RESUMED, () => {});
    
    // Destroy specialized handlers
    this.visualizationHandler.destroy();
    this.interactionHandler.destroy();
    this.inspectionHandler.destroy();

    // Destroy HTML debug panel and labels
    this.htmlDebugPanel.destroy();
    this.htmlDebugLabels.destroy();
    
    logger.log('GameSceneDebugHandler destroyed and listeners removed');
  }
}
