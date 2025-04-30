import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
// import ProjectileManager from '../../core/managers/ProjectileManager'; // Unused import
import { EnemyEntity } from '../entities/EnemyEntity';
import { EnemyConfig } from '../../core/config/schemas/enemySchema';
import { WeaponConfig } from '../../core/config/schemas/weaponSchema';
import { PlayerState } from '../../core/types/PlayerState';
import * as Events from '../../core/constants/events';
import * as Assets from '../../core/constants/assets';

// Re-define necessary interfaces or import if shared
interface ProjectileCreatedData {
  id: string;
  type: string;
  x: number;
  y: number;
  owner: 'player' | 'enemy';
}
interface EnemyRequestFireData {
  instanceId: string;
  x: number;
  y: number;
  shootConfig: NonNullable<EnemyConfig['shootConfig']>;
}
// Define the structure for the ENEMY_DESTROYED event data
interface EnemyDestroyedData {
  instanceId: string;
  configId: string;
  reward: number;
  config: EnemyConfig; // The full config is now included
}

export class GameSceneEventHandler {
  private scene: Phaser.Scene;
  private physics: Phaser.Physics.Arcade.ArcadePhysics;
  private tweens: Phaser.Tweens.TweenManager;
  private time: Phaser.Time.Clock;
  private sound: Phaser.Sound.BaseSoundManager;
  private playerSprite: Phaser.Physics.Arcade.Sprite;
  private projectileGroup: Phaser.GameObjects.Group;
  private enemyGroup: Phaser.GameObjects.Group; // Added enemyGroup reference
  private enemySprites: Map<string, EnemyEntity>;
  private projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite>;
  private enemySpawnerTimerRef?: Phaser.Time.TimerEvent; // To potentially stop it on death
  private gameOverTextRef?: Phaser.GameObjects.Text; // To potentially create it on death

  constructor(
    scene: Phaser.Scene,
    playerSprite: Phaser.Physics.Arcade.Sprite,
    projectileGroup: Phaser.GameObjects.Group,
    enemyGroup: Phaser.GameObjects.Group, // Added enemyGroup parameter
    enemySprites: Map<string, EnemyEntity>,
    projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite>
  ) {
    this.scene = scene;
    this.physics = scene.physics;
    this.tweens = scene.tweens;
    this.time = scene.time;
    this.sound = scene.sound;
    this.playerSprite = playerSprite;
    this.projectileGroup = projectileGroup;
    this.enemyGroup = enemyGroup; // Store enemyGroup reference
    this.enemySprites = enemySprites;
    this.projectileSprites = projectileSprites;

    // Bind methods to ensure 'this' context is correct when used as callbacks
    this.handlePlayerStateUpdate = this.handlePlayerStateUpdate.bind(this);
    this.handleProjectileCreated = this.handleProjectileCreated.bind(this);
    this.handleProjectileDestroyed = this.handleProjectileDestroyed.bind(this);
    this.handleEnemySpawned = this.handleEnemySpawned.bind(this);
    this.handleEnemyDestroyed = this.handleEnemyDestroyed.bind(this);
    this.handleEnemyHealthUpdate = this.handleEnemyHealthUpdate.bind(this);
    this.handleRequestFireWeapon = this.handleRequestFireWeapon.bind(this);
    this.handleEnemyRequestFire = this.handleEnemyRequestFire.bind(this);
    this.handlePlayerDied = this.handlePlayerDied.bind(this);

    // Register the listener for ENEMY_DESTROYED
    eventBus.on(Events.ENEMY_DESTROYED, this.handleEnemyDestroyed);
  }

  // Pass references during construction or via a setter if needed later
  public setEnemySpawnerTimer(timer: Phaser.Time.TimerEvent): void {
    this.enemySpawnerTimerRef = timer;
  }
  public setGameOverText(text: Phaser.GameObjects.Text): void {
    this.gameOverTextRef = text; // Although creating it here might be better
  }

  // --- Event Handlers ---

  public handlePlayerStateUpdate(state: PlayerState): void {
    if (this.playerSprite?.body) {
      this.playerSprite.setVelocityX(state.velocityX);
    }
  }

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

