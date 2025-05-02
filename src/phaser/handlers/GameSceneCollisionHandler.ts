import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import ProjectileManager from '../../core/managers/ProjectileManager';
import { EnemyManager } from '../../core/managers/EnemyManager'; // Import named export
import { EnemyEntity } from '../entities/EnemyEntity';
import * as Events from '../../core/constants/events';
import { PowerupCollectedData } from '../../core/managers/PowerupManager'; // Import PowerupCollectedData
// Import the ProjectileShape type
import { ProjectileShape } from './event/ProjectileEventHandler';

// Re-define necessary interfaces or import them if shared
// Explosion data interface removed, handled by AreaEffectHandler
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

export class GameSceneCollisionHandler {
  private scene: Phaser.Scene; // Reference to the GameScene if needed (e.g., for physics)
  private projectileManager: ProjectileManager;
  private enemyManager: EnemyManager; // Use the class type directly
  private playerSprite: Phaser.Physics.Arcade.Sprite;
  // Rename and update type
  private projectileShapes: Map<string, ProjectileShape>;
  private powerupGroup: Phaser.GameObjects.Group; // Add powerup group
  private powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>; // Add powerup sprites map

  constructor(
    scene: Phaser.Scene,
    projectileManager: ProjectileManager,
    enemyManager: EnemyManager, // Expect an instance now
    playerSprite: Phaser.Physics.Arcade.Sprite,
    // Rename and update type
    projectileShapes: Map<string, ProjectileShape>,
    powerupGroup: Phaser.GameObjects.Group, // Add powerup group param
    powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite> // Add powerup sprites map param
  ) {
    this.scene = scene;
    this.projectileManager = projectileManager;
    this.enemyManager = enemyManager;
    this.playerSprite = playerSprite;
    // Assign renamed property
    this.projectileShapes = projectileShapes;
    this.powerupGroup = powerupGroup; // Assign powerup group
    this.powerupSprites = powerupSprites; // Assign powerup sprites map

    // Bind methods if needed, or use arrow functions
    this.handlePlayerEnemyCollision = this.handlePlayerEnemyCollision.bind(this);
    this.handleProjectileEnemyCollision = this.handleProjectileEnemyCollision.bind(this);
    this.handlePlayerProjectileCollision = this.handlePlayerProjectileCollision.bind(this);
    this.handlePlayerPowerupCollision = this.handlePlayerPowerupCollision.bind(this); // Bind new handler
    // Explosion listener and handler removed
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
    // Determine which object is the projectile shape and which is the enemy
    let projectileShape: ProjectileShape | null = null;
    let enemyEntity: EnemyEntity | null = null;

    // Check if object1 is a Shape and object2 is an EnemyEntity
    if (object1 instanceof Phaser.GameObjects.Shape && object2 instanceof EnemyEntity) {
      // Check if the shape exists in our projectile map
      const foundEntry = [...this.projectileShapes.entries()].find(
        ([, shape]) => shape === object1
      );
      if (foundEntry) {
        projectileShape = object1 as ProjectileShape;
        enemyEntity = object2;
      }

      // Check if object2 is a Shape and object1 is an EnemyEntity
    } else if (object2 instanceof Phaser.GameObjects.Shape && object1 instanceof EnemyEntity) {
      const foundEntry = [...this.projectileShapes.entries()].find(
        ([, shape]) => shape === object2
      );
      if (foundEntry) {
        projectileShape = object2 as ProjectileShape;
        enemyEntity = object1;
      }
    }

    // If neither combination matches, exit
    if (!projectileShape || !enemyEntity) {
      return; // Not the collision pair we're looking for
    }

    if (!enemyEntity.instanceId) {
      logger.warn('Projectile/Enemy collision with invalid enemy entity');
      if (projectileShape?.active) projectileShape.destroy(); // Clean up projectile if possible
      return;
    }

    // Find the ID by looking up the shape object in the map values
    const projectileId = [...this.projectileShapes.entries()].find(
      ([, shape]) => shape === projectileShape
    )?.[0];

    if (!projectileId) {
      // logger.warn('Collision detected but could not map projectile shape to manager ID.');
      if (projectileShape?.active) projectileShape.destroy();
      return;
    }

    const projectileOwner = this.projectileManager.getProjectileOwner(projectileId);
    if (projectileOwner !== 'player') {
      // logger.debug(`Ignoring collision: Projectile ${projectileId} (owner: ${projectileOwner}) hit enemy ${enemyEntity.instanceId}`);
      return; // Only player projectiles hit enemies
    }

    logger.debug(`Projectile ${projectileId} hit enemy ${enemyEntity.instanceId}`);

    // Get projectile state to fetch damage
    const projectileState = this.projectileManager.getProjectileState(projectileId);
    if (!projectileState) {
      logger.warn(`Could not get state for projectile ${projectileId} during collision.`);
      // Still destroy the shape if possible
      if (projectileShape?.active) projectileShape.destroy();
      this.projectileShapes.delete(projectileId);
      return;
    }

    // --- Simplified Logic: Apply damage and destroy ALL projectiles on hit ---
    const damage = projectileState.damage ?? 0; // Use damage directly (assuming laser damagePerSec is stored here too)
    
    // Check if damage is valid before emitting
    if (damage > 0) {
        const eventData: ProjectileHitEnemyData = {
            projectileId: projectileId,
            enemyInstanceId: enemyEntity.instanceId,
            damage: damage, // Pass the damage value
        };
        eventBus.emit(Events.PROJECTILE_HIT_ENEMY, eventData);
    } else {
        logger.warn(`Projectile ${projectileId} hit enemy ${enemyEntity.instanceId} but damage was ${damage}. No event emitted.`);
    }

    // Destroy the projectile shape immediately (applies to both bullets and lasers now)
    if (projectileShape?.active) {
        // logger.debug(`Destroying projectile ${projectileId} after hitting enemy.`); // Can be noisy
        projectileShape.destroy();
    }
    this.projectileShapes.delete(projectileId); // Delete from the tracking map
  }

