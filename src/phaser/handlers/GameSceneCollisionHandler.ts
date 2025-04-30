import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import ProjectileManager from '../../core/managers/ProjectileManager';
import { EnemyManager } from '../../core/managers/EnemyManager'; // Import named export
import { EnemyEntity } from '../entities/EnemyEntity';
import * as Events from '../../core/constants/events';

// Re-define necessary interfaces or import them if shared
interface PlayerHitEnemyData {
  enemyInstanceId: string;
  damage: number;
}
interface PlayerHitProjectileData {
  projectileId: string;
  damage: number;
}
interface ProjectileHitEnemyData {
  projectileId: string;
  enemyInstanceId: string;
  damage: number;
}
// Define the structure for the PROJECTILE_EXPLODE event data
interface ProjectileExplodeData {
  id: string;
  x: number;
  y: number;
  radius: number;
  damage: number;
  owner: 'player' | 'enemy';
}

export class GameSceneCollisionHandler {
  private scene: Phaser.Scene; // Reference to the GameScene if needed (e.g., for physics)
  private projectileManager: ProjectileManager;
  private enemyManager: EnemyManager; // Use the class type directly
  private playerSprite: Phaser.Physics.Arcade.Sprite;
  private projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite>;

  constructor(
    scene: Phaser.Scene,
    projectileManager: ProjectileManager,
    enemyManager: EnemyManager, // Expect an instance now
    playerSprite: Phaser.Physics.Arcade.Sprite,
    projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite>
  ) {
    this.scene = scene;
    this.projectileManager = projectileManager;
    this.enemyManager = enemyManager;
    this.playerSprite = playerSprite;
    this.projectileSprites = projectileSprites;

    // Bind methods if needed, or use arrow functions
    this.handlePlayerEnemyCollision = this.handlePlayerEnemyCollision.bind(this);
    this.handleProjectileEnemyCollision = this.handleProjectileEnemyCollision.bind(this);
    this.handlePlayerProjectileCollision = this.handlePlayerProjectileCollision.bind(this);
    this.handleProjectileExplode = this.handleProjectileExplode.bind(this); // Bind new handler

    // Listen for explosion events
    eventBus.on(Events.PROJECTILE_EXPLODE, this.handleProjectileExplode);
  }

  // --- Collision Handlers ---

  public handlePlayerEnemyCollision(object1: unknown, object2: unknown): void {
    // Ensure object1 is the playerSprite and object2 is an EnemyEntity
    if (!(object1 === this.playerSprite && object2 instanceof EnemyEntity)) {
      // If the order is reversed, swap them
      if (object2 === this.playerSprite && object1 instanceof EnemyEntity) {
        [object1, object2] = [object2, object1]; // Swap
      } else {
        return; // Not the collision pair we're looking for
      }
    }

    const enemyEntity = object2 as EnemyEntity;
    if (!enemyEntity.instanceId) {
      logger.warn('Player collision with EnemyEntity missing instanceId');
      return;
    }

    logger.debug(`Player collided with enemy: ${enemyEntity.instanceId}`);

    const collisionDamage = enemyEntity.enemyConfig.collisionDamage ?? 0;
    const eventData: PlayerHitEnemyData = {
      enemyInstanceId: enemyEntity.instanceId,
      damage: collisionDamage,
    };
    eventBus.emit(Events.PLAYER_HIT_ENEMY, eventData);

    // Instant kill enemy on player collision
    this.enemyManager.handleDamage(enemyEntity.instanceId, 9999);
  }

  public handleProjectileEnemyCollision(object1: unknown, object2: unknown): void {
    // Determine which object is the projectile and which is the enemy
    let projectileSprite: Phaser.Physics.Arcade.Sprite | null = null;
    let enemyEntity: EnemyEntity | null = null;

    if (object1 instanceof Phaser.Physics.Arcade.Sprite && object2 instanceof EnemyEntity) {
      projectileSprite = object1;
      enemyEntity = object2;
    } else if (object2 instanceof Phaser.Physics.Arcade.Sprite && object1 instanceof EnemyEntity) {
      projectileSprite = object2;
      enemyEntity = object1;
    } else {
      return; // Not the collision pair we're looking for
    }

    if (!projectileSprite || !enemyEntity || !enemyEntity.instanceId) {
      logger.warn('Projectile/Enemy collision with invalid objects');
      if (projectileSprite?.active) projectileSprite.destroy(); // Clean up projectile if possible
      return;
    }

    const projectileId = [...this.projectileSprites.entries()].find(
      ([, sprite]) => sprite === projectileSprite
    )?.[0];

    if (!projectileId) {
      // logger.warn('Collision detected but could not map projectile sprite to manager ID.');
      if (projectileSprite?.active) projectileSprite.destroy();
      return;
    }

    const projectileOwner = this.projectileManager.getProjectileOwner(projectileId);
    if (projectileOwner !== 'player') {
      // logger.debug(`Ignoring collision: Projectile ${projectileId} (owner: ${projectileOwner}) hit enemy ${enemyEntity.instanceId}`);
      return; // Only player projectiles hit enemies
    }

    logger.debug(`Projectile ${projectileId} hit enemy ${enemyEntity.instanceId}`);

    const damage = this.projectileManager.getProjectileDamage(projectileId) ?? 0;
    const eventData: ProjectileHitEnemyData = {
      projectileId: projectileId,
      enemyInstanceId: enemyEntity.instanceId,
      damage: damage,
    };
    eventBus.emit(Events.PROJECTILE_HIT_ENEMY, eventData);

    // Destroy the projectile sprite immediately
    projectileSprite.destroy();
    this.projectileSprites.delete(projectileId);
  }

