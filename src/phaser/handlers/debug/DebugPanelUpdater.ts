import Phaser from 'phaser';
import logger from '../../../core/utils/Logger';
import debugState from '../../../core/utils/DebugState';
import eventBus from '../../../core/events/EventBus'; // Import EventBus
import * as Events from '../../../core/constants/events'; // Import Events
import HtmlDebugPanel from '../../../core/utils/HtmlDebugPanel';
import PlayerManager from '../../../core/managers/PlayerManager';
import WeaponManager from '../../../core/managers/WeaponManager';
import { EnemyManager } from '../../../core/managers/EnemyManager';
import ProjectileManager from '../../../core/managers/ProjectileManager';
import { PowerupManager } from '../../../core/managers/PowerupManager';
import EconomyManager from '../../../core/managers/EconomyManager';
import DebugManager from '../../../core/managers/DebugManager';
import { EnemyEntity } from '../../entities/EnemyEntity';
import { ProjectileShape } from '../event/ProjectileEventHandler';
import { DebugPanelData } from './types/DebugPanelTypes';

// Import specialized collectors
import { PlayerDataCollector } from './collectors/PlayerDataCollector';
import { EnemyDataCollector } from './collectors/EnemyDataCollector';
import { ProjectileDataCollector } from './collectors/ProjectileDataCollector';
import { PowerupDataCollector } from './collectors/PowerupDataCollector';
import { GameStateDataCollector } from './collectors/GameStateDataCollector';
import { DebugPanelFormatter } from './formatters/DebugPanelFormatter'; // Formatter for overview
// Removed DebugDataFormatter import - formatting happens in HtmlDebugPanel
import { InspectionDetailsData } from './types/DebugTypes'; // Import type for event payload
// --- Added Imports ---
import { DebugInspectionHandler } from './handlers/DebugInspectionHandler';
import { DebugObjectInspector } from '../../../core/utils/debug/DebugObjectInspector';
// --- End Added Imports ---

/**
 * Orchestrates the collection of debug data for the debug panel,
 * and handles switching between overview and inspection views.
 */
export class DebugPanelUpdater {
  private htmlDebugPanel: HtmlDebugPanel;
  private isInspecting: boolean = false; // Flag to track inspection state
  // Removed: inspectionData - we will fetch fresh data instead
  // private inspectionData: { [key: string]: any } | null = null;
  private lastUpdateTime: number = Date.now(); // Track time only when not paused

  // --- Added references needed for re-fetching ---
  private inspectionHandler: DebugInspectionHandler;
  private debugObjectInspector: DebugObjectInspector;
  // --- End added references ---

  // Specialized collectors
  private playerCollector: PlayerDataCollector;
  private enemyCollector: EnemyDataCollector;
  private projectileCollector: ProjectileDataCollector;
  private powerupCollector: PowerupDataCollector;
  private gameStateCollector: GameStateDataCollector;
  private overviewFormatter: DebugPanelFormatter; // Renamed for clarity

  constructor(
    playerManager: PlayerManager,
    weaponManager: WeaponManager,
    enemyManager: EnemyManager,
    projectileManager: ProjectileManager,
    powerupManager: PowerupManager,
    economyManager: EconomyManager,
    debugManager: DebugManager,
    htmlDebugPanel: HtmlDebugPanel,
    // --- Added inspectionHandler and debugObjectInspector ---
    inspectionHandler: DebugInspectionHandler,
    debugObjectInspector: DebugObjectInspector,
    // --- End added ---
    playerSprite: Phaser.Physics.Arcade.Sprite,
    enemySprites: Map<string, EnemyEntity>,
    projectileShapes: Map<string, ProjectileShape>,
    powerupSprites: Map<string, Phaser.Physics.Arcade.Sprite> // Changed key type to string
  ) {
    this.htmlDebugPanel = htmlDebugPanel;
    // --- Store added references ---
    this.inspectionHandler = inspectionHandler;
    this.debugObjectInspector = debugObjectInspector;
    // --- End stored ---

    // Initialize specialized collectors
    this.playerCollector = new PlayerDataCollector(playerManager, playerSprite);
    this.enemyCollector = new EnemyDataCollector(enemyManager, enemySprites);
    this.projectileCollector = new ProjectileDataCollector(projectileManager, projectileShapes);
    this.powerupCollector = new PowerupDataCollector(powerupManager, powerupSprites);
    this.gameStateCollector = new GameStateDataCollector(
      weaponManager,
      economyManager,
      enemySprites.size,
      projectileShapes.size,
      powerupSprites.size, // Size is independent of key type
      enemyManager.getCurrentWave()
    );
    this.overviewFormatter = new DebugPanelFormatter();
    // Removed inspectionFormatter instantiation

    // Bind event handlers
    this.handleShowInspectionDetails = this.handleShowInspectionDetails.bind(this);
    this.handleStopInspecting = this.handleStopInspecting.bind(this);

    // Register event listeners
    eventBus.on(Events.DEBUG_SHOW_INSPECTION_DETAILS, this.handleShowInspectionDetails);
    eventBus.on(Events.DEBUG_STOP_INSPECTING, this.handleStopInspecting);
  }

