import Phaser from 'phaser';
import eventBus from '../../../core/events/EventBus';
import logger from '../../../core/utils/Logger';
import debugState from '../../../core/utils/DebugState'; // Import the shared debug state
import { EnemyEntity } from '../../entities/EnemyEntity';
import { EnemyConfig } from '../../../core/config/schemas/enemySchema';
import { PowerupsConfig } from '../../../core/config/schemas/powerupSchema'; // Import powerup types (Removed unused PowerupConfig)
import configLoader from '../../../core/config/ConfigLoader'; // Import config loader
import * as Events from '../../../core/constants/events';
import * as Assets from '../../../core/constants/assets';
import { RequestSpawnPowerupData } from '../../../core/managers/PowerupManager'; // Import event data type

// Define the structure for the ENEMY_DESTROYED event data
interface EnemyDestroyedData {
  instanceId: string;
  configId: string;
  reward: number;
  config: EnemyConfig; // The full config is now included
}

// Define the structure for the ENEMY_SPAWNED event data (including new fields)
interface EnemySpawnedData {
  instanceId: string;
  config: EnemyConfig;
  position: { x: number; y: number };
  initialHealth: number; // Now represents scaled health
  maxHealth: number; // Scaled max health
  speedMultiplier: number; // Scaled speed multiplier
}

export class EnemyEventHandler {
  private scene: Phaser.Scene;
  private sound: Phaser.Sound.BaseSoundManager;
  private enemyGroup: Phaser.GameObjects.Group;
  private enemySprites: Map<string, EnemyEntity>;

  constructor(
    scene: Phaser.Scene,
    enemyGroup: Phaser.GameObjects.Group,
    enemySprites: Map<string, EnemyEntity>
  ) {
    this.scene = scene;
    this.sound = scene.sound;
    this.enemyGroup = enemyGroup;
    this.enemySprites = enemySprites;

    // Bind methods
    this.handleEnemySpawned = this.handleEnemySpawned.bind(this);
    this.handleEnemyDestroyed = this.handleEnemyDestroyed.bind(this);
    this.handleEnemyHealthUpdate = this.handleEnemyHealthUpdate.bind(this);

    // Register listeners
    eventBus.on(Events.ENEMY_SPAWNED, this.handleEnemySpawned);
    eventBus.on(Events.ENEMY_DESTROYED, this.handleEnemyDestroyed);
    eventBus.on(Events.ENEMY_HEALTH_UPDATED, this.handleEnemyHealthUpdate);
  }

  // --- Event Handlers ---

  public handleEnemySpawned(data: EnemySpawnedData): void {
    let enemyAssetKey: string;
    switch (data.config.id) {
      case 'triangle_scout':
        enemyAssetKey = Assets.ENEMY_SMALL_ALIEN_KEY;
        break;
      case 'square_tank':
      case 'pentagon_healer': // TODO: Needs own asset?
        enemyAssetKey = Assets.ENEMY_MEDIUM_ALIEN_KEY;
        break;
      case 'hexagon_bomber':
        enemyAssetKey = Assets.ENEMY_HEXAGON_BOMBER_KEY;
        break;
      case 'diamond_strafer':
        enemyAssetKey = Assets.ENEMY_DIAMOND_STRAFER_KEY;
        break;
      case 'circle_boss': // TODO: Needs own asset?
        enemyAssetKey = Assets.ENEMY_LARGE_METEOR_KEY;
        break;
      default:
        enemyAssetKey = Assets.ENEMY_SMALL_ALIEN_KEY; // Fallback
        logger.warn(`Unknown enemy config ID: ${data.config.id}`);
    }
    const enemyEntity = new EnemyEntity(
      this.scene,
      data.position.x,
      data.position.y,
      enemyAssetKey,
      data.instanceId,
      data.config,
      data.maxHealth, // Pass scaled max health
      data.speedMultiplier // Pass speed multiplier
    );
    this.enemyGroup.add(enemyEntity);
    this.enemySprites.set(data.instanceId, enemyEntity);

    // Set initial visibility based on debug mode
    enemyEntity.setVisible(!debugState.isDebugMode);
  }

