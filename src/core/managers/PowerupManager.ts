import { EventBus } from '../events/EventBus';
import { Logger } from '../utils/Logger';
import { PowerupsConfig, PowerupConfig } from '../config/schemas/powerupSchema';
import * as Events from '../constants/events';

export interface RequestSpawnPowerupData {
  x: number;
  y: number;
  enemyId: string; // ID of the enemy that dropped it (for potential future logic)
  powerupId?: string; // Optional ID to specify which powerup to spawn
}

export interface PowerupSpawnedData {
  instanceId: string; // Changed to string
  configId: string;
  x: number;
  y: number;
  visual: string;
}

export interface PowerupCollectedData {
  instanceId: string; // Changed to string
}

// Interface for the new event payload
export interface PowerupOutOfBoundsData {
  instanceId: string; // Changed to string
}

export interface PowerupEffectData {
  configId: string;
  effect: string;
  multiplier?: number; // Optional multiplier
  durationMs: number;
}

interface ActivePowerupEffect {
  config: PowerupConfig;
  timer: number; // Remaining duration in ms
  // Add other relevant state if needed
}

interface SpawnedPowerupInstance {
  instanceId: string; // Changed to string
  config: PowerupConfig;
  x: number;
  y: number;
  creationTime: number;
}

export class PowerupManager {
  private eventBus: EventBus;
  private logger: Logger;
  private powerupsConfig: PowerupsConfig;
  private spawnedPowerups: Map<string, SpawnedPowerupInstance> = new Map(); // Changed key to string
  private activeEffects: Map<string, ActivePowerupEffect> = new Map(); // Keyed by effect type
  private nextNumericInstanceId = 0; // Renamed for clarity

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
    this.eventBus.on(Events.POWERUP_OUT_OF_BOUNDS, this.handlePowerupOutOfBounds.bind(this)); // Added listener
    // Add listener for ENEMY_DESTROYED if drop logic is handled here
  }

  private handleRequestSpawnPowerup(data: RequestSpawnPowerupData): void {
    if (!this.powerupsConfig || this.powerupsConfig.length === 0) {
      this.logger.warn('Received REQUEST_SPAWN_POWERUP but no powerup configurations are loaded.');
      return;
    }

    let selectedPowerupConfig: PowerupConfig | undefined;

    // If a specific powerupId is provided, use that one
    if (data.powerupId) {
      selectedPowerupConfig = this.powerupsConfig.find(p => p.id === data.powerupId);
      if (!selectedPowerupConfig) {
        this.logger.warn(`Specified powerupId ${data.powerupId} not found. Selecting random powerup.`);
      }
    }

    // If no specific powerup was found or requested, select a random one
    if (!selectedPowerupConfig) {
      const randomIndex = Math.floor(Math.random() * this.powerupsConfig.length);
      selectedPowerupConfig = this.powerupsConfig[randomIndex];
    }


    // Ensure a config was actually selected (should always happen if config exists)
    if (selectedPowerupConfig) {
      const numericId = this.nextNumericInstanceId++;
      const instanceId = `powerup_${numericId}`; // Create string ID
      const spawnedInstance: SpawnedPowerupInstance = {
        instanceId, // Use string ID
        config: selectedPowerupConfig,
        x: data.x,
        y: data.y,
        creationTime: Date.now(),
      };
      this.spawnedPowerups.set(instanceId, spawnedInstance);

      const eventData: PowerupSpawnedData = {
        instanceId,
        configId: selectedPowerupConfig.id,
        x: data.x,
        y: data.y,
        visual: selectedPowerupConfig.visual,
      };
      this.eventBus.emit(Events.POWERUP_SPAWNED, eventData);
      this.logger.debug(
        `Powerup spawned: ${selectedPowerupConfig.name} (Instance ID: ${instanceId}) at (${data.x}, ${data.y})`
      );
    } else {
      this.logger.error('Failed to select a powerup config despite having loaded configurations.');
    }
  }

  private handlePowerupCollected(data: PowerupCollectedData): void {
    // data.instanceId is now string 'powerup_X'
    const spawnedInstance = this.spawnedPowerups.get(data.instanceId);
    // Removed diagnostic log
    if (spawnedInstance) {
      this.logger.log(
        `Powerup collected: ${spawnedInstance.config.name} (Instance ID: ${data.instanceId})`
      );
      this.applyEffect(spawnedInstance.config);
      this.spawnedPowerups.delete(data.instanceId);
    } else {
      this.logger.warn(`Collected powerup instance not found: ${data.instanceId}`);
    }
  }

  private handlePowerupOutOfBounds(data: PowerupOutOfBoundsData): void { // Use specific interface
    // data.instanceId is now string 'powerup_X'
    if (this.spawnedPowerups.has(data.instanceId)) {
      this.logger.debug(`Removing out-of-bounds powerup instance: ${data.instanceId}`);
      this.spawnedPowerups.delete(data.instanceId);
    } else {
      // This might happen if collected and went OOB in the same frame, less likely
      this.logger.warn(`Received POWERUP_OUT_OF_BOUNDS for unknown instance: ${data.instanceId}`);
    }
  }

  private applyEffect(config: PowerupConfig): void {
    const effectType = config.effect;

    const existingEffect = this.activeEffects.get(effectType);
    // Removed diagnostic log
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
        durationMs: effect.config.durationMs,
      };
      this.eventBus.emit(Events.POWERUP_EFFECT_REMOVED, eventData);
      this.activeEffects.delete(effectType);
      this.eventBus.emit(Events.POWERUP_EXPIRED, { configId: effect.config.id });
    }
  }

  // Accept string ID 'powerup_X'
  public getPowerupCreationTime(instanceId: string): number | undefined {
    return this.spawnedPowerups.get(instanceId)?.creationTime;
  }

  // Accept string ID 'powerup_X'
  public getPowerupState(instanceId: string): SpawnedPowerupInstance | undefined {
    return this.spawnedPowerups.get(instanceId);
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
    this.eventBus.off(Events.POWERUP_OUT_OF_BOUNDS, this.handlePowerupOutOfBounds.bind(this)); // Added unregister
  }
}