  /**
   * Handles the event to show detailed inspection data.
   * @param data The event data containing the raw inspection data object.
   */
  private handleShowInspectionDetails(data: InspectionDetailsData): void {
    logger.debug('DebugPanelUpdater: Received show inspection details event');
    // Don't store data, just set the flag
    // this.inspectionData = data.data;
    this.isInspecting = data.data !== null;
    // If data is null (error case from handler), ensure we stop inspecting
    if (!this.isInspecting) {
        logger.warn('Show inspection details received null data, stopping inspection.');
    }
    this.update(); // Immediately update the panel with potentially new state
  }

  /**
   * Handles the event to stop inspection and revert to the overview.
   */
  private handleStopInspecting(): void {
    logger.debug('DebugPanelUpdater: Received stop inspecting event');
    // this.inspectionData = null; // No longer storing data
    this.isInspecting = false;
    this.update(); // Immediately update the panel to show overview
  }

  /**
   * Updates the HTML debug panel, passing either the overview or inspection data object.
   */
   public update(): void {
     if (!debugState.isDebugMode) return;

     // Update the time tracker only if the game is not paused
     // This should happen *before* deciding which view to update
     if (!debugState.isPaused) {
        this.lastUpdateTime = Date.now();
     }

     try {
       if (this.isInspecting) {
        // --- Re-fetch data if inspecting ---
        const inspectedGameObject = this.inspectionHandler.getInspectedGameObject();
        if (inspectedGameObject) {
          // Pass the potentially frozen currentTime
          const freshData = this.debugObjectInspector.getObjectDetails(inspectedGameObject, this.lastUpdateTime);
          if (freshData) {
            this.htmlDebugPanel.updateData(freshData);
          } else {
            // Handle case where details couldn't be fetched (e.g., object destroyed between frames)
            logger.warn('Could not fetch fresh inspection data during update.');
            this.htmlDebugPanel.updateData({ Error: 'Could not fetch details' });
            // Optionally stop inspecting if object is gone
            // this.isInspecting = false;
            // this.updateOverview(); // Show overview again
          }
        } else {
           // Inspected object is gone, switch back to overview
           logger.debug('Inspected object no longer available, switching to overview.');
           this.isInspecting = false;
           this.updateOverview();
        }
        // --- End re-fetch ---
      } else {
        // Collect and pass the structured overview data object
        this.updateOverview();
      }
    } catch (error) {
      logger.warn(`Error updating debug panel: ${error}`);
    }
  }

  /**
   * Collects the default overview data object and passes it to the HTML panel.
   */
   private updateOverview(): void {
     // Time update moved to the main update() method
     const currentTime = this.lastUpdateTime; // Use the tracked time

     // Update entity counts in the game state collector
     this.gameStateCollector.updateCounts(
       this.enemyCollector.getEnemyCount(),
      this.projectileCollector.getProjectileCount(),
      this.powerupCollector.getPowerupCount(),
      this.enemyCollector.getCurrentWave()
    );

    // Collect data from all collectors, passing the tracked time
    const playerData = this.playerCollector.collectData(currentTime);
    const enemyData = this.enemyCollector.collectData(currentTime);
    const projectileData = this.projectileCollector.collectData(currentTime);
    const powerupData = this.powerupCollector.collectData(currentTime);
    const gameData = this.gameStateCollector.collectData(); // Game state doesn't need time
    const weaponData = this.gameStateCollector.collectWeaponData(); // Weapon state doesn't need time

    // Combine all active objects
    const activeObjects = [];
    if (playerData) activeObjects.push(playerData);
    activeObjects.push(...enemyData);
    activeObjects.push(...projectileData);
    activeObjects.push(...powerupData);

    // Create the debug panel data structure
    const overviewData: DebugPanelData = {
      Weapon: weaponData,
      Game: gameData,
      ActiveObjects: {
        legend: this.overviewFormatter.createLegend(), // Use overview formatter
        objects: activeObjects,
      },
    };

    // Pass the structured overview data object to HtmlDebugPanel
    this.htmlDebugPanel.updateData(overviewData);
  }
  
  /**
   * Cleans up event listeners.
   */
  public destroy(): void {
    eventBus.off(Events.DEBUG_SHOW_INSPECTION_DETAILS, this.handleShowInspectionDetails);
    eventBus.off(Events.DEBUG_STOP_INSPECTING, this.handleStopInspecting);
    logger.debug('DebugPanelUpdater destroyed and listeners removed');
  }
}
