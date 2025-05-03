import Phaser from 'phaser';
import logger from '../../../../core/utils/Logger';
import HtmlDebugLabels from '../../../../core/utils/HtmlDebugLabels';
import {
  DebugDrawableObject,
  DebugVisualizationConfig,
  InspectionState,
} from '../types/DebugTypes';
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
  private powerupSprites: Map<string, Phaser.Physics.Arcade.Sprite>; // Changed key type

  constructor(
    scene: Phaser.Scene,
    playerSprite: Phaser.Physics.Arcade.Sprite,
    enemySprites: Map<string, EnemyEntity>,
    projectileShapes: Map<string, ProjectileShape>,
    powerupSprites: Map<string, Phaser.Physics.Arcade.Sprite>, // Changed key to string
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

    // Don't clear labels every frame - we'll update them individually
    // this.htmlDebugLabels.clearLabels();

    // Track active labels to remove stale ones later
    const activeLabels = new Set<string>();

    // Draw debug rectangles for player
    if (this.playerSprite && this.playerSprite.active) {
      this.drawDebugRectangle(this.playerSprite, 'player', inspectedObject);
      activeLabels.add('debuglabel_player');
    }

    // Draw debug rectangles for enemies
    this.enemySprites.forEach((enemyEntity, id) => {
      if (enemyEntity && enemyEntity.active) {
        this.drawDebugRectangle(enemyEntity, `enemy_${id}`, inspectedObject);
        activeLabels.add(`debuglabel_enemy_${id}`);
      }
    });

    // Draw debug rectangles for projectiles
    this.projectileShapes.forEach((projectileShape, id) => {
      if (projectileShape && projectileShape.active) {
        this.drawDebugRectangle(projectileShape, `proj_${id}`, inspectedObject);
        activeLabels.add(`debuglabel_proj_${id}`);
      }
    });

    // Draw debug rectangles for powerups
    this.powerupSprites.forEach((powerupSprite, id) => { // 'id' is now string 'powerup_X'
      if (powerupSprite && powerupSprite.active) {
        // Pass the string ID directly as baseLabelId
        this.drawDebugRectangle(powerupSprite, id, inspectedObject);
        // labelId should also use the string ID directly
        activeLabels.add(`debuglabel_${id}`);
      }
    });

    // Clean up stale labels
    const existingLabelIds = this.htmlDebugLabels.getAllLabelIds();
    existingLabelIds.forEach((labelId) => {
      if (!activeLabels.has(labelId)) {
        this.htmlDebugLabels.removeLabel(labelId);
      }
    });
  }

  /**
   * Draws a debug rectangle around a game object and updates its label
   * @param obj The game object to draw a debug rectangle around
   * @param baseLabelId Base ID for the label (e.g., 'player', 'enemy_abc')
   * @param inspectedObject The currently inspected object, if any
   */
  private drawDebugRectangle(
    obj: DebugDrawableObject,
    baseLabelId: string, // Use a base ID passed from the caller
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
    } else if (
      obj.getData('objectType') === 'projectile' &&
      obj.getData('instanceId') !== undefined
    ) {
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
      lineWidth: isInspected ? 2 : 1, // Thicker line for inspected objects
    };

    // Generate a predictable label ID and store it on the object
    const labelId = `debuglabel_${baseLabelId}`;
    obj.setData('debugLabelId', labelId); // Store the ID

    // Generate display name (shortened ID for label text)
    // Use only the objectId for the display name
    let displayName = objectId || baseLabelId; // Use objectId if available, otherwise fallback to baseLabelId

    try {
      // --- Draw Physics Body / Fallback Bounds (Green/Yellow Rectangle) & Label ---
      const body = obj.body as Phaser.Physics.Arcade.Body;
      
      let labelPosX = 0,
        labelPosY = 0; // Variables to store label position

      // Fallback drawing logic moved below the main body drawing logic

      // Check if body exists, is enabled, and dimensions are valid before drawing
      // Reverted the isPhysicsPaused check as it hid all bounds when paused
      if (body && body.enable && body.width > 0 && body.height > 0) {
          // Draw the actual collision shape (circle or rectangle) using configured color/width
          this.debugGraphics.lineStyle(config.lineWidth ?? 1, config.strokeColor, 1);
          if (body.isCircle) {
              // Draw circle for circular bodies
              this.debugGraphics.strokeCircle(body.center.x, body.center.y, body.radius);
          } else {
              // Draw rectangle for rectangular bodies
              this.debugGraphics.strokeRect(body.x, body.y, body.width, body.height);
          }
          labelPosX = body.center.x;
          labelPosY = body.y - 10; // Position label above the body
      } else if (!body) { // Moved fallback logic here for when there's no physics body at all
        // Fallback if no physics body - draw based on sprite bounds
        this.debugGraphics.lineStyle(config.lineWidth ?? 1, config.strokeColor, 1);
        let fallbackX, fallbackY, fallbackW, fallbackH;
        if (obj instanceof Phaser.GameObjects.Sprite || obj instanceof EnemyEntity) {
          const sprite = obj as Phaser.GameObjects.Sprite;
          fallbackW = sprite.displayWidth;
          fallbackH = sprite.displayHeight;
          fallbackX = sprite.x - fallbackW / 2;
          fallbackY = sprite.y - fallbackH / 2;
          labelPosX = sprite.x;
          labelPosY = fallbackY - 5;
        } else { // Assuming Shape if not Sprite/EnemyEntity
          const shape = obj as Phaser.GameObjects.Shape;
          fallbackW = shape.width * shape.scaleX;
          fallbackH = shape.height * shape.scaleY;
          fallbackX = shape.x - fallbackW / 2;
          fallbackY = shape.y - fallbackH / 2;
          labelPosX = shape.x;
          labelPosY = fallbackY - 5;
        }
        this.debugGraphics.strokeRect(fallbackX, fallbackY, fallbackW, fallbackH);
      } else {
          // Body exists but dimensions might be invalid (e.g., 0x0 during spawn/pause)
          // Draw fallback bounds based on sprite/shape instead of skipping
          logger.warn(`Drawing fallback debug bounds for ${baseLabelId} due to invalid body dimensions.`);
          this.debugGraphics.lineStyle(config.lineWidth ?? 1, config.strokeColor, 1);
          let fallbackX, fallbackY, fallbackW, fallbackH;
          if (obj instanceof Phaser.GameObjects.Sprite || obj instanceof EnemyEntity) {
            const sprite = obj as Phaser.GameObjects.Sprite;
            fallbackW = sprite.displayWidth;
            fallbackH = sprite.displayHeight;
            fallbackX = sprite.x - fallbackW / 2;
            fallbackY = sprite.y - fallbackH / 2;
            labelPosX = sprite.x;
            labelPosY = fallbackY - 5;
          } else { // Assuming Shape if not Sprite/EnemyEntity
            const shape = obj as Phaser.GameObjects.Shape;
            fallbackW = shape.width * shape.scaleX;
            fallbackH = shape.height * shape.scaleY;
            fallbackX = shape.x - fallbackW / 2;
            fallbackY = shape.y - fallbackH / 2;
            labelPosX = shape.x;
            labelPosY = fallbackY - 5;
          }
          // Ensure dimensions are valid before drawing fallback
          if (fallbackW > 0 && fallbackH > 0) {
              this.debugGraphics.strokeRect(fallbackX, fallbackY, fallbackW, fallbackH);
          } else {
              // If even fallback dimensions are invalid, just set label position
              labelPosX = obj.x;
              labelPosY = obj.y - 10; // Default position above object center
          }
      } // <-- Closing brace for the else block

      // The drawing logic is now handled above based on body presence and validity.
      // This section is no longer needed as it's incorporated into the if/else if/else block above.

      // Add/Update HTML label for the object using the predictable labelId
      // Make the label text more descriptive for debugging
      const labelText = isInspected ? `⭐ ${displayName} ⭐` : displayName;

      this.htmlDebugLabels.updateLabel(
        labelId, // Use the stored predictable ID
        labelText, // Use the generated display name with highlight if inspected
        Math.round(labelPosX),
        Math.round(labelPosY),
        config.labelColor,
        obj // Pass the GameObject itself
      );
    } catch (error) {
      logger.warn(`Error drawing debug for ${baseLabelId}: ${error}`);
    }
  }

  /**
   * Sets the visibility of the debug graphics and labels.
   * @param visible True to show, false to hide.
   */
  public setVisible(visible: boolean): void {
    this.debugGraphics.setVisible(visible);
    this.htmlDebugLabels.setVisible(visible); // Use the existing setVisible method

    if (!visible) {
      this.debugGraphics.clear();
      // Optionally clear labels immediately when hiding
      // this.htmlDebugLabels.clearLabels();
    }
  }

  /**
   * Toggles the visibility of game objects (sprites/shapes themselves).
   */
  public toggleObjectVisibility(visible: boolean): void {
    if (this.playerSprite) {
      this.playerSprite.setVisible(visible);
    }
    this.enemySprites.forEach((sprite) => {
      if (sprite) sprite.setVisible(visible);
    });
    this.projectileShapes.forEach((shape) => {
      if (shape) shape.setVisible(visible);
    });
    this.powerupSprites.forEach((sprite) => { // Iterates correctly over Map<string, Sprite>
      if (sprite) sprite.setVisible(visible);
    });
  }

  /**
   * Clears up resources used by this handler
   */
  public destroy(): void {
    if (this.htmlDebugLabels) {
      this.htmlDebugLabels.clearLabels();
    }
    if (this.debugGraphics && this.debugGraphics.scene) {
      this.debugGraphics.clear();
    }
  }
}
