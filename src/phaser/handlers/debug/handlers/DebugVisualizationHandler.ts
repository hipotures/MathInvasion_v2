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
    this.powerupSprites.forEach((powerupSprite, id) => {
      if (powerupSprite && powerupSprite.active) {
        this.drawDebugRectangle(powerupSprite, `powerup_${id}`, inspectedObject);
        activeLabels.add(`debuglabel_powerup_${id}`);
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
      lineWidth: 1,
    };

    // Generate a predictable label ID and store it on the object
    const labelId = `debuglabel_${baseLabelId}`;
    obj.setData('debugLabelId', labelId); // Store the ID

    // Generate display name (shortened ID for label text)
    let displayName = baseLabelId;
    if (objectType === 'enemy' && objectId) {
      const assetKey = (obj as EnemyEntity).texture.key;
      const assetName = assetKey.split('_').pop() || assetKey;
      displayName = `${assetName}_${objectId.substring(0, 4)}`;
    } else if (objectType === 'projectile' && objectId) {
      displayName = `proj_${objectId.substring(0, 4)}`;
    } else if (objectType === 'powerup' && objectId) {
      const assetKey = (obj as Phaser.Physics.Arcade.Sprite).texture.key;
      const assetName = assetKey.split('_').pop() || assetKey;
      displayName = `${assetName}_${objectId}`;
    } else if (objectType === 'player') {
      displayName = 'player';
    }

    try {
      // Removed hit area visualization (red rectangles)

      // --- Draw Physics Body / Fallback Bounds (Green/Yellow Rectangle) & Label ---
      const body = obj.body as Phaser.Physics.Arcade.Body;
      let labelPosX = 0,
        labelPosY = 0; // Variables to store label position

      if (!body) {
        // Fallback if no physics body
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
        } else {
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
        // Check if body exists, is enabled, and dimensions are valid before drawing
        // Reverted the isPhysicsPaused check as it hid all bounds when paused
        if (body && body.enable && body.width > 0 && body.height > 0) {
            // Draw the actual collision shape (circle or rectangle)
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
        } else {
            // Body exists but dimensions might be invalid (e.g., when paused during spawn)
            // Skip drawing the bounds, but still position the label based on sprite
            // logger.warn(`Skipping debug bounds draw for ${baseLabelId} due to invalid body dimensions.`);
            labelPosX = obj.x;
            // Position label above the sprite using displayHeight
            const spriteHeight = (obj as Phaser.GameObjects.Sprite).displayHeight || 10;
            labelPosY = obj.y - (spriteHeight / 2) - 10;
        }
      }

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
   * Toggles the visibility of game objects
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
    this.powerupSprites.forEach((sprite) => {
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
