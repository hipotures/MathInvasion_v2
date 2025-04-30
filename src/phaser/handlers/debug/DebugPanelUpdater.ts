import PlayerManager from '../../../core/managers/PlayerManager';
import WeaponManager from '../../../core/managers/WeaponManager';
import { EnemyManager } from '../../../core/managers/EnemyManager';
import EconomyManager from '../../../core/managers/EconomyManager';
import DebugManager from '../../../core/managers/DebugManager';
import HtmlDebugPanel from '../../../core/utils/HtmlDebugPanel';
import debugState from '../../../core/utils/DebugState';
import logger from '../../../core/utils/Logger';
import Phaser from 'phaser'; // Needed for playerSprite type hint

// Define a more specific type for the debug data structure
interface DebugPanelData {
  Player: {
    health: number;
    isInvulnerable: boolean;
    position: { x: string; y: string };
  };
  Weapon: {
    currentWeapon: string;
    level: number;
    cooldown: string;
  };
  Game: {
    enemyCount: number;
    projectileCount: number;
    powerupCount: number;
    currentWave: number;
    score: number;
    currency: number;
  };
}

/**
 * Helper class responsible for collecting debug data from managers
 * and updating the HTML debug panel.
 */
export class DebugPanelUpdater {
  private playerManager: PlayerManager;
  private weaponManager: WeaponManager;
  private enemyManager: EnemyManager;
  private economyManager: EconomyManager;
  private debugManager: DebugManager;
  private htmlDebugPanel: HtmlDebugPanel;

  // References to sprite collections needed for counts
  private playerSprite: Phaser.Physics.Arcade.Sprite;
  private enemySprites: Map<string, Phaser.GameObjects.Sprite>;
  private projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite>;
  private powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>;

  constructor(
    playerManager: PlayerManager,
    weaponManager: WeaponManager,
    enemyManager: EnemyManager,
    economyManager: EconomyManager,
    debugManager: DebugManager,
    htmlDebugPanel: HtmlDebugPanel,
    playerSprite: Phaser.Physics.Arcade.Sprite,
    enemySprites: Map<string, Phaser.GameObjects.Sprite>,
    projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite>,
    powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>
  ) {
    this.playerManager = playerManager;
    this.weaponManager = weaponManager;
    this.enemyManager = enemyManager;
    this.economyManager = economyManager;
    this.debugManager = debugManager;
    this.htmlDebugPanel = htmlDebugPanel;
    this.playerSprite = playerSprite;
    this.enemySprites = enemySprites;
    this.projectileSprites = projectileSprites;
    this.powerupSprites = powerupSprites;
  }

  /**
   * Collects data and updates the debug panel.
   */
  public update(): void {
    if (!debugState.isDebugMode) return;

    try {
      // Collect data from all managers using the specific type
      const debugData: DebugPanelData = {
        Player: {
          health: this.getPlayerHealth(),
          isInvulnerable: this.getPlayerInvulnerable(),
          position: {
            x: this.playerSprite ? this.playerSprite.x.toFixed(0) : 'N/A',
            y: this.playerSprite ? this.playerSprite.y.toFixed(0) : 'N/A',
          },
        },
        Weapon: {
          currentWeapon: this.getCurrentWeaponId(),
          level: this.getCurrentWeaponLevel(),
          cooldown: this.getCurrentCooldown().toFixed(0),
        },
        Game: {
          enemyCount: this.enemySprites.size,
          projectileCount: this.projectileSprites.size,
          powerupCount: this.powerupSprites.size,
          currentWave: this.getCurrentWave(),
          score: this.getCurrentScore(),
          currency: this.getCurrentCurrency(),
        },
      };

      // Update the debug manager with this data
      this.debugManager.updateDebugData('GameScene', debugData);

      // Update the HTML debug panel
      this.htmlDebugPanel.updateData(debugData);
    } catch (error) {
      logger.warn(`Error updating debug panel: ${error}`);
    }
  }

  // --- Private Helper Methods for Data Retrieval ---

  private getPlayerHealth(): number {
    // Accessing private state directly is not ideal, but necessary without public getters
    // Consider adding public getters to managers if this pattern repeats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.playerManager as any).health ?? 0; // Disable rule for this line
  }

  private getPlayerInvulnerable(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.playerManager as any).isInvulnerable ?? false; // Disable rule for this line
  }

  private getCurrentWeaponId(): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.weaponManager as any).currentWeaponId ?? 'unknown'; // Disable rule for this line
  }

  private getCurrentWeaponLevel(): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.weaponManager as any).currentWeaponLevel ?? 1; // Disable rule for this line
  }

  private getCurrentCooldown(): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.weaponManager as any).cooldownTimer ?? 0; // Disable rule for this line
  }

  private getCurrentWave(): number {
    // Assuming EnemyManager has a public getter or method
    return this.enemyManager.getCurrentWave();
  }

  private getCurrentScore(): number {
    // Assuming EconomyManager has a public getter
    return this.economyManager.getCurrentScore();
  }

  private getCurrentCurrency(): number {
    // Assuming EconomyManager has a public getter
    return this.economyManager.getCurrentCurrency();
  }

  // No explicit destroy needed for this helper unless it adds listeners itself
}