  public handleEnemyDestroyed(data: EnemyDestroyedData): void {
    const enemyEntity = this.enemySprites.get(data.instanceId);
    if (enemyEntity) {
      const enemyConfig = data.config;
      // Store position *before* destroying the entity
      const enemyPosition = { x: enemyEntity.x, y: enemyEntity.y };

      // Sound and visual effect are now handled by the listener for REQUEST_ENEMY_DESTRUCTION_EFFECT
      enemyEntity.destroySelf(); // Destroy visual representation (which now emits the effect request)
      this.enemySprites.delete(data.instanceId); // Remove from tracking map

      // Check for death bomb ability
      const deathBombAbility = enemyConfig?.abilities?.find(
        (ability) => ability.type === 'death_bomb'
      );
      if (deathBombAbility && deathBombAbility.type === 'death_bomb') {
        logger.debug(`Enemy ${data.instanceId} triggering death bomb.`);
        eventBus.emit(Events.SPAWN_PROJECTILE, {
          type: deathBombAbility.projectileType,
          x: enemyPosition.x,
          y: enemyPosition.y,
          velocityX: 0,
          velocityY: 0,
          damage: deathBombAbility.damage,
          owner: 'enemy',
          radius: deathBombAbility.radius ?? 50,
          timeToExplodeMs: deathBombAbility.timeToExplodeMs ?? 500,
          // Add the missing config - pass the ability object itself
          enemyShootConfig: deathBombAbility
        });
      }

      // --- Check for Powerup Drop ---
      this.trySpawnPowerup(enemyConfig, enemyPosition);
    } else {
      logger.warn(`Could not find enemy entity to destroy: ID ${data.instanceId}`);
    }
  }

  // Updated to expect maxHealth in the payload
  public handleEnemyHealthUpdate(data: {
    instanceId: string;
    currentHealth: number;
    maxHealth: number;
  }): void {
    const enemyEntity = this.enemySprites.get(data.instanceId);
    // Pass maxHealth to takeDamage if needed for visual effects (e.g., health bar update)
    enemyEntity?.takeDamage(0, data.maxHealth); // Trigger visual effect, pass max health
  }

  // --- Helper Methods ---

  private trySpawnPowerup(enemyConfig: EnemyConfig, position: { x: number; y: number }): void {
    const powerupsConfig: PowerupsConfig = configLoader.getPowerupsConfig();
    let powerupDropped = false; // Flag to ensure only one powerup drops per enemy (optional)

    for (const powerupConfig of powerupsConfig) {
      if (powerupDropped) break; // Only allow one drop

      const dropChance = powerupConfig.dropChance ?? 0; // Default to 0 if undefined
      if (Math.random() <= dropChance) {
        logger.debug(
          `Enemy ${enemyConfig.id} dropped powerup: ${powerupConfig.id} (Chance: ${dropChance})`
        );

        const eventData: RequestSpawnPowerupData = {
          x: position.x,
          y: position.y,
          enemyId: enemyConfig.id, // Pass enemy ID for potential future logic
          // We don't specify *which* powerup here; PowerupManager decides based on its logic (currently hardcoded)
          // If we wanted specific enemies to drop specific powerups, we'd need more complex logic here or in PowerupManager
        };
        eventBus.emit(Events.REQUEST_SPAWN_POWERUP, eventData);
        powerupDropped = true; // Set flag
      }
    }
  }

  /** Clean up event listeners */
  public destroy(): void {
    eventBus.off(Events.ENEMY_SPAWNED, this.handleEnemySpawned);
    eventBus.off(Events.ENEMY_DESTROYED, this.handleEnemyDestroyed);
    eventBus.off(Events.ENEMY_HEALTH_UPDATED, this.handleEnemyHealthUpdate);
    logger.log('EnemyEventHandler destroyed and listeners removed');
  }
}
