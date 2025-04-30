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
import { DebugPanelUpdater } from './debug/DebugPanelUpdater'; // Import the new helper

/**
 * Handles debug visualization and functionality for the game scene
 */
export class GameSceneDebugHandler {
  private scene: Phaser.Scene;
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private htmlDebugPanel: HtmlDebugPanel;
  private htmlDebugLabels: HtmlDebugLabels;
  private debugPanelUpdater: DebugPanelUpdater; // Add the updater instance

  // References to game objects (still needed for drawing/labels)
  private playerSprite: Phaser.Physics.Arcade.Sprite;
  private enemySprites: Map<string, Phaser.GameObjects.Sprite>;
  private projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite>;
  private powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>;
  // Managers are passed to the updater

  constructor(
    scene: Phaser.Scene,
    playerSprite: Phaser.Physics.Arcade.Sprite,
    enemySprites: Map<string, Phaser.GameObjects.Sprite>, // Corrected type
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

    // Create debug graphics
    this.debugGraphics = scene.add.graphics();

    // Create HTML debug panel and labels
    this.htmlDebugPanel = new HtmlDebugPanel();
    this.htmlDebugLabels = new HtmlDebugLabels();

    // Instantiate the DebugPanelUpdater
    this.debugPanelUpdater = new DebugPanelUpdater(
      playerManager,
      weaponManager,
      enemyManager,
      economyManager,
      debugManager,
      this.htmlDebugPanel,
      playerSprite,
      enemySprites,
      projectileSprites,
      powerupSprites
    );

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
    this.enemySprites.forEach((sprite) => {
      if (sprite) {
        sprite.setVisible(visible);
      }
    });

    // Toggle projectile sprites visibility
    this.projectileSprites.forEach((sprite) => {
      if (sprite) {
        sprite.setVisible(visible);
      }
    });

    // Toggle powerup sprites visibility
    this.powerupSprites.forEach((sprite) => {
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
    this.enemySprites.forEach((enemyEntity, _id) => {
      // Prefix unused id
      const assetKey = enemyEntity.texture.key;
      const assetName = assetKey.split('_').pop() || assetKey;
      this.drawDebugRectangle(enemyEntity, assetName);
    });

    // Draw debug rectangles for projectiles
    this.projectileSprites.forEach((projectileSprite, _id) => {
      // Prefix unused id
      const assetKey = projectileSprite.texture.key;
      const assetName = assetKey.split('_').pop() || assetKey;
      this.drawDebugRectangle(projectileSprite, assetName);
    });

    // Draw debug rectangles for powerups
    this.powerupSprites.forEach((powerupSprite, _id) => {
      // Prefix unused id
      const assetKey = powerupSprite.texture.key;
      const assetName = assetKey.split('_').pop() || assetKey;
      this.drawDebugRectangle(powerupSprite, assetName);
    });

    // Update HTML debug panel using the helper
    this.debugPanelUpdater.update();
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
          `${name}_${sprite.name || Math.random()}`, // Use sprite name or random for unique ID
          name,
          Math.round(sprite.x),
          Math.round(sprite.y - sprite.displayHeight / 2 - 5), // Position above sprite
          '#ff0000'
        );
        return;
      }

      // Draw rectangle around physics body
      this.debugGraphics.lineStyle(1, 0x00ff00, 1);
      this.debugGraphics.strokeRect(body.x, body.y, body.width, body.height);

      // Add HTML label for the object
      this.htmlDebugLabels.updateLabel(
        `${name}_${sprite.name || Math.random()}`, // Use sprite name or random for unique ID
        name,
        Math.round(body.center.x),
        Math.round(body.y - 10), // Position above body
        '#00ff00'
      );
    } catch (error) {
      // Silently handle any errors during debug drawing
      logger.warn(`Error drawing debug for ${name}: ${error}`);
    }
  }

  // Removed updateDebugPanel and its helper methods (getPlayerHealth, etc.)
  // as this logic is now in DebugPanelUpdater

  public destroy(): void {
    // Remove event listeners
    eventBus.off(Events.DEBUG_MODE_CHANGED, this.handleDebugModeChanged);

    // Clear debug labels
    this.htmlDebugLabels.clearLabels();

    // Clear debug graphics
    if (this.debugGraphics && this.debugGraphics.scene) {
      this.debugGraphics.clear();
      // Optionally destroy graphics object if scene is being destroyed
      // this.debugGraphics.destroy();
    }

    // Destroy HTML debug panel and labels
    this.htmlDebugPanel.destroy();
    this.htmlDebugLabels.destroy();

    // No need to explicitly destroy debugPanelUpdater unless it holds resources

    logger.log('GameSceneDebugHandler destroyed and listeners removed');
  }
}
