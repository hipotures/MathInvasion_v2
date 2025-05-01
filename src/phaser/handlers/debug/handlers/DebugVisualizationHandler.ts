import Phaser from 'phaser';
import logger from '../../../../core/utils/Logger';
import HtmlDebugLabels from '../../../../core/utils/HtmlDebugLabels';
import { DebugDrawableObject, DebugVisualizationConfig, InspectionState } from '../types/DebugTypes';
import { EnemyEntity } from '../../../entities/EnemyEntity';
import { ProjectileShape } from '../../event/ProjectileEventHandler';

/**
 * Handles debug visualization for game objects
 * Responsible for drawing debug rectangles and shapes, and managing HTML debug labels
 */
export class DebugVisualizationHandler {
  private scene: Phaser.Scene;
  private debugGraphics: Phaser.GameObjects.Graphics;
  private htmlDebugLabels: HtmlDebugLabels;
  
  // References to game objects for drawing
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
    htmlDebugLabels: HtmlDebugLabels
  ) {
    this.scene = scene;
    this.playerSprite = playerSprite;
    this.enemySprites = enemySprites;
    this.projectileShapes = projectileShapes;
    this.powerupSprites = powerupSprites;
    this.htmlDebugLabels = htmlDebugLabels;

    // Create debug graphics
    this.debugGraphics = scene.add.graphics();
  }

  /**
   * Updates all debug visuals
   * @param inspectedObject The currently inspected object, if any
   */
  public updateDebugVisuals(inspectedObject: InspectionState | null): void {
    // Clear previous debug graphics
    this.debugGraphics.clear();

    // Clear all previous debug labels
    this.htmlDebugLabels.clearLabels();

    // Draw debug rectangles for player
    this.drawDebugRectangle(this.playerSprite, 'player', inspectedObject);

    // Draw debug rectangles for enemies
    this.enemySprites.forEach((enemyEntity, id) => {
      const assetKey = enemyEntity.texture.key;
      const assetName = assetKey.split('_').pop() || assetKey;
      this.drawDebugRectangle(enemyEntity, `${assetName}_${id.substring(0, 4)}`, inspectedObject);
    });

    // Draw debug rectangles for projectiles
    this.projectileShapes.forEach((projectileShape, id) => {
      this.drawDebugRectangle(projectileShape, `proj_${id.substring(0, 4)}`, inspectedObject);
    });

    // Draw debug rectangles for powerups
    this.powerupSprites.forEach((powerupSprite, id) => {
      const assetKey = powerupSprite.texture.key;
      const assetName = assetKey.split('_').pop() || assetKey;
      this.drawDebugRectangle(powerupSprite, `${assetName}_${id}`, inspectedObject);
    });
  }

  /**
   * Draws a debug rectangle around a game object
   * @param obj The game object to draw a debug rectangle around
   * @param name The name to display in the debug label
   * @param inspectedObject The currently inspected object, if any
   */
  private drawDebugRectangle(
    obj: DebugDrawableObject,
    name: string,
    inspectedObject: InspectionState | null
  ): void {
    if (!obj || !obj.active) return;

    // Determine if this object is being inspected
    let objectId: string | null = null;
    let objectType: string | null = null;

    if (obj === this.playerSprite) {
      objectId = 'player';
      objectType = 'player';
    } else if (obj instanceof EnemyEntity) {
      objectId = obj.instanceId;
      objectType = 'enemy';
    } else if (obj.getData('objectType') === 'projectile' && obj.getData('instanceId') !== undefined) {
      objectId = obj.getData('instanceId');
      objectType = 'projectile';
    } else if (obj.getData('objectType') === 'powerup' && obj.getData('instanceId') !== undefined) {
      objectId = String(obj.getData('instanceId'));
      objectType = 'powerup';
    }

    // Determine highlight color
    const isInspected = inspectedObject?.id === objectId && inspectedObject?.type === objectType;
    const config: DebugVisualizationConfig = {
      strokeColor: isInspected ? 0xffff00 : 0x00ff00, // Yellow if inspected, green otherwise
      labelColor: isInspected ? '#ffff00' : '#00ff00', // Yellow if inspected, green otherwise
      lineWidth: 1
    };

    try {
      // Body should exist for both Sprites and Shapes with physics enabled
      const body = obj.body as Phaser.Physics.Arcade.Body;
      if (!body) {
        // Fallback if no physics body (less likely now but good practice)
        this.debugGraphics.lineStyle(1, isInspected ? 0xffff00 : 0xff0000, 1); // Yellow if inspected, red otherwise
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
          isInspected ? '#ffff00' : '#ff0000' // Yellow if inspected, red otherwise
        );
        return;
      }

      // Draw rectangle around physics body (works for both)
      this.debugGraphics.lineStyle(config.lineWidth ?? 1, config.strokeColor, 1);
      this.debugGraphics.strokeRect(body.x, body.y, body.width, body.height);

      // Add HTML label for the object
      this.htmlDebugLabels.updateLabel(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        `${name}_${(obj as any).name || Math.random()}`, // Use name or random ID
        name,
        Math.round(body.center.x),
        Math.round(body.y - 10), // Position above body
        config.labelColor
      );
    } catch (error) {
      // Silently handle any errors during debug drawing
      logger.warn(`Error drawing debug for ${name}: ${error}`);
    }
  }

  /**
   * Toggles the visibility of game objects
   * @param visible Whether the objects should be visible
   */
  public toggleObjectVisibility(visible: boolean): void {
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
      if (shape) {
        shape.setVisible(visible);
      }
    });

    // Toggle powerup sprites visibility
    this.powerupSprites.forEach((sprite) => {
      if (sprite) {
        sprite.setVisible(visible);
      }
    });
  }

  /**
   * Cleans up resources used by this handler
   */
  public destroy(): void {
    // Clear debug labels
    this.htmlDebugLabels.clearLabels();

    // Clear debug graphics
    if (this.debugGraphics && this.debugGraphics.scene) {
      this.debugGraphics.clear();
      // Optionally destroy graphics object if scene is being destroyed
      // this.debugGraphics.destroy();
    }
  }
}