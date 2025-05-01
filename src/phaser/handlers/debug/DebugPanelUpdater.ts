import Phaser from 'phaser';
import logger from '../../../core/utils/Logger';
import debugState from '../../../core/utils/DebugState';
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
import { DebugPanelFormatter } from './formatters/DebugPanelFormatter';

/**
 * Orchestrates the collection and formatting of debug data for the debug panel
 */
export class DebugPanelUpdater {
  private htmlDebugPanel: HtmlDebugPanel;
  
  // Specialized collectors
  private playerCollector: PlayerDataCollector;
  private enemyCollector: EnemyDataCollector;
  private projectileCollector: ProjectileDataCollector;
  private powerupCollector: PowerupDataCollector;
  private gameStateCollector: GameStateDataCollector;
  private formatter: DebugPanelFormatter;

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
    this.formatter = new DebugPanelFormatter();
  }

  /**
   * Collects and formats debug data, then updates the HTML panel
   */
  public update(): void {
    if (!debugState.isDebugMode) return;

    try {
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
      const debugData: DebugPanelData = {
        Weapon: weaponData,
        Game: gameData,
        ActiveObjects: {
          legend: this.formatter.createLegend(),
          objects: activeObjects,
        },
      };

      // Format and update the HTML debug panel
      const formattedData = this.formatter.formatData(debugData);
      this.htmlDebugPanel.updateData(formattedData);
    } catch (error) {
      logger.warn(`Error updating debug panel: ${error}`);
    }
  }
}
