// Main Event Handler - Delegates to sub-handlers
import Phaser from 'phaser';
import logger from '../../core/utils/Logger';
import debugState from '../../core/utils/DebugState'; // Import the shared debug state
import { EnemyEntity } from '../entities/EnemyEntity';
import eventBus from '../../core/events/EventBus'; // Import EventBus
import * as Events from '../../core/constants/events'; // Import Events
import * as Assets from '../../core/constants/assets'; // Import Assets
import { PlayerEventHandler } from './event/PlayerEventHandler';
// Import ProjectileShape type alias along with the handler
import { ProjectileEventHandler, ProjectileShape } from './event/ProjectileEventHandler';
import { EnemyEventHandler } from './event/EnemyEventHandler';
import { PowerupSpawnedData } from '../../core/managers/PowerupManager'; // Import PowerupSpawnedData

// Define payload for applying the slow effect (ideally move to a shared types file)
interface ApplySlowEffectData {
    enemyInstanceIds: string[];
    slowFactor: number;
    durationMs: number;
}

// Define the structure for the REQUEST_ENEMY_DESTRUCTION_EFFECT event data
interface EnemyDestructionEffectData {
  configId: string;
  x: number;
  y: number;
}

export class GameSceneEventHandler {
  // Sub-handlers
  private playerEventHandler: PlayerEventHandler;
  private projectileEventHandler: ProjectileEventHandler;
  private enemyEventHandler: EnemyEventHandler;

  // References needed by sub-handlers or this handler
  private enemySpawnerTimerRef?: Phaser.Time.TimerEvent;
  private scene: Phaser.Scene;
  private powerupGroup: Phaser.GameObjects.Group;
  private powerupSprites: Map<string, Phaser.Physics.Arcade.Sprite>; // Changed key to string
  private projectileShapes: Map<string, ProjectileShape>;
  // Declare enemySprites as a private property
  private enemySprites: Map<string, EnemyEntity>;

  constructor(
    scene: Phaser.Scene,
    playerSprite: Phaser.Physics.Arcade.Sprite,
    projectileGroup: Phaser.GameObjects.Group,
    enemyGroup: Phaser.GameObjects.Group,
    powerupGroup: Phaser.GameObjects.Group, // Add powerup group param
    enemySprites: Map<string, EnemyEntity>, // Add enemySprites map param
    projectileShapes: Map<string, ProjectileShape>,
    powerupSprites: Map<string, Phaser.Physics.Arcade.Sprite> // Changed key to string
  ) {
    this.scene = scene; // Store scene reference
    // Store references needed by handlers
    this.powerupGroup = powerupGroup;
    this.powerupSprites = powerupSprites;
    this.projectileShapes = projectileShapes;
    // Assign the passed map to the class property
    this.enemySprites = enemySprites;

    // Instantiate sub-handlers
    this.playerEventHandler = new PlayerEventHandler(scene, playerSprite);
    this.projectileEventHandler = new ProjectileEventHandler(
      scene,
      playerSprite,
      projectileGroup,
      this.projectileShapes
    );
    this.enemyEventHandler = new EnemyEventHandler(scene, enemyGroup, enemySprites);

    // Bind handlers managed by this class
    this.handlePowerupSpawned = this.handlePowerupSpawned.bind(this);
    this.handleEnemyDestructionEffect = this.handleEnemyDestructionEffect.bind(this);
    this.handleApplySlowEffect = this.handleApplySlowEffect.bind(this); // Bind slow effect handler

    // Register listeners managed by this class
    eventBus.on(Events.POWERUP_SPAWNED, this.handlePowerupSpawned);
    eventBus.on(Events.REQUEST_ENEMY_DESTRUCTION_EFFECT, this.handleEnemyDestructionEffect);
    eventBus.on(Events.APPLY_SLOW_EFFECT, this.handleApplySlowEffect); // Listen for slow effect

    logger.log(
      'GameSceneEventHandler initialized with sub-handlers and powerup/destruction/slow listeners.'
    );
  }

  // Pass references to sub-handlers that need them
  public setEnemySpawnerTimer(timer: Phaser.Time.TimerEvent): void {
    this.enemySpawnerTimerRef = timer;
    // Pass it down to the player handler which uses it on death
    this.playerEventHandler.setEnemySpawnerTimer(timer);
  }

