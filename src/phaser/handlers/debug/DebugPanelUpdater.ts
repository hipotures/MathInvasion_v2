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

/**
 * Orchestrates the collection of debug data for the debug panel,
 * and handles switching between overview and inspection views.
 */
export class DebugPanelUpdater {
  private htmlDebugPanel: HtmlDebugPanel;
  private isInspecting: boolean = false; // Flag to track inspection state
  private inspectionData: { [key: string]: any } | null = null; // Store raw inspection data object

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
    playerSprite: Phaser.Physics.Arcade.Sprite,
    enemySprites: Map<string, EnemyEntity>,
    projectileShapes: Map<string, ProjectileShape>,
    powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>
  ) {
    this.htmlDebugPanel = htmlDebugPanel;

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
      powerupSprites.size,
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
    logger.debug('DebugPanelUpdater: Received show inspection details', data.data);
    // Store the raw data object
    this.inspectionData = data.data;
    // If data is null (error case from handler), stop inspecting
    this.isInspecting = data.data !== null;
    this.update(); // Immediately update the panel
  }

  /**
   * Handles the event to stop inspection and revert to the overview.
   */
  private handleStopInspecting(): void {
    logger.debug('DebugPanelUpdater: Received stop inspecting');
    this.inspectionData = null; // Clear stored data
    this.isInspecting = false;
    this.update(); // Immediately update the panel
  }

  /**
   * Updates the HTML debug panel, passing either the overview or inspection data object.
   */
  public update(): void {
    if (!debugState.isDebugMode) return;

    try {
      if (this.isInspecting && this.inspectionData) {
        // Pass the raw inspection data object to HtmlDebugPanel
        this.htmlDebugPanel.updateData(this.inspectionData); 
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
    // Update entity counts in the game state collector
    this.gameStateCollector.updateCounts(
      this.enemyCollector.getEnemyCount(),
      this.projectileCollector.getProjectileCount(),
      this.powerupCollector.getPowerupCount(),
      this.enemyCollector.getCurrentWave()
    );

    // Collect data from all collectors
    const playerData = this.playerCollector.collectData();
    const enemyData = this.enemyCollector.collectData();
    const projectileData = this.projectileCollector.collectData();
    const powerupData = this.powerupCollector.collectData();
    const gameData = this.gameStateCollector.collectData();
    const weaponData = this.gameStateCollector.collectWeaponData();

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