  public handlePlayerProjectileCollision(object1: unknown, object2: unknown): void {
    // Determine which object is the player and which is the projectile shape
    let projectileShape: ProjectileShape | null = null;

    // Check if object1 is player and object2 is a Shape
    if (object1 === this.playerSprite && object2 instanceof Phaser.GameObjects.Shape) {
      // Check if the shape exists in our projectile map
      const foundEntry = [...this.projectileShapes.entries()].find(
        ([, shape]) => shape === object2
      );
      if (foundEntry) {
        projectileShape = object2 as ProjectileShape;
      }
      // Check if object2 is player and object1 is a Shape
    } else if (object2 === this.playerSprite && object1 instanceof Phaser.GameObjects.Shape) {
      // Check if the shape exists in our projectile map
      const foundEntry = [...this.projectileShapes.entries()].find(
        ([, shape]) => shape === object1
      );
      if (foundEntry) {
        projectileShape = object1 as ProjectileShape;
      }
    }

    // If neither combination matches, exit
    if (!projectileShape) {
      return; // Not the collision pair we're looking for
    }

    // Find the ID by looking up the shape object in the map values
    const projectileId = [...this.projectileShapes.entries()].find(
      ([, shape]) => shape === projectileShape
    )?.[0];

    if (!projectileId) {
      // logger.warn('Player collision with unknown projectile shape.');
      if (projectileShape?.active) projectileShape.destroy();
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

    // Destroy the projectile shape immediately
    projectileShape.destroy();
    this.projectileShapes.delete(projectileId); // Delete from the correct map
  }

  public handlePlayerPowerupCollision(object1: unknown, object2: unknown): void {
    // Removed diagnostic log

    // Determine which object is the player and which is the powerup sprite
    let powerupSprite: Phaser.Physics.Arcade.Sprite | null = null;

    if (
      object1 === this.playerSprite &&
      object2 instanceof Phaser.Physics.Arcade.Sprite &&
      this.powerupGroup.contains(object2)
    ) {
      powerupSprite = object2;
    } else if (
      object2 === this.playerSprite &&
      object1 instanceof Phaser.Physics.Arcade.Sprite &&
      this.powerupGroup.contains(object1)
    ) {
      powerupSprite = object1;
    } else {
      return; // Not the collision pair we're looking for
    }

    if (!powerupSprite) return;

    // Find the instance ID associated with this sprite
    const instanceIdEntry = [...this.powerupSprites.entries()].find(
      ([, sprite]) => sprite === powerupSprite
    );

    if (!instanceIdEntry) {
      logger.warn('Player collision with unknown powerup sprite.');
      if (powerupSprite?.active) powerupSprite.destroy();
      return;
    }

    const instanceId = instanceIdEntry[0];
    // --- ADDED LOG ---
    logger.log(`[CollisionHandler] Overlap detected! Player vs Powerup Instance ID: ${instanceId}`); // Use .log
    // --- END ADDED LOG ---
    logger.debug(`Player collected powerup instance: ${instanceId}`);

    // Emit the POWERUP_COLLECTED event for the PowerupManager
    const eventData: PowerupCollectedData = { instanceId };
    eventBus.emit(Events.POWERUP_COLLECTED, eventData);

    // Destroy the powerup sprite immediately after collection
    powerupSprite.destroy();
    this.powerupSprites.delete(instanceId);
    // Play collection sound
    // Play collection sound - Need to import Assets or pass sound manager
    // For now, let's remove the sound play from here, it might fit better in the scene event handler
    // this.scene.sound.play(Assets.AUDIO_POWERUP_GET_KEY);
  }

  // --- Explosion Handler Removed ---

  /** Clean up event listeners */
  public destroy(): void {
    // No listeners owned by this class anymore
    logger.log('GameSceneCollisionHandler destroyed.');
  }
}
