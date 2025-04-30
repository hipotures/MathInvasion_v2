import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import debugState from '../../core/utils/DebugState';
import * as Events from '../../core/constants/events';
import DebugManager from '../../core/managers/DebugManager';
import PlayerManager from '../../core/managers/PlayerManager';
import WeaponManager from '../../core/managers/WeaponManager';
import { EnemyManager } from '../../core/managers/EnemyManager';
import EconomyManager from '../../core/managers/EconomyManager';
import HtmlDebugPanel from '../../core/utils/HtmlDebugPanel';
import HtmlDebugLabels from '../../core/utils/HtmlDebugLabels';

/**
 * Handles debug visualization and functionality for the game scene
 */
export class GameSceneDebugHandler {
  private scene: Phaser.Scene;
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private htmlDebugPanel: HtmlDebugPanel;
  private htmlDebugLabels: HtmlDebugLabels;
  
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
    
    // Create debug graphics
    this.debugGraphics = scene.add.graphics();
    
    // Create HTML debug panel and labels
    this.htmlDebugPanel = new HtmlDebugPanel();
    this.htmlDebugLabels = new HtmlDebugLabels();
    
    // Bind methods
    this.handleDebugModeChanged = this.handleDebugModeChanged.bind(this);
    
    // Register event listeners
    eventBus.on(Events.DEBUG_MODE_CHANGED, this.handleDebugModeChanged);
  }
  
  public handleDebugModeChanged(data: { isDebugMode: boolean }): void {
    logger.log(`Debug mode changed to: ${data.isDebugMode}`);
    
    // Toggle HTML debug panel and labels
    this.htmlDebugPanel.setVisible(data.isDebugMode);
    this.htmlDebugLabels.setVisible(data.isDebugMode);
    
    // Toggle debug graphics
    this.debugGraphics.clear();
    
    // Toggle sprite visibility
    this.toggleSpriteVisibility(!data.isDebugMode);
    
    // Update all sprites to show/hide debug info
    if (data.isDebugMode) {
      this.updateDebugVisuals();
    } else {
      // Clear all debug labels when debug mode is disabled
      this.htmlDebugLabels.clearLabels();
    }
  }
  
  private toggleSpriteVisibility(visible: boolean): void {
    // Toggle player sprite visibility
    if (this.playerSprite) {
      this.playerSprite.setVisible(visible);
    }
    
    // Toggle enemy sprites visibility
    this.enemySprites.forEach(sprite => {
      if (sprite) {
        sprite.setVisible(visible);
      }
    });
    
    // Toggle projectile sprites visibility
    this.projectileSprites.forEach(sprite => {
      if (sprite) {
        sprite.setVisible(visible);
      }
    });
    
    // Toggle powerup sprites visibility
    this.powerupSprites.forEach(sprite => {
      if (sprite) {
        sprite.setVisible(visible);
      }
    });
  }
  
  
  public updateDebugVisuals(): void {
    // Clear previous debug graphics
    this.debugGraphics.clear();
    
    // Clear all previous debug labels
    this.htmlDebugLabels.clearLabels();
    
    // Only proceed if debug mode is enabled
    if (!debugState.isDebugMode) return;
    
    // Draw debug rectangles for player
    this.drawDebugRectangle(this.playerSprite, 'player');
    
    // Draw debug rectangles for enemies
    this.enemySprites.forEach((enemyEntity, id) => {
      const assetKey = enemyEntity.texture.key;
      const assetName = assetKey.split('_').pop() || assetKey;
      this.drawDebugRectangle(enemyEntity, assetName);
    });
    
    // Draw debug rectangles for projectiles
    this.projectileSprites.forEach((projectileSprite, id) => {
      const assetKey = projectileSprite.texture.key;
      const assetName = assetKey.split('_').pop() || assetKey;
      this.drawDebugRectangle(projectileSprite, assetName);
    });
    
    // Draw debug rectangles for powerups
    this.powerupSprites.forEach((powerupSprite, id) => {
      const assetKey = powerupSprite.texture.key;
      const assetName = assetKey.split('_').pop() || assetKey;
      this.drawDebugRectangle(powerupSprite, assetName);
    });
    
    // Update HTML debug panel
    this.updateDebugPanel();
  }
  
  private drawDebugRectangle(sprite: Phaser.GameObjects.Sprite, name: string): void {
    if (!sprite || !sprite.active) return;
    
    try {
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      if (!body) {
        // If no physics body, draw around the sprite itself
        this.debugGraphics.lineStyle(1, 0xff0000, 1); // Red for no physics
        this.debugGraphics.strokeRect(
          sprite.x - sprite.displayWidth / 2,
          sprite.y - sprite.displayHeight / 2,
          sprite.displayWidth,
          sprite.displayHeight
        );
        
        // Add HTML label for the object
        this.htmlDebugLabels.updateLabel(
          `${name}_${Math.random()}`, // Use random to ensure unique ID
          name,
          Math.round(sprite.x),
          Math.round(sprite.y - 20),
          '#ff0000'
        );
        return;
      }
      
      // Draw rectangle around physics body
      this.debugGraphics.lineStyle(1, 0x00ff00, 1);
      this.debugGraphics.strokeRect(body.x, body.y, body.width, body.height);
      
      // Add HTML label for the object
      this.htmlDebugLabels.updateLabel(
        `${name}_${Math.random()}`, // Use random to ensure unique ID
        name,
        Math.round(body.x + body.width / 2),
        Math.round(body.y - 20),
        '#00ff00'
      );
    } catch (error) {
      // Silently handle any errors during debug drawing
      logger.warn(`Error drawing debug for ${name}: ${error}`);
    }
  }
  
  private updateDebugPanel(): void {
    if (!debugState.isDebugMode) return;
    
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
      
      // Update the HTML debug panel
      this.htmlDebugPanel.updateData(debugData);
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
    // Remove event listeners
    eventBus.off(Events.DEBUG_MODE_CHANGED, this.handleDebugModeChanged);
    
    // Clear debug labels
    this.htmlDebugLabels.clearLabels();
    
    // Clear debug graphics
    if (this.debugGraphics && this.debugGraphics.scene) {
      this.debugGraphics.clear();
    }
    
    // Destroy HTML debug panel and labels
    this.htmlDebugPanel.destroy();
    this.htmlDebugLabels.destroy();
    
    logger.log('GameSceneDebugHandler destroyed and listeners removed');
  }
}