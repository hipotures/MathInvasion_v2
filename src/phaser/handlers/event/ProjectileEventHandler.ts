import Phaser from 'phaser';
import eventBus from '../../../core/events/EventBus';
import logger from '../../../core/utils/Logger';
import debugState from '../../../core/utils/DebugState'; // Import the shared debug state
import { WeaponConfig } from '../../../core/config/schemas/weaponSchema';
import { EnemyConfig } from '../../../core/config/schemas/enemySchema';
import * as Events from '../../../core/constants/events';
import * as Assets from '../../../core/constants/assets';

// Re-define necessary interfaces or import if shared
interface ProjectileCreatedData {
  id: string;
  type: string;
  x: number;
  y: number;
  owner: 'player' | 'enemy';
}
interface EnemyRequestFireData {
  instanceId: string; // Need this to find the enemy sprite if needed, though not used here
  x: number;
  y: number;
  shootConfig: NonNullable<EnemyConfig['shootConfig']>;
}

export class ProjectileEventHandler {
  private physics: Phaser.Physics.Arcade.ArcadePhysics;
  private playerSprite: Phaser.Physics.Arcade.Sprite; // Needed for player fire request origin
  private projectileGroup: Phaser.GameObjects.Group;
  private projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite>;

  constructor(
    scene: Phaser.Scene,
    playerSprite: Phaser.Physics.Arcade.Sprite,
    projectileGroup: Phaser.GameObjects.Group,
    projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite>
  ) {
    this.physics = scene.physics;
    this.playerSprite = playerSprite;
    this.projectileGroup = projectileGroup;
    this.projectileSprites = projectileSprites;

    // Bind methods
    this.handleProjectileCreated = this.handleProjectileCreated.bind(this);
    this.handleProjectileDestroyed = this.handleProjectileDestroyed.bind(this);
    this.handleRequestFireWeapon = this.handleRequestFireWeapon.bind(this);
    this.handleEnemyRequestFire = this.handleEnemyRequestFire.bind(this);

    // Register listeners
    eventBus.on(Events.PROJECTILE_CREATED, this.handleProjectileCreated);
    eventBus.on(Events.PROJECTILE_DESTROYED, this.handleProjectileDestroyed);
    eventBus.on(Events.REQUEST_FIRE_WEAPON, this.handleRequestFireWeapon);
    eventBus.on(Events.ENEMY_REQUEST_FIRE, this.handleEnemyRequestFire);
  }

  // --- Event Handlers ---

  public handleProjectileCreated(data: ProjectileCreatedData): void {
    let textureKey = Assets.BULLET_KEY; // Default to player bullet

    // Map projectile type to texture key
    if (data.owner === 'enemy') {
      switch (data.type) {
        case 'enemy_bomb':
          textureKey = Assets.PROJECTILE_DEATH_BOMB_KEY;
          break;
        case 'enemy_bullet':
          textureKey = Assets.PROJECTILE_ENEMY_BULLET_KEY;
          break;
        case 'enemy_bullet_fast':
          textureKey = Assets.PROJECTILE_ENEMY_BULLET_FAST_KEY;
          break;
        case 'enemy_laser':
          textureKey = Assets.PROJECTILE_ENEMY_LASER_KEY;
          break;
        default:
          logger.warn(`Unknown enemy projectile type: ${data.type}. Using default bullet.`);
          textureKey = Assets.PROJECTILE_ENEMY_BULLET_KEY; // Fallback to standard enemy bullet
          break;
      }
    }

    const projectileSprite = this.physics.add.sprite(data.x, data.y, textureKey);
    projectileSprite.setScale(0.05); // Set much smaller scale for projectiles
    this.projectileGroup.add(projectileSprite);
    this.projectileSprites.set(data.id, projectileSprite);

    // Set initial visibility based on debug mode
    projectileSprite.setVisible(!debugState.isDebugMode);
  }

  public handleProjectileDestroyed(data: { id: string }): void {
    const projectileSprite = this.projectileSprites.get(data.id);
    if (projectileSprite) {
      this.projectileGroup.remove(projectileSprite, true, true);
      this.projectileSprites.delete(data.id);
    } else {
      logger.warn(`Could not find projectile sprite to destroy: ID ${data.id}`);
    }
  }

  // Update the type hint to match the actual event data from WeaponManager
  public handleRequestFireWeapon(data: {
    weaponConfig: WeaponConfig;
    damage: number;
    projectileSpeed: number;
  }): void {
    if (!this.playerSprite?.active) return;
    const { weaponConfig, damage, projectileSpeed } = data; // Destructure all needed data
    const spawnPoint = this.playerSprite.getTopCenter();
    const velocityY = -projectileSpeed; // Use speed from event data
    eventBus.emit(Events.SPAWN_PROJECTILE, {
      type: weaponConfig.projectileType,
      x: spawnPoint.x,
      y: spawnPoint.y,
      velocityX: 0,
      velocityY: velocityY,
      damage: damage, // Use damage from event data
      owner: 'player',
    });
  }

  public handleEnemyRequestFire(data: EnemyRequestFireData): void {
    // Note: We don't need the enemy sprite itself here, just its position and config
    const { shootConfig } = data;
    const projectileSpeed = shootConfig.speed ?? 150;
    let velocityX = 0,
      velocityY = projectileSpeed;

    // Aiming logic requires player sprite position
    if (this.playerSprite?.active) {
      const angle = Phaser.Math.Angle.Between(
        data.x,
        data.y,
        this.playerSprite.x,
        this.playerSprite.y
      );
      const velocity = this.physics.velocityFromAngle(Phaser.Math.RadToDeg(angle), projectileSpeed);
      velocityX = velocity.x;
      velocityY = velocity.y;
    }

    eventBus.emit(Events.SPAWN_PROJECTILE, {
      type: shootConfig.projectileType,
      x: data.x,
      y: data.y,
      velocityX: velocityX,
      velocityY: velocityY,
      damage: shootConfig.damage ?? 0,
      owner: 'enemy',
    });
  }

  /** Clean up event listeners */
  public destroy(): void {
    eventBus.off(Events.PROJECTILE_CREATED, this.handleProjectileCreated);
    eventBus.off(Events.PROJECTILE_DESTROYED, this.handleProjectileDestroyed);
    eventBus.off(Events.REQUEST_FIRE_WEAPON, this.handleRequestFireWeapon);
    eventBus.off(Events.ENEMY_REQUEST_FIRE, this.handleEnemyRequestFire);
    logger.log('ProjectileEventHandler destroyed and listeners removed');
  }
}