    // No longer tinting enemy bullets by default, rely on distinct graphics
    // if (data.owner === 'enemy' && textureKey === Assets.BULLET_KEY) {
    //   projectileSprite.setTint(0xff8888);
    // } // Closing brace for commented if
    this.projectileGroup.add(projectileSprite);
    this.projectileSprites.set(data.id, projectileSprite);
  } // This closing brace belongs to handleProjectileCreated

  // Removed the extra closing brace that was here

  public handleProjectileDestroyed(data: { id: string }): void {
    const projectileSprite = this.projectileSprites.get(data.id);
    if (projectileSprite) {
      this.projectileGroup.remove(projectileSprite, true, true);
      this.projectileSprites.delete(data.id);
    } else {
      logger.warn(`Could not find projectile sprite to destroy: ID ${data.id}`);
    }
  }

  public handleEnemySpawned(data: {
    instanceId: string;
    config: EnemyConfig;
    position: { x: number; y: number };
  }): void {
    let enemyAssetKey: string;
    switch (data.config.id) {
      case 'triangle_scout':
        enemyAssetKey = Assets.ENEMY_SMALL_ALIEN_KEY;
        break;
      case 'square_tank':
      case 'pentagon_healer': // TODO: Needs own asset?
        enemyAssetKey = Assets.ENEMY_MEDIUM_ALIEN_KEY;
        break;
      case 'hexagon_bomber': // Added new enemy mapping
        enemyAssetKey = Assets.ENEMY_HEXAGON_BOMBER_KEY;
        break;
      case 'diamond_strafer': // Added Diamond Strafer mapping
        enemyAssetKey = Assets.ENEMY_DIAMOND_STRAFER_KEY;
        break;
      case 'circle_boss': // TODO: Needs own asset?
        enemyAssetKey = Assets.ENEMY_LARGE_METEOR_KEY;
        break;
      default:
        enemyAssetKey = Assets.ENEMY_SMALL_ALIEN_KEY; // Fallback
        logger.warn(`Unknown enemy config ID: ${data.config.id}`);
    }
    // Need access to the scene context to create the entity
    const enemyEntity = new EnemyEntity(
      this.scene,
      data.position.x,
      data.position.y,
      enemyAssetKey,
      data.instanceId,
      data.config
    );
    // Need access to the enemyGroup from the scene
    // This suggests the handler might need a reference back to the scene's group, or the scene calls a method here
    // For now, assume scene passes group reference or handles adding
    // Let's modify constructor/add method to pass enemyGroup
    // Add the created entity to the group
    this.enemyGroup.add(enemyEntity);
    this.enemySprites.set(data.instanceId, enemyEntity);
  }

  // Updated to use EnemyDestroyedData
  public handleEnemyDestroyed(data: EnemyDestroyedData): void {
    const enemyEntity = this.enemySprites.get(data.instanceId);
    if (enemyEntity) {
      // Use config from the event data
      const enemyConfig = data.config;
      const enemyPosition = { x: enemyEntity.x, y: enemyEntity.y }; // Get position before destroying sprite

      // Play sound and trigger visual destruction
      this.sound.play(Assets.AUDIO_EXPLOSION_SMALL_KEY);
      enemyEntity.destroySelf();
      this.enemySprites.delete(data.instanceId);

      // Check for death bomb ability using the config from the event data
      const deathBombAbility = enemyConfig?.abilities?.find(
        (ability) => ability.type === 'death_bomb'
      );
      if (deathBombAbility && deathBombAbility.type === 'death_bomb') {
        logger.debug(`Enemy ${data.instanceId} triggering death bomb.`);
        // Emit spawn event for the bomb projectile
        eventBus.emit(Events.SPAWN_PROJECTILE, {
          type: deathBombAbility.projectileType, // Use the type defined in the ability config
          x: enemyPosition.x,
          y: enemyPosition.y,
          velocityX: 0, // Bomb explodes in place (or maybe slight downward drift?)
          velocityY: 0,
          damage: deathBombAbility.damage,
          owner: 'enemy',
          radius: deathBombAbility.radius ?? 50, // Use radius from config, default 50
          timeToExplodeMs: deathBombAbility.timeToExplodeMs ?? 500, // Use time from config, default 500ms
        });
      }
    } else {
      logger.warn(`Could not find enemy entity to destroy: ID ${data.instanceId}`);
    }
  }

  public handleEnemyHealthUpdate(data: { instanceId: string }): void {
    const enemyEntity = this.enemySprites.get(data.instanceId);
    enemyEntity?.takeDamage(0); // Trigger visual effect
  }

  public handleRequestFireWeapon(data: { weaponConfig: WeaponConfig }): void {
    if (!this.playerSprite?.active) return;
    const { weaponConfig } = data;
    const spawnPoint = this.playerSprite.getTopCenter();
    const velocityY = -weaponConfig.projectileSpeed;
    eventBus.emit(Events.SPAWN_PROJECTILE, {
      type: weaponConfig.projectileType,
      x: spawnPoint.x,
      y: spawnPoint.y,
      velocityX: 0,
      velocityY: velocityY,
      damage: weaponConfig.baseDamage ?? 0,
      owner: 'player',
    });
  }

  public handleEnemyRequestFire(data: EnemyRequestFireData): void {
    const enemySprite = this.enemySprites.get(data.instanceId);
    if (!enemySprite?.active) return;
    const { shootConfig } = data;
    const projectileSpeed = shootConfig.speed ?? 150;
    let velocityX = 0,
      velocityY = projectileSpeed;
    if (this.playerSprite?.active) {
      const angle = Phaser.Math.Angle.Between(
        data.x,
        data.y,
        this.playerSprite.x,
        this.playerSprite.y
      );
      // Need access to scene.physics
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

  public handlePlayerDied(): void {
    logger.log('Game Over - Player Died');
    // Need access to scene's timer and tweens
    if (this.enemySpawnerTimerRef) this.enemySpawnerTimerRef.destroy(); // Stop spawner
    if (this.playerSprite?.active) {
      this.playerSprite.disableBody(true, false);
      this.tweens.add({
        targets: this.playerSprite,
        duration: 300,
        alpha: 0,
        scale: 0.5,
        angle: 90,
        tint: 0xff0000,
        ease: 'Power2',
        onComplete: () => {
          this.playerSprite.setVisible(false);
        },
      });
    }
    this.time.delayedCall(500, () => {
      // Need access to scene.cameras and scene.add
      const { width, height, x, y } = this.scene.cameras.main.worldView;
      // Create text via scene.add
      this.gameOverTextRef = this.scene.add
        .text(x + width / 2, y + height / 2, 'GAME OVER', {
          fontSize: '64px',
          color: '#ff0000',
          align: 'center',
        })
        .setOrigin(0.5);
    });
    // Optional: Restart logic
    // this.time.delayedCall(3500, () => { this.scene.scene.restart(); }); // Use scene reference
  }
}
