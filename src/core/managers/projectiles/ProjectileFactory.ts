import logger from '../../utils/Logger';
import { EventBus as EventBusType } from '../../events/EventBus';
import * as Events from '../../constants/events';
import {
  SpawnProjectileData,
  ProjectileCreatedEventData,
  ProjectileLike,
  ProjectileVisualProperties,
  DEFAULT_VISUAL_PROPERTIES
} from './types/ProjectileTypes';

/**
 * Factory class for creating projectiles
 */
export class ProjectileFactory {
  private nextProjectileId: number = 0;
  private eventBus: EventBusType;

  constructor(eventBusInstance: EventBusType) {
    this.eventBus = eventBusInstance;
  }

  /**
   * Creates a new projectile
   * @param data The data for spawning the projectile
   * @returns The created projectile
   */
  public createProjectile(data: SpawnProjectileData): ProjectileLike {
    const newId = `proj_${this.nextProjectileId++}`;
    logger.debug(`ProjectileFactory: Creating projectile: ${data.type} (ID: ${newId}) at (${data.x}, ${data.y})`);
    logger.debug(`ProjectileFactory: Projectile owner: ${data.owner}, velocity: (${data.velocityX}, ${data.velocityY})`);

    try {
      logger.debug(`ProjectileFactory: Determining visual properties for projectile ${newId}`);
      const visualProperties = this.determineVisualProperties(data);
      logger.debug(`ProjectileFactory: Visual properties determined - shape: ${visualProperties.shape}, dimensions: ${visualProperties.width}x${visualProperties.height}, color: ${visualProperties.color}`);

      const newProjectile: ProjectileLike = {
        id: newId,
        type: data.type,
        x: data.x,
        y: data.y,
        velocityX: data.velocityX,
        velocityY: data.velocityY,
        damage: data.damage,
        owner: data.owner,
        radius: data.radius,
        timeToExplodeMs: data.timeToExplodeMs,
        creationTime: Date.now(),
        update: (dt: number) => {
          newProjectile.x += newProjectile.velocityX * (dt / 1000);
          newProjectile.y += newProjectile.velocityY * (dt / 1000);
        },
      };
      
      logger.debug(`ProjectileFactory: Created projectile object with ID ${newId}`);

      // Add velocity validation
      const MIN_VELOCITY_THRESHOLD = 1; // Pixels per second
      if (Math.abs(newProjectile.velocityX) < MIN_VELOCITY_THRESHOLD && Math.abs(newProjectile.velocityY) < MIN_VELOCITY_THRESHOLD) {
        logger.warn(`ProjectileFactory: Projectile ${newId} created with near-zero velocity: vX=${newProjectile.velocityX.toFixed(2)}, vY=${newProjectile.velocityY.toFixed(2)}`);
        // Consider adding a default minimum velocity or destroying it immediately if this is invalid
        // For now, just logging.
      }

      logger.debug(`ProjectileFactory: Emitting PROJECTILE_CREATED event for projectile ${newId}`);
      this.emitProjectileCreatedEvent(newProjectile, visualProperties);
      logger.debug(`ProjectileFactory: PROJECTILE_CREATED event emitted successfully`);

      return newProjectile;
    } catch (error) {
      logger.error(`ProjectileFactory: Error creating projectile: ${error}`);
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Determines the visual properties for a projectile
   * @param data The spawn data
   * @returns The visual properties
   */
  private determineVisualProperties(data: SpawnProjectileData): ProjectileVisualProperties {
    logger.debug(`ProjectileFactory: Determining visual properties for projectile type: ${data.type}, owner: ${data.owner}`);
    
    let visualShape: 'rectangle' | 'ellipse' = DEFAULT_VISUAL_PROPERTIES.shape;
    let visualWidth: number = DEFAULT_VISUAL_PROPERTIES.width;
    let visualHeight: number = DEFAULT_VISUAL_PROPERTIES.height;
    let visualColor: string = DEFAULT_VISUAL_PROPERTIES.color;

    logger.debug(`ProjectileFactory: Default visual properties - shape: ${visualShape}, dimensions: ${visualWidth}x${visualHeight}, color: ${visualColor}`);

    if (data.owner === 'player' && data.weaponConfig) {
      logger.debug(`ProjectileFactory: Using player weapon config for visual properties`);
      logger.debug(`ProjectileFactory: Weapon config - id: ${data.weaponConfig.id}, projectileType: ${data.weaponConfig.projectileType}`);
      
      visualShape = data.weaponConfig.visualShape ?? visualShape;
      visualWidth = data.weaponConfig.visualWidth ?? visualWidth;
      visualHeight = data.weaponConfig.visualHeight ?? visualHeight;
      visualColor = data.weaponConfig.visualColor ?? visualColor;
      
      logger.debug(`ProjectileFactory: Player projectile visual properties from config - shape: ${visualShape}, dimensions: ${visualWidth}x${visualHeight}, color: ${visualColor}`);
    } else if (data.owner === 'enemy' && data.enemyShootConfig) {
      logger.debug(`ProjectileFactory: Using enemy shoot config for visual properties`);
      
      visualShape = data.enemyShootConfig.visualShape ?? visualShape;
      visualWidth = data.enemyShootConfig.visualWidth ?? visualWidth;
      visualHeight = data.enemyShootConfig.visualHeight ?? visualHeight;
      visualColor = data.enemyShootConfig.visualColor ?? visualColor;
      
      logger.debug(`ProjectileFactory: Enemy projectile visual properties from config - shape: ${visualShape}, dimensions: ${visualWidth}x${visualHeight}, color: ${visualColor}`);
    } else if (data.owner === 'enemy' && !data.enemyShootConfig) {
      // Handle cases like death_bomb where owner is 'enemy' but there's no shootConfig
      logger.warn(
        `ProjectileFactory: Enemy projectile type ${data.type} spawned without enemyShootConfig. Using default visuals.`
      );
      // Keep default values assigned at the start of the function
      visualShape = DEFAULT_VISUAL_PROPERTIES.shape;
      visualWidth = DEFAULT_VISUAL_PROPERTIES.width;
      visualHeight = DEFAULT_VISUAL_PROPERTIES.height;
      visualColor = DEFAULT_VISUAL_PROPERTIES.color;
    } else if (data.owner === 'player' && !data.weaponConfig) {
       // This case should ideally not happen due to checks in ProjectileManager, but handle defensively
       logger.error(
        `ProjectileFactory: Player projectile type ${data.type} spawned without weaponConfig. Using default visuals.`
      );
       visualShape = DEFAULT_VISUAL_PROPERTIES.shape;
       visualWidth = DEFAULT_VISUAL_PROPERTIES.width;
       visualHeight = DEFAULT_VISUAL_PROPERTIES.height;
       visualColor = DEFAULT_VISUAL_PROPERTIES.color;
    }


    logger.debug(`ProjectileFactory: Final visual properties - shape: ${visualShape}, dimensions: ${visualWidth}x${visualHeight}, color: ${visualColor}`);

    return {
      shape: visualShape,
      width: visualWidth,
      height: visualHeight,
      color: visualColor
    };
  }

  /**
   * Emits the projectile created event
   * @param projectile The created projectile
   * @param visualProperties The visual properties
   */
  private emitProjectileCreatedEvent(
    projectile: ProjectileLike,
    visualProperties: ProjectileVisualProperties
  ): void {
    logger.debug(`ProjectileFactory: Preparing PROJECTILE_CREATED event payload for projectile ${projectile.id}`);
    logger.debug(`ProjectileFactory: Projectile type: ${projectile.type}, owner: ${projectile.owner}`);
    logger.debug(`ProjectileFactory: Projectile position: (${projectile.x}, ${projectile.y}), velocity: (${projectile.velocityX}, ${projectile.velocityY})`);
    
    const eventPayload: ProjectileCreatedEventData = {
      id: projectile.id,
      type: projectile.type,
      x: projectile.x,
      y: projectile.y,
      owner: projectile.owner,
      velocityX: projectile.velocityX,
      velocityY: projectile.velocityY,
      visualShape: visualProperties.shape,
      visualWidth: visualProperties.width,
      visualHeight: visualProperties.height,
      visualColor: visualProperties.color,
    };
    
    logger.debug(`ProjectileFactory: Event payload created with visual properties - shape: ${visualProperties.shape}, dimensions: ${visualProperties.width}x${visualProperties.height}, color: ${visualProperties.color}`);
    logger.debug(`ProjectileFactory: Emitting PROJECTILE_CREATED event on EventBus for ${projectile.owner} projectile`);
    
    try {
      this.eventBus.emit(Events.PROJECTILE_CREATED, eventPayload);
      logger.debug(`ProjectileFactory: PROJECTILE_CREATED event emitted successfully for projectile ${projectile.id}`);
      
      // Add a delay check to verify the event was processed
      setTimeout(() => {
        logger.debug(`ProjectileFactory: Delayed check for projectile ${projectile.id} - Should be visible by now`);
      }, 100);
    } catch (error) {
      logger.error(`ProjectileFactory: Error emitting PROJECTILE_CREATED event: ${error}`);
    }
  }

  /**
   * Resets the projectile ID counter
   */
  public resetIdCounter(): void {
    this.nextProjectileId = 0;
  }

  /**
   * Gets the next projectile ID without incrementing
   * @returns The next projectile ID
   */
  public getNextProjectileId(): number {
    return this.nextProjectileId;
  }
}