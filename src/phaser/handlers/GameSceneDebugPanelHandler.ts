import Phaser from 'phaser';
import logger from '../../core/utils/Logger';
import debugState from '../../core/utils/DebugState';
import FontLoader from '../../core/utils/FontLoader';
import DebugManager from '../../core/managers/DebugManager';
import PlayerManager from '../../core/managers/PlayerManager';
import WeaponManager from '../../core/managers/WeaponManager';
import { EnemyManager } from '../../core/managers/EnemyManager';
import EconomyManager from '../../core/managers/EconomyManager';

/**
 * Helper class to handle the debug panel
 */
export class GameSceneDebugPanelHandler {
  private scene: Phaser.Scene;
  private debugPanel!: Phaser.GameObjects.Container;
  
  // References to game objects and managers
  private playerSprite: Phaser.Physics.Arcade.Sprite;
  private enemySprites: Map<string, Phaser.GameObjects.Sprite>;
  private projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite>;
  private powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>;
  private playerManager: PlayerManager;
  private weaponManager: WeaponManager;
  private enemyManager: EnemyManager;
  private economyManager: EconomyManager;
  private debugManager: DebugManager;

  constructor(
    scene: Phaser.Scene,
    playerSprite: Phaser.Physics.Arcade.Sprite,
    enemySprites: Map<string, any>,
    projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite>,
    powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>,
    playerManager: PlayerManager,
    weaponManager: WeaponManager,
    enemyManager: EnemyManager,
    economyManager: EconomyManager,
    debugManager: DebugManager
  ) {
    this.scene = scene;
    this.playerSprite = playerSprite;
    this.enemySprites = enemySprites;
    this.projectileSprites = projectileSprites;
    this.powerupSprites = powerupSprites;
    this.playerManager = playerManager;
    this.weaponManager = weaponManager;
    this.enemyManager = enemyManager;
    this.economyManager = economyManager;
    this.debugManager = debugManager;
    
    // Create debug panel
    this.setupDebugPanel();
  }
  
  private setupDebugPanel(): void {
    // Create a container for the debug panel (initially hidden)
    this.debugPanel = this.scene.add.container(this.scene.cameras.main.width - 250, 10);
    this.debugPanel.setVisible(false);
    
    // Add background for the debug panel
    const panelBg = this.scene.add.rectangle(0, 0, 240, 400, 0x000000, 0.85);
    panelBg.setOrigin(0, 0);
    panelBg.setStrokeStyle(1, 0x00ff00); // Add green border
    this.debugPanel.add(panelBg);
    
    // Add title
    const titleText = this.scene.add.text(120, 10, 'DEBUG PANEL', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#00ff00',
      fontStyle: 'bold'
    });
    titleText.setOrigin(0.5, 0);
    this.debugPanel.add(titleText);

    // Set a high depth to render above other game elements
    this.debugPanel.setDepth(1000);
  }

  public setVisible(visible: boolean): void {
    this.debugPanel.setVisible(visible);
  }
  
  public updateDebugPanel(): void {
    if (!debugState.isDebugMode || !this.debugPanel) return;
    
    try {
      // Collect data from all managers
      const debugData: Record<string, any> = {
        Player: {
          health: this.getPlayerHealth(),
          isInvulnerable: this.getPlayerInvulnerable(),
          position: {
            x: this.playerSprite ? this.playerSprite.x.toFixed(0) : 'N/A',
            y: this.playerSprite ? this.playerSprite.y.toFixed(0) : 'N/A'
          }
        },
        Weapon: {
          currentWeapon: this.getCurrentWeaponId(),
          level: this.getCurrentWeaponLevel(),
          cooldown: this.getCurrentCooldown().toFixed(0)
        },
        Game: {
          enemyCount: this.enemySprites.size,
          projectileCount: this.projectileSprites.size,
          powerupCount: this.powerupSprites.size,
          currentWave: this.getCurrentWave(),
          score: this.getCurrentScore(),
          currency: this.getCurrentCurrency()
        }
      };
      
      // Update the debug manager with this data
      this.debugManager.updateDebugData('GameScene', debugData);
      
      // Clear existing debug texts in the panel
      this.debugPanel.getAll().forEach((child, index) => {
        if (index > 1) { // Skip background and title
          this.debugPanel?.remove(child, true);
        }
      });
      
      // Add new debug texts
      let yPos = 30;
      Object.entries(debugData).forEach(([category, data]) => {
        // Add category header
        const headerText = this.scene.add.text(10, yPos, category, {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#ffff00',
          fontStyle: 'bold'
        });
        this.debugPanel?.add(headerText);
        yPos += 10;
        
        // Add data entries
        Object.entries(data).forEach(([key, value]) => {
          let displayValue = value;
          if (typeof value === 'object') {
            try {
              displayValue = JSON.stringify(value);
            } catch (e) {
              displayValue = '[Object]';
            }
          }
          
          const dataText = this.scene.add.text(20, yPos, `${key}: ${displayValue}`, {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#ffffff'
          });
          this.debugPanel?.add(dataText);
          yPos += 14;
        });
        
        yPos += 10; // Add space between categories
      });
    } catch (error) {
      logger.warn(`Error updating debug panel: ${error}`);
    }
  }
  
  // Helper methods for debug panel
  private getPlayerHealth(): number {
    return (this.playerManager as any).health || 0;
  }
  
  private getPlayerInvulnerable(): boolean {
    return (this.playerManager as any).isInvulnerable || false;
  }
  
  private getCurrentWeaponId(): string {
    return (this.weaponManager as any).currentWeaponId || 'unknown';
  }
  
  private getCurrentWeaponLevel(): number {
    return (this.weaponManager as any).currentWeaponLevel || 1;
  }
  
  private getCurrentCooldown(): number {
    return (this.weaponManager as any).cooldownTimer || 0;
  }
  
  private getCurrentWave(): number {
    return this.enemyManager.getCurrentWave();
  }
  
  private getCurrentScore(): number {
    return this.economyManager.getCurrentScore();
  }
  
  private getCurrentCurrency(): number {
    return this.economyManager.getCurrentCurrency();
  }
  
  public destroy(): void {
    // Destroy debug panel
    if (this.debugPanel && this.debugPanel.scene) {
      this.debugPanel.destroy();
    }
  }
}