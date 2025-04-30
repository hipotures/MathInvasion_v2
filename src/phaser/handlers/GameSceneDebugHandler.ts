import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import debugState from '../../core/utils/DebugState';
import * as Events from '../../core/constants/events';
import DebugManager from '../../core/managers/DebugManager';
import PlayerManager from '../../core/managers/PlayerManager';
import WeaponManager from '../../core/managers/WeaponManager';
import { EnemyManager } from '../../core/managers/EnemyManager';
import ProjectileManager from '../../core/managers/ProjectileManager'; // Import ProjectileManager
import { PowerupManager } from '../../core/managers/PowerupManager'; // Import PowerupManager (named)
import EconomyManager from '../../core/managers/EconomyManager';
import HtmlDebugPanel from '../../core/utils/HtmlDebugPanel';
import HtmlDebugLabels from '../../core/utils/HtmlDebugLabels';
import { DebugPanelUpdater } from './debug/DebugPanelUpdater'; // Import the new helper
// Import ProjectileShape type
import { ProjectileShape } from './event/ProjectileEventHandler';
// Import EnemyEntity type
import { EnemyEntity } from '../entities/EnemyEntity';

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
  // Use EnemyEntity which extends Sprite
  private enemySprites: Map<string, EnemyEntity>;
  // Rename and update type for projectiles
  private projectileShapes: Map<string, ProjectileShape>;
  private powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>;
  // Managers are passed to the updater

  constructor(
    scene: Phaser.Scene,
    playerSprite: Phaser.Physics.Arcade.Sprite,
    // Use EnemyEntity which extends Sprite
    enemySprites: Map<string, EnemyEntity>,
    // Rename and update type for projectiles
    projectileShapes: Map<string, ProjectileShape>,
    powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>,
    playerManager: PlayerManager,
    weaponManager: WeaponManager,
    enemyManager: EnemyManager,
    projectileManager: ProjectileManager, // Add projectileManager
    powerupManager: PowerupManager, // Add powerupManager
    economyManager: EconomyManager,
    debugManager: DebugManager
  ) {
    this.scene = scene;
    this.playerSprite = playerSprite;
    this.enemySprites = enemySprites;
    // Assign renamed property
    this.projectileShapes = projectileShapes;
    this.powerupSprites = powerupSprites;

    // Create debug graphics
    this.debugGraphics = scene.add.graphics();

    // Create HTML debug panel and labels
    this.htmlDebugPanel = new HtmlDebugPanel();
    this.htmlDebugLabels = new HtmlDebugLabels();

    // Instantiate the DebugPanelUpdater, passing the correct map
    // NOTE: This line might still cause an error if DebugPanelUpdater hasn't been updated yet
    this.debugPanelUpdater = new DebugPanelUpdater(
      playerManager,
      weaponManager,
      enemyManager,
      projectileManager, // Pass projectileManager
      powerupManager, // Pass powerupManager
      economyManager,
      debugManager,
      this.htmlDebugPanel,
      playerSprite,
      enemySprites,
      // Pass the renamed map
      this.projectileShapes,
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

    // Toggle sprite/shape visibility
    this.toggleObjectVisibility(!data.isDebugMode);

    // Update all sprites to show/hide debug info
    if (data.isDebugMode) {
      this.updateDebugVisuals();
    } else {
      // Clear all debug labels when debug mode is disabled
      this.htmlDebugLabels.clearLabels();
    }
  }

  // Renamed for clarity
  private toggleObjectVisibility(visible: boolean): void {
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

    // Toggle projectile shapes visibility
    this.projectileShapes.forEach((shape) => {
      // Iterate over shapes
      if (shape) {
        shape.setVisible(visible); // Use shape variable
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
    this.enemySprites.forEach((enemyEntity, id) => {
      const assetKey = enemyEntity.texture.key;
      const assetName = assetKey.split('_').pop() || assetKey;
      // Use enemyEntity which is a Sprite
      this.drawDebugRectangle(enemyEntity, `${assetName}_${id.substring(0, 4)}`);
    });

    // Draw debug rectangles for projectiles
    this.projectileShapes.forEach((projectileShape, id) => {
      // Iterate shapes
      // Use a generic name for shapes as they don't have texture keys
      this.drawDebugRectangle(projectileShape, `proj_${id.substring(0, 4)}`); // Pass shape
    });

    // Draw debug rectangles for powerups
    this.powerupSprites.forEach((powerupSprite, id) => {
      const assetKey = powerupSprite.texture.key;
      const assetName = assetKey.split('_').pop() || assetKey;
      this.drawDebugRectangle(powerupSprite, `${assetName}_${id}`);
    });

    // Update HTML debug panel using the helper
    this.debugPanelUpdater.update();
  }

  // Update parameter type to accept Sprites or Shapes
  private drawDebugRectangle(
    obj: Phaser.GameObjects.Sprite | EnemyEntity | ProjectileShape, // Updated type union
    name: string
  ): void {
    if (!obj || !obj.active) return;

    try {
      // Body should exist for both Sprites and Shapes with physics enabled
      const body = obj.body as Phaser.Physics.Arcade.Body;
      if (!body) {
        // Fallback if no physics body (less likely now but good practice)
        this.debugGraphics.lineStyle(1, 0xff0000, 1); // Red for no physics
        let x, y, w, h;
        // Check if it's a Sprite (or EnemyEntity which extends Sprite)
        if (obj instanceof Phaser.GameObjects.Sprite) {
          x = obj.x - obj.displayWidth / 2;
          y = obj.y - obj.displayHeight / 2;
          w = obj.displayWidth;
          h = obj.displayHeight;
        } else {
          // Assume Shape
          // Shapes origin is usually top-left or center depending on type
          // This might need adjustment based on specific shape types if body is missing
          x = obj.x - obj.width / 2; // Assuming center origin for simplicity
          y = obj.y - obj.height / 2;
          w = obj.width;
          h = obj.height;
        }
        this.debugGraphics.strokeRect(x, y, w, h);

        // Add HTML label for the object
        this.htmlDebugLabels.updateLabel(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          `${name}_${(obj as any).name || Math.random()}`, // Use name or random ID
          name,
          Math.round(obj.x),
          Math.round(y - 5), // Position above calculated top edge
          '#ff0000'
        );
        return;
      }

      // Draw rectangle around physics body (works for both)
      this.debugGraphics.lineStyle(1, 0x00ff00, 1);
      this.debugGraphics.strokeRect(body.x, body.y, body.width, body.height);

      // Add HTML label for the object
      this.htmlDebugLabels.updateLabel(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        `${name}_${(obj as any).name || Math.random()}`, // Use name or random ID
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
