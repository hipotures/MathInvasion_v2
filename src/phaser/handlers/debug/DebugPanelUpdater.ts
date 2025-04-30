import PlayerManager from '../../../core/managers/PlayerManager';
import WeaponManager from '../../../core/managers/WeaponManager';
import { EnemyManager } from '../../../core/managers/EnemyManager';
import ProjectileManager from '../../../core/managers/ProjectileManager'; // Import ProjectileManager
import { PowerupManager } from '../../../core/managers/PowerupManager'; // Use named import
import EconomyManager from '../../../core/managers/EconomyManager';
import DebugManager from '../../../core/managers/DebugManager';
import HtmlDebugPanel from '../../../core/utils/HtmlDebugPanel';
import debugState from '../../../core/utils/DebugState';
import logger from '../../../core/utils/Logger';
import Phaser from 'phaser'; // Needed for playerSprite type hint
// Import necessary types
import { ProjectileShape } from '../event/ProjectileEventHandler';
import { EnemyEntity } from '../../entities/EnemyEntity';

// Define the structure for a single active object's debug data
interface ActiveObjectData {
  ID: string | number; // Unique identifier (string for enemies/projectiles, number for powerups, 'player' for player)
  T: string; // Type (e.g., 'Player', 'Enemy:alien_small', 'Projectile:bullet', 'Powerup:shield')
  X: number; // Position X
  Y: number; // Position Y
  H?: number; // Health (optional)
  I?: boolean; // Invulnerable (optional, Player only)
  Vx?: number; // Velocity X (optional)
  Vy?: number; // Velocity Y (optional)
  A?: number; // Age in seconds (optional)
}

// Define the structure for the legend
interface LegendData {
  [key: string]: string;
}

