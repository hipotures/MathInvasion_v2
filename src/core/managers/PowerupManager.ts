import { EventBus } from '../events/EventBus';
import { Logger } from '../utils/Logger';
import { PowerupsConfig, PowerupConfig } from '../config/schemas/powerupSchema';
import * as Events from '../constants/events';

// Interface for data when requesting a powerup spawn
export interface RequestSpawnPowerupData {
  x: number;
  y: number;
  enemyId: string; // ID of the enemy that dropped it (for potential future logic)
}

// Interface for data when a powerup is spawned (for the scene)
export interface PowerupSpawnedData {
  instanceId: number; // Unique ID for this specific powerup instance
  configId: string; // ID from the powerup config (e.g., 'shield')
  x: number;
  y: number;
  visual: string; // Visual key from config
}

// Interface for data when a powerup is collected
export interface PowerupCollectedData {
  instanceId: number;
}

// Interface for data when an effect is applied or removed
export interface PowerupEffectData {
  configId: string;
  effect: string; // Effect identifier from config
  multiplier?: number; // Optional multiplier
  durationMs: number;
}

// Internal state for an active powerup effect
interface ActivePowerupEffect {
  config: PowerupConfig;
  timer: number; // Remaining duration in ms
  // Add other relevant state if needed
}

// Internal state for a spawned powerup instance on the map
interface SpawnedPowerupInstance {
  instanceId: number;
  config: PowerupConfig;
  x: number;
  y: number;
  creationTime: number; // Timestamp when spawned
}

export class PowerupManager {
  private eventBus: EventBus;
  private logger: Logger;
  private powerupsConfig: PowerupsConfig;
  private spawnedPowerups: Map<number, SpawnedPowerupInstance> = new Map();
  private activeEffects: Map<string, ActivePowerupEffect> = new Map(); // Keyed by effect type
  private nextInstanceId = 0;

