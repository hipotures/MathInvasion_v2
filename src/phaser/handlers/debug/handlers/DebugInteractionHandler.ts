import Phaser from 'phaser';
import logger from '../../../../core/utils/Logger';
import { InteractivityConfig } from '../types/DebugTypes';
import { EnemyEntity } from '../../../entities/EnemyEntity';
import { ProjectileShape } from '../../event/ProjectileEventHandler';

/**
 * Handles debug interaction for game objects
 * Responsible for making objects interactive and handling click events
 */
export class DebugInteractionHandler {
  private scene: Phaser.Scene;
  
  // References to game objects for interactivity
  private playerSprite: Phaser.Physics.Arcade.Sprite;
  private enemySprites: Map<string, EnemyEntity>;
  private projectileShapes: Map<string, ProjectileShape>;
  private powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>;

  // Default configuration for interactivity
  private defaultConfig: InteractivityConfig = {
    hitAreaPadding: 20,
    useHandCursor: true,
    pixelPerfect: false
  };

  // Callback for when an object is clicked
  private onObjectClickCallback: (gameObject: Phaser.GameObjects.GameObject) => void;
  private onSceneClickCallback: (pointer: Phaser.Input.Pointer) => void;

  constructor(
    scene: Phaser.Scene,
    playerSprite: Phaser.Physics.Arcade.Sprite,
    enemySprites: Map<string, EnemyEntity>,
    projectileShapes: Map<string, ProjectileShape>,
    powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>,
    onObjectClick: (gameObject: Phaser.GameObjects.GameObject) => void,
    onSceneClick: (pointer: Phaser.Input.Pointer) => void
  ) {
    this.scene = scene;
    this.playerSprite = playerSprite;
    this.enemySprites = enemySprites;
    this.projectileShapes = projectileShapes;
    this.powerupSprites = powerupSprites;
    this.onObjectClickCallback = onObjectClick;
    this.onSceneClickCallback = onSceneClick;

    // Add a click event listener to the scene itself
    this.scene.input.on('pointerdown', this.onSceneClickCallback);
  }

  /**
   * Sets up or removes interactivity for all game objects
   * @param interactive Whether the objects should be interactive
   */
  public setObjectInteractivity(interactive: boolean): void {
    logger.debug(`Setting object interactivity: ${interactive ? 'ON' : 'OFF'}`);
    
    // Player
    if (this.playerSprite) {
      if (interactive) {
        this.setupObjectInteractivity(this.playerSprite);
        logger.debug("Player sprite is now interactive");
      } else {
        this.removeObjectInteractivity(this.playerSprite);
      }
    }

    // Enemies
    this.enemySprites.forEach((sprite) => {
      if (sprite && sprite.active) {
        if (interactive) {
          this.setupObjectInteractivity(sprite);
        } else {
          this.removeObjectInteractivity(sprite);
        }
      }
    });
    logger.debug(`Set interactivity on ${this.enemySprites.size} enemies`);

    // Projectiles
    this.projectileShapes.forEach((shape) => {
      if (shape && shape.active) {
        if (interactive) {
          this.setupObjectInteractivity(shape);
        } else {
          this.removeObjectInteractivity(shape);
        }
      }
    });
    logger.debug(`Set interactivity on ${this.projectileShapes.size} projectiles`);

    // Powerups
    this.powerupSprites.forEach((sprite) => {
      if (sprite && sprite.active) {
        if (interactive) {
          this.setupObjectInteractivity(sprite);
        } else {
          this.removeObjectInteractivity(sprite);
        }
      }
    });
    logger.debug(`Set interactivity on ${this.powerupSprites.size} powerups`);
  }

  /**
   * Sets up interactivity for a single game object
   * @param obj The game object to make interactive
   * @param config Optional configuration for interactivity
   */
  private setupObjectInteractivity(
    obj: Phaser.GameObjects.GameObject,
    config: InteractivityConfig = this.defaultConfig
  ): void {
    // Make sure the object is enabled for input with a larger hit area
    if (obj instanceof Phaser.GameObjects.Sprite) {
      // For sprites, use a rectangle with padding
      const width = (obj as Phaser.GameObjects.Sprite).width * (obj as Phaser.GameObjects.Sprite).scaleX;
      const height = (obj as Phaser.GameObjects.Sprite).height * (obj as Phaser.GameObjects.Sprite).scaleY;
      const padding = config.hitAreaPadding ?? this.defaultConfig.hitAreaPadding ?? 20;
      
      obj.setInteractive(
        new Phaser.Geom.Rectangle(
          -width/2 - padding, 
          -height/2 - padding,
          width + padding*2, 
          height + padding*2
        ),
        Phaser.Geom.Rectangle.Contains
      );
      
      logger.debug(`Set interactive on sprite with padding:`, obj);
    } else if (obj instanceof Phaser.GameObjects.Shape) {
      // For shapes, use a rectangle with padding
      const shape = obj as Phaser.GameObjects.Shape;
      const width = shape.width * shape.scaleX;
      const height = shape.height * shape.scaleY;
      const padding = config.hitAreaPadding ?? this.defaultConfig.hitAreaPadding ?? 20;
      
      obj.setInteractive(
        new Phaser.Geom.Rectangle(
          -width/2 - padding, 
          -height/2 - padding,
          width + padding*2, 
          height + padding*2
        ),
        Phaser.Geom.Rectangle.Contains
      );
      
      logger.debug(`Set interactive on shape with padding:`, obj);
    } else {
      // For other objects, use default interactivity
      obj.setInteractive({ 
        useHandCursor: config.useHandCursor ?? this.defaultConfig.useHandCursor, 
        pixelPerfect: config.pixelPerfect ?? this.defaultConfig.pixelPerfect 
      });
      logger.debug(`Set interactive on object:`, obj);
    }
    
    // Remove any existing listeners to avoid duplicates
    obj.off('pointerdown');
    
    // Add the click listener
    obj.on('pointerdown', () => {
      logger.debug("Object clicked directly:", obj);
      this.onObjectClickCallback(obj);
    });
  }

  /**
   * Removes interactivity from a single game object
   * @param obj The game object to make non-interactive
   */
  private removeObjectInteractivity(obj: Phaser.GameObjects.GameObject): void {
    obj.off('pointerdown');
    obj.disableInteractive();
  }

  /**
   * Cleans up resources used by this handler
   */
  public destroy(): void {
    // Remove scene click listener
    if (this.scene && this.scene.input) {
      this.scene.input.off('pointerdown', this.onSceneClickCallback);
    }
    
    // Remove interactivity from any remaining objects
    this.setObjectInteractivity(false);
  }
}