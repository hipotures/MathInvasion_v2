import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import { EnemyEntity } from '../entities/EnemyEntity';
import * as Events from '../../core/constants/events';

// Define the structure for the PROJECTILE_EXPLODE event data
// TODO: Centralize this interface if used elsewhere
interface ProjectileExplodeData {
  id: string;
  x: number;
  y: number;
  radius: number;
  damage: number;
  owner: 'player' | 'enemy';
}

// Re-define necessary interfaces or import them if shared
// TODO: Centralize these interfaces
interface PlayerHitProjectileData {
  projectileId: string;
  damage: number;
}
interface ProjectileHitEnemyData {
  projectileId: string;
  enemyInstanceId: string;
  damage: number;
}

/**
 * Handles area effects within the game scene, specifically projectile explosions.
 */
export class GameSceneAreaEffectHandler {
  private scene: Phaser.Scene;
  private playerSprite: Phaser.Physics.Arcade.Sprite;

  constructor(scene: Phaser.Scene, playerSprite: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene;
    this.playerSprite = playerSprite;

    this.handleProjectileExplode = this.handleProjectileExplode.bind(this);
    eventBus.on(Events.PROJECTILE_EXPLODE, this.handleProjectileExplode);

    logger.log('GameSceneAreaEffectHandler initialized.');
  }

  private handleProjectileExplode(data: ProjectileExplodeData): void {
    logger.debug(
      `Handling explosion for projectile ${data.id} at (${data.x}, ${data.y}) with radius ${data.radius}`
    );

    const explosionCore = this.scene.add.circle(data.x, data.y, data.radius * 0.1, 0xffffff, 1);
    const explosionRing = this.scene.add.circle(data.x, data.y, data.radius * 0.15, 0xff8800, 0.8);

    this.scene.tweens.add({
      targets: explosionCore,
      radius: data.radius * 0.3,
      alpha: 0,
      duration: 100,
      ease: 'Quad.easeOut',
      onComplete: () => {
        explosionCore.destroy();
      },
    });

    this.scene.tweens.add({
      targets: explosionRing,
      radius: data.radius,
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => {
        explosionRing.destroy();
      },
    });

    this.scene.physics
      .overlapCirc(
        data.x,
        data.y,
        data.radius,
        true,
        false
      )
      .forEach((body) => {
        const gameObject = body.gameObject;
        if (gameObject instanceof EnemyEntity && gameObject.active && gameObject.instanceId) {
          // TODO: Add check for bomb owner if friendly fire needs prevention
          logger.debug(
            `Explosion ${data.id} hit enemy ${gameObject.instanceId} within radius ${data.radius}`
          );
          const hitData: ProjectileHitEnemyData = {
            projectileId: data.id,
            enemyInstanceId: gameObject.instanceId,
            damage: data.damage,
          };
          eventBus.emit(Events.PROJECTILE_HIT_ENEMY, hitData);
        }
      });

    if (data.owner === 'enemy' && this.playerSprite.active) {
      const distanceToPlayer = Phaser.Math.Distance.Between(
        data.x,
        data.y,
        this.playerSprite.x,
        this.playerSprite.y
      );
      if (distanceToPlayer <= data.radius) {
        logger.debug(`Explosion ${data.id} hit player within radius ${data.radius}`);
        const hitData: PlayerHitProjectileData = {
          projectileId: data.id,
          damage: data.damage,
        };
        eventBus.emit(Events.PLAYER_HIT_PROJECTILE, hitData);
      }
    }
  }

  /** Clean up event listeners */
  public destroy(): void {
    eventBus.off(Events.PROJECTILE_EXPLODE, this.handleProjectileExplode);
    logger.log('GameSceneAreaEffectHandler destroyed and listeners removed');
  }
}