  // --- Powerup Event Handler ---
  private handlePowerupSpawned(data: PowerupSpawnedData): void {
    logger.debug(
      `Handling POWERUP_SPAWNED event for instance ${data.instanceId} at (${data.x}, ${data.y})`
    );

    // Determine the asset key based on the visual identifier
    let assetKey: string;
    switch (data.visual) {
      case 'shield_icon':
        assetKey = Assets.POWERUP_SHIELD_KEY;
        break;
      case 'rapid_fire_icon':
        assetKey = Assets.POWERUP_RAPID_FIRE_KEY;
        break;
      case 'cash_icon':
        assetKey = Assets.POWERUP_CASH_KEY; // Use the new asset key
        break;
      default:
        logger.warn(`Unknown powerup visual identifier: ${data.visual}`);
        // Unknown type, don't create a sprite
        return;
    }

    // Create the powerup sprite
    const powerupSprite = this.scene.physics.add.sprite(data.x, data.y, assetKey);
    powerupSprite.setScale(0.05); // Revert to original small scale
    // powerupSprite.setScale(0.5); // Increased scale for testing visibility
    powerupSprite.setVelocityY(50); // Give it some downward movement

    // Ensure physics body is enabled and configured for overlap
    if (powerupSprite.body) { // Check if body exists
        const body = powerupSprite.body as Phaser.Physics.Arcade.Body;
        body.enable = true; // Explicitly enable
        body.setCollideWorldBounds(false); // Powerups don't need to collide with bounds
        body.checkCollision.none = false; // Ensure collision checks aren't globally disabled
        // Overlap doesn't strictly need these, but let's be explicit
        body.checkCollision.up = false;
        body.checkCollision.down = false;
        body.checkCollision.left = false;
        body.checkCollision.right = false;
    }
    // Set data properties for debug inspection BEFORE setting circle maybe?
    powerupSprite.setData('instanceId', data.instanceId);
    powerupSprite.setData('objectType', 'powerup');
    powerupSprite.setData('configId', data.configId);

    // Optional: Add slight rotation or tween effect
    this.scene.tweens.add({
      targets: powerupSprite,
      angle: 360,
      duration: 2000,
      repeat: -1,
      ease: 'Linear',
    });

    // Add to the group and map
    this.powerupGroup.add(powerupSprite);
    // Set circle AFTER adding to group
    // Align collision circle with the visual sprite
    const powerupRadius = 15; // Use the same radius
    powerupSprite.setCircle(
      powerupRadius,
      -powerupRadius + powerupSprite.width / 2, // X offset
      -powerupRadius + powerupSprite.height / 2 // Y offset
    );
    this.powerupSprites.set(data.instanceId, powerupSprite);


    // --- ADDED DETAILED LOG ---
    const body = powerupSprite.body as Phaser.Physics.Arcade.Body;
    logger.log(`[EventHandler] Powerup ${data.instanceId} created. Body details:`, {
        exists: !!body,
        enabled: body?.enable,
        isCircle: body?.isCircle,
        radius: body?.radius,
        width: body?.width,
        height: body?.height,
        x: body?.x,
        y: body?.y,
        velocity: body?.velocity,
        inGroup: this.powerupGroup.contains(powerupSprite)
    });
    // --- END ADDED DETAILED LOG ---


    // Powerups should always be visible when spawned
    // REMOVED: powerupSprite.setVisible(!debugState.isDebugMode);

    // Play spawn sound
    this.scene.sound.play(Assets.AUDIO_POWERUP_APPEAR_KEY);
  }

  // --- Enemy Destruction Effect Handler ---
  private handleEnemyDestructionEffect(data: EnemyDestructionEffectData): void {
    logger.debug(
      `Handling REQUEST_ENEMY_DESTRUCTION_EFFECT for ${data.configId} at (${data.x}, ${data.y})`
    );

    // Play sound based on enemy type (can be expanded)
    this.scene.sound.play(Assets.AUDIO_EXPLOSION_SMALL_KEY);

    // Create visual effect based on enemy type (can be expanded)
    switch (data.configId) {
      case 'triangle_scout':
      case 'square_tank':
      case 'pentagon_healer':
      case 'hexagon_bomber':
      case 'diamond_strafer': {
        // Example placeholder: small flash
        const flash = this.scene.add.circle(data.x, data.y, 10, 0xffffff, 0.8);
        this.scene.tweens.add({
          targets: flash,
          radius: 30,
          alpha: 0,
          duration: 150,
          ease: 'Quad.easeOut',
          onComplete: () => flash.destroy(),
        });
        break;
      }
      case 'circle_boss': {
        // Example placeholder: larger flash
        const bossFlash = this.scene.add.circle(data.x, data.y, 30, 0xffaa00, 1);
        this.scene.tweens.add({
          targets: bossFlash,
          radius: 100,
          alpha: 0,
          duration: 400,
          ease: 'Quad.easeOut',
          onComplete: () => bossFlash.destroy(),
        });
        break;
      }
      default: {
        logger.warn(`No specific destruction effect defined for enemy type: ${data.configId}`);
        // Default fallback effect (e.g., the small flash)
        const defaultFlash = this.scene.add.circle(data.x, data.y, 10, 0xcccccc, 0.7);
        this.scene.tweens.add({
          targets: defaultFlash,
          radius: 25,
          alpha: 0,
          duration: 150,
          ease: 'Quad.easeOut',
          onComplete: () => defaultFlash.destroy(),
        });
        break;
      }
    }
  }

  // --- Slow Effect Handler ---
  private handleApplySlowEffect(data: ApplySlowEffectData): void {
    logger.debug(`Applying slow effect (Factor: ${data.slowFactor}, Duration: ${data.durationMs}ms) to enemies: ${data.enemyInstanceIds.join(', ')}`);
    data.enemyInstanceIds.forEach(instanceId => {
      const enemyEntity = this.enemySprites.get(instanceId);
      // Check if the entity exists and has the applySlow method (which we still need to add)
      if (enemyEntity && typeof (enemyEntity as any).applySlow === 'function') {
         (enemyEntity as any).applySlow(data.slowFactor, data.durationMs);
      } else if (enemyEntity) {
         logger.warn(`EnemyEntity ${instanceId} does not have an applySlow method.`);
      } else {
         logger.warn(`Could not find active EnemyEntity for ID: ${instanceId} to apply slow effect.`);
      }
    });
  }

  /** Clean up event listeners by destroying sub-handlers and removing own listeners */
  public destroy(): void {
    this.playerEventHandler.destroy();
    this.projectileEventHandler.destroy();
    this.enemyEventHandler.destroy();
    eventBus.off(Events.POWERUP_SPAWNED, this.handlePowerupSpawned);
    eventBus.off(Events.REQUEST_ENEMY_DESTRUCTION_EFFECT, this.handleEnemyDestructionEffect);
    eventBus.off(Events.APPLY_SLOW_EFFECT, this.handleApplySlowEffect); // Unregister slow listener
    logger.log(
      'GameSceneEventHandler destroyed, called destroy on sub-handlers and removed listeners.'
    );
  }
}
