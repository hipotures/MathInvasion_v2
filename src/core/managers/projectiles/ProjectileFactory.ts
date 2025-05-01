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
    logger.debug(`Creating projectile: ${data.type} (ID: ${newId}) at (${data.x}, ${data.y})`);

    const visualProperties = this.determineVisualProperties(data);

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

    this.emitProjectileCreatedEvent(newProjectile, visualProperties);

    return newProjectile;
  }

  /**
   * Determines the visual properties for a projectile
   * @param data The spawn data
   * @returns The visual properties
   */
  private determineVisualProperties(data: SpawnProjectileData): ProjectileVisualProperties {
    let visualShape: 'rectangle' | 'ellipse' = DEFAULT_VISUAL_PROPERTIES.shape;
    let visualWidth: number = DEFAULT_VISUAL_PROPERTIES.width;
    let visualHeight: number = DEFAULT_VISUAL_PROPERTIES.height;
    let visualColor: string = DEFAULT_VISUAL_PROPERTIES.color;

    if (data.owner === 'player' && data.weaponConfig) {
      visualShape = data.weaponConfig.visualShape ?? visualShape;
      visualWidth = data.weaponConfig.visualWidth ?? visualWidth;
      visualHeight = data.weaponConfig.visualHeight ?? visualHeight;
      visualColor = data.weaponConfig.visualColor ?? visualColor;
    } else if (data.owner === 'enemy' && data.enemyShootConfig) {
      visualShape = data.enemyShootConfig.visualShape ?? visualShape;
      visualWidth = data.enemyShootConfig.visualWidth ?? visualWidth;
      visualHeight = data.enemyShootConfig.visualHeight ?? visualHeight;
      visualColor = data.enemyShootConfig.visualColor ?? visualColor;
    } else {
      logger.warn(
        `Could not determine visual config for projectile type: ${data.type}. Using defaults.`
      );
    }

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
    
    this.eventBus.emit(Events.PROJECTILE_CREATED, eventPayload);
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