  public handlePlayerProjectileCollision(object1: unknown, object2: unknown): void {
    // Determine which object is the player and which is the projectile
    let projectileSprite: Phaser.Physics.Arcade.Sprite | null = null;

    if (object1 === this.playerSprite && object2 instanceof Phaser.Physics.Arcade.Sprite) {
      projectileSprite = object2;
    } else if (object2 === this.playerSprite && object1 instanceof Phaser.Physics.Arcade.Sprite) {
      projectileSprite = object1;
    } else {
      return; // Not the collision pair we're looking for
    }

    if (!projectileSprite) return; // Should not happen based on above logic

    const projectileId = [...this.projectileSprites.entries()].find(
      ([, sprite]) => sprite === projectileSprite
    )?.[0];

    if (!projectileId) {
      // logger.warn('Player collision with unknown projectile sprite.');
      if (projectileSprite?.active) projectileSprite.destroy();
      return;
    }

    const projectileOwner = this.projectileManager.getProjectileOwner(projectileId);
    if (projectileOwner !== 'enemy') {
      // logger.debug(`Ignoring collision: Player hit projectile ${projectileId} (owner: ${projectileOwner})`);
      return; // Only enemy projectiles hit player
    }

    logger.debug(`Player hit by enemy projectile: ${projectileId}`);

    const damage = this.projectileManager.getProjectileDamage(projectileId) ?? 0;
    const eventData: PlayerHitProjectileData = {
      projectileId: projectileId,
      damage: damage,
    };
    eventBus.emit(Events.PLAYER_HIT_PROJECTILE, eventData);

    // Destroy the projectile sprite immediately
    projectileSprite.destroy();
    this.projectileSprites.delete(projectileId);
  }

  // --- Explosion Handler ---

  private handleProjectileExplode(data: ProjectileExplodeData): void {
    logger.debug(
      `Handling explosion for projectile ${data.id} at (${data.x}, ${data.y}) with radius ${data.radius}`
    );

    // Add visual effect for explosion
    const explosionCircle = this.scene.add.circle(data.x, data.y, data.radius, 0xff8800, 0.5);
    this.scene.tweens.add({
      targets: explosionCircle,
      radius: data.radius * 1.5, // Expand slightly
      alpha: 0,
      duration: 150, // Short duration
      ease: 'Quad.easeOut',
      onComplete: () => {
        explosionCircle.destroy();
      },
    });

    // Damage enemies within radius
    this.scene.physics
      .overlapCirc(
        data.x,
        data.y,
        data.radius,
        true, // Check overlap with bodies
        false // Don't include touching bodies (optional)
      )
      .forEach((body) => {
        const gameObject = body.gameObject;
        // Check if it's an enemy and not already destroyed
        if (gameObject instanceof EnemyEntity && gameObject.active && gameObject.instanceId) {
          // Ensure we don't hit enemies with friendly fire (if needed)
          // if (data.owner === 'enemy') { // Only enemy bombs hit enemies? Or player bombs too? Assume enemy bombs hit enemies for now.
          logger.debug(
            `Explosion ${data.id} hit enemy ${gameObject.instanceId} within radius ${data.radius}`
          );
          // Emit event or call manager directly
          const hitData: ProjectileHitEnemyData = {
            projectileId: data.id, // Use explosion ID as source
            enemyInstanceId: gameObject.instanceId,
            damage: data.damage,
          };
          eventBus.emit(Events.PROJECTILE_HIT_ENEMY, hitData);
          // }
        }
      });

    // Damage player if within radius and bomb owner is 'enemy'
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
          projectileId: data.id, // Use explosion ID as source
          damage: data.damage,
        };
        eventBus.emit(Events.PLAYER_HIT_PROJECTILE, hitData);
      }
    }
  }

  /** Clean up event listeners */
  public destroy(): void {
    eventBus.off(Events.PROJECTILE_EXPLODE, this.handleProjectileExplode);
    logger.log('GameSceneCollisionHandler destroyed and listeners removed');
  }
}
