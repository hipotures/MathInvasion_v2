// Main Event Handler - Delegates to sub-handlers
import Phaser from 'phaser';
import logger from '../../core/utils/Logger';
import debugState from '../../core/utils/DebugState'; // Import the shared debug state
import { EnemyEntity } from '../entities/EnemyEntity';
import eventBus from '../../core/events/EventBus'; // Import EventBus
import * as Events from '../../core/constants/events'; // Import Events
import * as Assets from '../../core/constants/assets'; // Import Assets
import { PlayerEventHandler } from './event/PlayerEventHandler';
import { ProjectileEventHandler } from './event/ProjectileEventHandler';
import { EnemyEventHandler } from './event/EnemyEventHandler';
import { PowerupSpawnedData } from '../../core/managers/PowerupManager'; // Import PowerupSpawnedData

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

  // References needed by sub-handlers
  private enemySpawnerTimerRef?: Phaser.Time.TimerEvent;
  // Add references needed for powerup handling
  private scene: Phaser.Scene;
  private powerupGroup: Phaser.GameObjects.Group;
  private powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>;

  constructor(
    scene: Phaser.Scene,
    playerSprite: Phaser.Physics.Arcade.Sprite,
    projectileGroup: Phaser.GameObjects.Group,
    enemyGroup: Phaser.GameObjects.Group,
    powerupGroup: Phaser.GameObjects.Group, // Add powerup group param
    enemySprites: Map<string, EnemyEntity>,
    projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite>,
    powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite> // Add powerup sprites map param
  ) {
    this.scene = scene; // Store scene reference
    this.powerupGroup = powerupGroup; // Store powerup group reference
    this.powerupSprites = powerupSprites; // Store powerup sprites map reference

    // Instantiate sub-handlers
    this.playerEventHandler = new PlayerEventHandler(scene, playerSprite);
    this.projectileEventHandler = new ProjectileEventHandler(
      scene,
      playerSprite,
      projectileGroup,
      projectileSprites
    );
    this.enemyEventHandler = new EnemyEventHandler(scene, enemyGroup, enemySprites);

    // Bind powerup handler
    this.handlePowerupSpawned = this.handlePowerupSpawned.bind(this);
    // Bind destruction effect handler
    this.handleEnemyDestructionEffect = this.handleEnemyDestructionEffect.bind(this);

    // Register listeners
    eventBus.on(Events.POWERUP_SPAWNED, this.handlePowerupSpawned);
    eventBus.on(Events.REQUEST_ENEMY_DESTRUCTION_EFFECT, this.handleEnemyDestructionEffect);

    logger.log(
      'GameSceneEventHandler initialized with sub-handlers and powerup/destruction listeners.'
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
      // Add case for 'cash_icon' if visual asset exists
      default:
        logger.warn(`Unknown powerup visual identifier: ${data.visual}`);
        // Use a default or fallback asset? For now, just return.
        return;
    }

    // Create the powerup sprite
    const powerupSprite = this.scene.physics.add.sprite(data.x, data.y, assetKey);
    powerupSprite.setScale(0.05); // Set much smaller scale for powerups
    powerupSprite.setVelocityY(50); // Give it some downward movement
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
    this.powerupSprites.set(data.instanceId, powerupSprite);

    // Set initial visibility based on debug mode
    powerupSprite.setVisible(!debugState.isDebugMode);

    // Play spawn sound
    this.scene.sound.play(Assets.AUDIO_POWERUP_APPEAR_KEY);
  }

  // --- Enemy Destruction Effect Handler ---

  private handleEnemyDestructionEffect(data: EnemyDestructionEffectData): void {
    logger.debug(
      `Handling REQUEST_ENEMY_DESTRUCTION_EFFECT for ${data.configId} at (${data.x}, ${data.y})`
    );

    // Play sound based on enemy type (can be expanded)
    // For now, use the generic small explosion sound
    this.scene.sound.play(Assets.AUDIO_EXPLOSION_SMALL_KEY);

    // Create visual effect based on enemy type (can be expanded)
    switch (data.configId) {
      case 'triangle_scout':
      case 'square_tank':
      case 'pentagon_healer':
      case 'hexagon_bomber':
      case 'diamond_strafer': {
        // TODO: Add simple particle effect or specific tween
        logger.log(`Playing standard destruction effect for ${data.configId}`);
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
        // TODO: Add larger, more impressive effect for boss
        logger.log(`Playing BOSS destruction effect for ${data.configId}`);
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

  /** Clean up event listeners by destroying sub-handlers and removing own listeners */
  public destroy(): void {
    this.playerEventHandler.destroy();
    this.projectileEventHandler.destroy();
    this.enemyEventHandler.destroy();
    eventBus.off(Events.POWERUP_SPAWNED, this.handlePowerupSpawned);
    eventBus.off(Events.REQUEST_ENEMY_DESTRUCTION_EFFECT, this.handleEnemyDestructionEffect); // Unregister destruction listener
    logger.log(
      'GameSceneEventHandler destroyed, called destroy on sub-handlers and removed listeners.'
    );
  }
}
// Removed all individual handle methods as they now reside in sub-handlers (except powerup)
// Removed all direct event listener registrations/unregistrations (except powerup)
