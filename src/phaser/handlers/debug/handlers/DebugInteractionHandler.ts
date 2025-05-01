import Phaser from 'phaser';
import logger from '../../../../core/utils/Logger';
import { InteractivityConfig } from '../types/DebugTypes';
import { EnemyEntity } from '../../../entities/EnemyEntity';
import { ProjectileShape } from '../../event/ProjectileEventHandler';

/**
 * Handles debug interaction for game objects
 * Responsible for making objects interactive (for hit testing and cursor)
 */
export class DebugInteractionHandler {
  private scene: Phaser.Scene; // Keep scene reference if needed for other things, otherwise remove
  
  // References to game objects for interactivity
  private playerSprite: Phaser.Physics.Arcade.Sprite;
  private enemySprites: Map<string, EnemyEntity>;
  private projectileShapes: Map<string, ProjectileShape>;
  private powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>;

  // Default configuration for interactivity
  private defaultConfig: InteractivityConfig = {
    useHandCursor: true,
    pixelPerfect: false 
  };

  // Callback for when an object is clicked (passed but not used directly here anymore)
  private onObjectClickCallback: (gameObject: Phaser.GameObjects.GameObject) => void;
  // REMOVED: Callback for scene click 
  // private onSceneClickCallback: (pointer: Phaser.Input.Pointer) => void; 

  constructor(
    scene: Phaser.Scene, // Keep scene reference? Only if needed elsewhere in this class
    playerSprite: Phaser.Physics.Arcade.Sprite,
    enemySprites: Map<string, EnemyEntity>,
    projectileShapes: Map<string, ProjectileShape>,
    powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>,
    onObjectClick: (gameObject: Phaser.GameObjects.GameObject) => void
    // REMOVED: onSceneClick parameter
    // onSceneClick: (pointer: Phaser.Input.Pointer) => void 
  ) {
    this.scene = scene; // Keep scene reference?
    this.playerSprite = playerSprite;
    this.enemySprites = enemySprites;
    this.projectileShapes = projectileShapes;
    this.powerupSprites = powerupSprites;
    this.onObjectClickCallback = onObjectClick; // Keep reference if needed elsewhere
    // REMOVED: Assignment of onSceneClickCallback
    // this.onSceneClickCallback = onSceneClick;

    // REMOVED: Setting up scene input listener here
    // this.scene.input.on('pointerdown', this.onSceneClickCallback); 
  }

  /**
   * Sets up or removes interactivity for all game objects
   * @param interactive Whether the objects should be interactive
   */
  public setObjectInteractivity(interactive: boolean): void {
    logger.debug(`Setting object interactivity: ${interactive ? 'ON' : 'OFF'}`);
    
    const processObject = (obj: Phaser.GameObjects.GameObject | undefined | null) => {
        if (obj && obj.active) {
             if (interactive) {
                this.setupObjectInteractivity(obj);
             } else {
                this.removeObjectInteractivity(obj);
             }
        }
    };

    processObject(this.playerSprite);
    this.enemySprites.forEach(processObject);
    this.projectileShapes.forEach(processObject);
    this.powerupSprites.forEach(processObject);

    logger.debug(`Set interactivity on relevant objects.`);
  }

  /**
   * Sets up interactivity for a single game object, defining the hit area
   * to match visual bounds (body or fallback).
   * @param obj The game object to make interactive
   * @param config Optional configuration for interactivity
   */
  private setupObjectInteractivity(
    obj: Phaser.GameObjects.GameObject,
    config: InteractivityConfig = this.defaultConfig
  ): void {
    // Remove previous listeners/settings first
    obj.off('pointerdown'); 
    obj.off('pointerover'); 
    obj.off('pointerout'); 
    (obj as any).clearTint?.(); 

    // Define hit area based on physics body or visual bounds
    let hitArea: Phaser.Geom.Rectangle | undefined;
    let hitAreaCallback: Function | undefined = Phaser.Geom.Rectangle.Contains;

    const body = (obj as any).body as Phaser.Physics.Arcade.Body | undefined;

    if (body) {
        const objWithPos = obj as any; 
        const offsetX = body.x - objWithPos.x; 
        const offsetY = body.y - objWithPos.y;
        hitArea = new Phaser.Geom.Rectangle(offsetX, offsetY, body.width, body.height);
        logger.debug(`Setting hit area from BODY for ${objWithPos.name || objWithPos.getData('instanceId')}: ${hitArea.width}x${hitArea.height} at (${hitArea.x}, ${hitArea.y}) relative to origin (${objWithPos.x}, ${objWithPos.y})`);

    } else if (obj instanceof Phaser.GameObjects.Sprite || obj instanceof EnemyEntity) {
        const sprite = obj as Phaser.GameObjects.Sprite;
        hitArea = new Phaser.Geom.Rectangle(-sprite.displayWidth / 2, -sprite.displayHeight / 2, sprite.displayWidth, sprite.displayHeight);
         logger.debug(`Setting hit area from SPRITE bounds for ${obj.name || obj.getData('instanceId')}: ${hitArea.width}x${hitArea.height}`);
    } else if (obj instanceof Phaser.GameObjects.Shape) {
        const shape = obj as Phaser.GameObjects.Shape;
        hitArea = new Phaser.Geom.Rectangle(-shape.width * shape.scaleX / 2, -shape.height * shape.scaleY / 2, shape.width * shape.scaleX, shape.height * shape.scaleY);
         logger.debug(`Setting hit area from SHAPE bounds for ${obj.name || obj.getData('instanceId')}: ${hitArea.width}x${hitArea.height}`);
    } else {
        hitArea = undefined;
        hitAreaCallback = undefined;
         logger.warn(`Could not determine specific hit area for object:`, obj);
    }

    // Set interactive using the calculated hit area (or default) and cursor setting
    obj.setInteractive({
        hitArea: hitArea,
        hitAreaCallback: hitAreaCallback,
        useHandCursor: config.useHandCursor ?? this.defaultConfig.useHandCursor ?? true
    });
  }

  /**
   * Removes interactivity from a single game object
   * @param obj The game object to make non-interactive
   */
  private removeObjectInteractivity(obj: Phaser.GameObjects.GameObject): void {
    obj.disableInteractive();
    (obj as any).clearTint?.(); // Clear tint if any remains
  }

  /**
   * Cleans up resources used by this handler
   */
  public destroy(): void {
    // REMOVED: Removing scene click listener here
    // if (this.scene && this.scene.input) {
    //   this.scene.input.off('pointerdown', this.onSceneClickCallback);
    // }
    
    // Remove interactivity from any remaining objects
    this.setObjectInteractivity(false);
  }
}