  constructor(eventBus: EventBus, logger: Logger, powerupsConfig: PowerupsConfig) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.powerupsConfig = powerupsConfig;
    this.logger.log('PowerupManager initialized.');
  }

  public init(): void {
    this.registerListeners();
    this.logger.log('PowerupManager listeners registered.');
  }

  public update(delta: number): void {
    // Update timers for active effects
    const dtMillis = delta; // Assuming delta is in milliseconds from Phaser
    const expiredEffects: string[] = [];

    this.activeEffects.forEach((effect, effectType) => {
      effect.timer -= dtMillis;
      if (effect.timer <= 0) {
        expiredEffects.push(effectType);
      }
    });

    expiredEffects.forEach((effectType) => {
      this.removeEffect(effectType);
    });
  }

  private registerListeners(): void {
    this.eventBus.on(Events.REQUEST_SPAWN_POWERUP, this.handleRequestSpawnPowerup.bind(this));
    this.eventBus.on(Events.POWERUP_COLLECTED, this.handlePowerupCollected.bind(this));
    // Add listener for ENEMY_DESTROYED if drop logic is handled here
  }

  private handleRequestSpawnPowerup(data: RequestSpawnPowerupData): void {
    // The decision to drop *a* powerup was made by the EnemyEventHandler based on individual chances.
    // Now, we just need to pick *which* powerup to spawn from the available list.
    // A simple approach is to pick one randomly. More complex logic could weigh choices.
    if (!this.powerupsConfig || this.powerupsConfig.length === 0) {
      this.logger.warn('Received REQUEST_SPAWN_POWERUP but no powerup configurations are loaded.');
      return;
    }

    // Randomly select a powerup config from the loaded list
    const randomIndex = Math.floor(Math.random() * this.powerupsConfig.length);
    const selectedPowerupConfig = this.powerupsConfig[randomIndex];

    if (selectedPowerupConfig) {
      const instanceId = this.nextInstanceId++;
      const spawnedInstance: SpawnedPowerupInstance = {
        instanceId,
        config: selectedPowerupConfig, // Use the randomly selected config
        x: data.x,
        y: data.y,
        creationTime: Date.now(), // Record creation time
      };
      this.spawnedPowerups.set(instanceId, spawnedInstance);

      const eventData: PowerupSpawnedData = {
        instanceId,
        configId: selectedPowerupConfig.id, // Use selected config ID
        x: data.x,
        y: data.y,
        visual: selectedPowerupConfig.visual, // Use selected visual
      };
      this.eventBus.emit(Events.POWERUP_SPAWNED, eventData);
      this.logger.debug(
        `Powerup spawned: ${selectedPowerupConfig.name} (Instance ID: ${instanceId}) at (${data.x}, ${data.y})`
      );
    } else {
      // This case should theoretically not happen if the config array is not empty, but good to have a fallback log.
      this.logger.error('Failed to select a powerup config despite having loaded configurations.');
    }
  }

  private handlePowerupCollected(data: PowerupCollectedData): void {
    const spawnedInstance = this.spawnedPowerups.get(data.instanceId);
    if (spawnedInstance) {
      this.logger.log(
        `Powerup collected: ${spawnedInstance.config.name} (Instance ID: ${data.instanceId})`
      );
      this.applyEffect(spawnedInstance.config);
      this.spawnedPowerups.delete(data.instanceId);
      // Note: The scene handler is responsible for destroying the sprite via POWERUP_COLLECTED event
    } else {
      this.logger.warn(`Collected powerup instance not found: ${data.instanceId}`);
    }
  }

  private applyEffect(config: PowerupConfig): void {
    const effectType = config.effect;

    // If an effect of the same type is already active, reset its timer
    const existingEffect = this.activeEffects.get(effectType);
    if (existingEffect) {
      this.logger.debug(`Resetting timer for active effect: ${effectType}`);
      existingEffect.timer = config.durationMs;
    } else {
      this.logger.log(`Applying powerup effect: ${effectType}`);
      const newEffect: ActivePowerupEffect = {
        config: config,
        timer: config.durationMs,
      };
      this.activeEffects.set(effectType, newEffect);

      const eventData: PowerupEffectData = {
        configId: config.id,
        effect: config.effect,
        multiplier: config.multiplier,
        durationMs: config.durationMs,
      };
      this.eventBus.emit(Events.POWERUP_EFFECT_APPLIED, eventData);
    }
  }

  private removeEffect(effectType: string): void {
    const effect = this.activeEffects.get(effectType);
    if (effect) {
      this.logger.log(`Removing powerup effect: ${effectType}`);
      const eventData: PowerupEffectData = {
        configId: effect.config.id,
        effect: effect.config.effect,
        multiplier: effect.config.multiplier,
        durationMs: effect.config.durationMs, // Pass original duration for reference
      };
      this.eventBus.emit(Events.POWERUP_EFFECT_REMOVED, eventData);
      this.activeEffects.delete(effectType);
      // Also emit POWERUP_EXPIRED for potential UI updates?
      this.eventBus.emit(Events.POWERUP_EXPIRED, { configId: effect.config.id });
    }
  }

  /**
   * Retrieves the creation timestamp of a specific spawned powerup instance.
   * @param instanceId The unique ID of the powerup instance.
   * @returns The creation timestamp (milliseconds since epoch), or undefined if not found.
   */
  public getPowerupCreationTime(instanceId: number): number | undefined {
    return this.spawnedPowerups.get(instanceId)?.creationTime;
  }

  public destroy(): void {
    this.unregisterListeners();
    this.spawnedPowerups.clear();
    this.activeEffects.clear();
    this.logger.log('PowerupManager destroyed.');
  }

  private unregisterListeners(): void {
    this.eventBus.off(Events.REQUEST_SPAWN_POWERUP, this.handleRequestSpawnPowerup.bind(this));
    this.eventBus.off(Events.POWERUP_COLLECTED, this.handlePowerupCollected.bind(this));
  }
}