// Define the overall debug data structure
interface DebugPanelData {
  ActiveObjects: {
    legend: LegendData;
    objects: ActiveObjectData[];
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
 * and updating the HTML debug panel, including a list of active objects.
 */
export class DebugPanelUpdater {
  private playerManager: PlayerManager;
  private weaponManager: WeaponManager;
  private enemyManager: EnemyManager;
  private projectileManager: ProjectileManager; // Add ProjectileManager
  private powerupManager: PowerupManager; // Add PowerupManager
  private economyManager: EconomyManager;
  private debugManager: DebugManager;
  private htmlDebugPanel: HtmlDebugPanel;

  // References to game objects needed for counts/info
  private playerSprite: Phaser.Physics.Arcade.Sprite;
  // Update type
  private enemySprites: Map<string, EnemyEntity>;
  // Rename and update type
  private projectileShapes: Map<string, ProjectileShape>;
  private powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>;

  constructor(
    playerManager: PlayerManager,
    weaponManager: WeaponManager,
    enemyManager: EnemyManager,
    projectileManager: ProjectileManager, // Add ProjectileManager parameter
    powerupManager: PowerupManager, // Add PowerupManager parameter
    economyManager: EconomyManager,
    debugManager: DebugManager,
    htmlDebugPanel: HtmlDebugPanel,
    playerSprite: Phaser.Physics.Arcade.Sprite,
    // Update parameter type
    enemySprites: Map<string, EnemyEntity>,
    // Rename and update parameter type
    projectileShapes: Map<string, ProjectileShape>,
    powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>
  ) {
    this.playerManager = playerManager;
    this.weaponManager = weaponManager;
    this.enemyManager = enemyManager;
    this.projectileManager = projectileManager; // Store ProjectileManager
    this.powerupManager = powerupManager; // Store PowerupManager
    this.economyManager = economyManager;
    this.debugManager = debugManager;
    this.htmlDebugPanel = htmlDebugPanel;
    this.playerSprite = playerSprite;
    // Update assignment
    this.enemySprites = enemySprites;
    // Update assignment
    this.projectileShapes = projectileShapes;
    this.powerupSprites = powerupSprites;
  }

  /**
   * Collects data and updates the debug panel.
   */
  public update(): void {
    if (!debugState.isDebugMode) return;

    try {
      // Collect data for the active objects list
      const activeObjectsData = this.getActiveObjectsData();

      // Collect other data from managers and structure the final object
      // Ensure ActiveObjects is the last key for rendering order
      const debugData: DebugPanelData = {
        Weapon: {
          currentWeapon: this.getCurrentWeaponId(),
          level: this.getCurrentWeaponLevel(),
          cooldown: this.getCurrentCooldown().toFixed(0),
        },
        Game: {
          // Counts are now implicitly derived from the ActiveObjects list size if needed,
          // but keeping explicit counts might still be useful for quick overview.
          enemyCount: this.enemySprites.size,
          projectileCount: this.projectileShapes.size,
          powerupCount: this.powerupSprites.size,
          currentWave: this.getCurrentWave(),
          score: this.getCurrentScore(),
          currency: this.getCurrentCurrency(),
        },
        ActiveObjects: {
          // Moved to the end
          legend: this.getObjectLegend(),
          objects: activeObjectsData,
        },
      };

      // Update the debug manager with this data (optional, depends on DebugManager usage)
      // this.debugManager.updateDebugData('GameScene', debugData);

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

  // --- New Helper Methods for Active Object Data ---

  private getObjectLegend(): LegendData {
    return {
      ID: 'Unique Object ID',
      T: 'Type (Pl=Player, En=Enemy, Pr=Projectile, Pu=Powerup)', // Updated legend
      X: 'Position X',
      Y: 'Position Y',
      H: 'Health',
      I: 'Invulnerable',
      Vx: 'Velocity X',
      Vy: 'Velocity Y',
      A: 'Age (s)', // Add Age to legend
    };
  }

  private getActiveObjectsData(): ActiveObjectData[] {
    const objects: ActiveObjectData[] = [];
    const now = Date.now(); // Get current time once for age calculation

    // 1. Player Data
    if (this.playerSprite && this.playerSprite.active) {
      // Access creationTime directly (assuming it's accessible or made public/getter added)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const creationTime = (this.playerManager as any).creationTime ?? now;
      const age = Math.floor((now - creationTime) / 1000);

      objects.push({
        ID: 'player',
        T: 'Pl', // Shortened type
        A: age, // Add age
        X: Math.round(this.playerSprite.x),
        Y: Math.round(this.playerSprite.y),
        H: this.getPlayerHealth(),
        I: this.getPlayerInvulnerable(),
        Vx: parseFloat(this.playerSprite.body?.velocity.x.toFixed(1) ?? '0'),
        Vy: parseFloat(this.playerSprite.body?.velocity.y.toFixed(1) ?? '0'),
      });
    }

    // 2. Enemy Data
    this.enemySprites.forEach((enemyEntity) => {
      // EnemyEntity extends Sprite, so check its 'active' status directly
      if (enemyEntity.active) {
        // Get health and creation time from EnemyManager using the instanceId
        const health = this.enemyManager.getEnemyHealth(enemyEntity.instanceId);
        const creationTime = this.enemyManager.getEnemyCreationTime(enemyEntity.instanceId) ?? now;
        const age = Math.floor((now - creationTime) / 1000);

        objects.push({
          ID: enemyEntity.instanceId, // Use the unique instanceId
          T: `En:${enemyEntity.configId}`, // Shortened type prefix
          A: age, // Add age
          X: Math.round(enemyEntity.x),
          Y: Math.round(enemyEntity.y),
          H: health, // Get health from manager
          Vx: parseFloat(enemyEntity.body?.velocity.x.toFixed(1) ?? '0'),
          Vy: parseFloat(enemyEntity.body?.velocity.y.toFixed(1) ?? '0'),
        });
      }
    });

    // 3. Projectile Data
    this.projectileShapes.forEach((projectile, id) => {
      // ProjectileShape might be Graphics or Sprite, handle accordingly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (projectile as any).body as Phaser.Physics.Arcade.Body; // Need to cast to access body
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const position = { x: (projectile as any).x ?? 0, y: (projectile as any).y ?? 0 }; // Access position safely
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textureKey = (projectile as any).texture?.key ?? 'shape'; // Get texture key if sprite

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((projectile as any).active) {
        // Check if active
        // Get creation time from ProjectileManager

        const creationTime = this.projectileManager.getProjectileCreationTime(id as string) ?? now; // Assuming id is string here
        const age = Math.floor((now - creationTime) / 1000);

        objects.push({
          ID: id,
          T: `Pr:${textureKey}`, // Shortened type prefix
          A: age, // Add age
          X: Math.round(position.x),
          Y: Math.round(position.y),
          Vx: parseFloat(body?.velocity.x.toFixed(1) ?? '0'),
          Vy: parseFloat(body?.velocity.y.toFixed(1) ?? '0'),
        });
      }
    });

    // 4. Powerup Data
    this.powerupSprites.forEach((powerupSprite, id) => {
      if (powerupSprite.active) {
        // Get creation time from PowerupManager
        const creationTime = this.powerupManager.getPowerupCreationTime(id) ?? now;
        const age = Math.floor((now - creationTime) / 1000);

        objects.push({
          ID: id,
          T: `Pu:${powerupSprite.texture.key}`, // Shortened type prefix
          A: age, // Add age
          X: Math.round(powerupSprite.x),
          Y: Math.round(powerupSprite.y),
          Vx: parseFloat(powerupSprite.body?.velocity.x.toFixed(1) ?? '0'),
          Vy: parseFloat(powerupSprite.body?.velocity.y.toFixed(1) ?? '0'),
        });
      }
    });

    return objects;
  }

  // No explicit destroy needed for this helper unless it adds listeners itself
}
