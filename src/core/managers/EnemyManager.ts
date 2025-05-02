import EventBus, { EventBus as EventBusType } from '../events/EventBus';
import Logger, { Logger as LoggerType } from '../utils/Logger';
import { EnemyConfig, EnemiesConfig } from '../config/schemas/enemySchema';
import { DifficultyConfig } from '../config/schemas/difficultySchema';
import ConfigLoader from '../config/ConfigLoader';
import { EnemyWaveHandler } from './helpers/EnemyWaveHandler';
import {
    ENEMY_SPAWNED,
    ENEMY_DESTROYED,
    ENEMY_HEALTH_UPDATED,
    PROJECTILE_HIT_ENEMY,
    // APPLY_SLOW_EFFECT, // Manager no longer needs to listen directly
} from '../constants/events';

// Data expected for the PROJECTILE_HIT_ENEMY event
interface ProjectileHitEnemyData {
  projectileId: string;
  enemyInstanceId: string;
  damage: number;
}

// Data expected for the ENEMY_DESTROYED event
interface EnemyDestroyedData {
  instanceId: string;
  configId: string;
  reward: number;
  scoreValue: number;
  config: EnemyConfig;
}

// Basic info tracked by the manager
interface EnemyInstance {
  id: string;
  configId: string;
  health: number;
  creationTime: number;
}

export class EnemyManager {
  private enemies: Map<string, EnemyInstance> = new Map();
  private nextInstanceId = 0;
  private enemyConfigs: Map<string, EnemyConfig>;
  private difficultyConfig: DifficultyConfig;
  private waveHandler: EnemyWaveHandler;

  constructor(
    private eventBus: EventBusType = EventBus,
    private logger: LoggerType = Logger
  ) {
    this.enemyConfigs = this.loadEnemyConfigs();
    this.difficultyConfig = this.loadDifficultyConfig();

    this.waveHandler = new EnemyWaveHandler(
      this,
      this.difficultyConfig,
      this.eventBus,
      this.logger
    );

    this.registerEventListeners();
    this.logger.log('EnemyManager initialized');
    this.waveHandler.start();
  }

  private loadEnemyConfigs(): Map<string, EnemyConfig> {
    try {
      const configs: EnemiesConfig = ConfigLoader.getEnemiesConfig();
      const map = new Map<string, EnemyConfig>();
      configs.forEach((config: EnemyConfig) => {
        map.set(config.id, config);
      });
      this.logger.log(`Loaded ${map.size} enemy configurations.`);
      return map;
    } catch (error) {
      this.logger.error('Failed to load enemy configurations:', error);
      throw new Error('Enemy configuration loading failed.');
    }
  }

  private loadDifficultyConfig(): DifficultyConfig {
    try {
      const config = ConfigLoader.getDifficultyConfig();
      this.logger.log('Loaded difficulty configuration.');
      return config;
    } catch (error) {
      this.logger.error('Failed to load difficulty configuration:', error);
      throw new Error('Difficulty configuration is essential and failed to load.');
    }
  }

  public spawnEnemy(configId: string, position: { x: number; y: number }): void {
    const config = this.enemyConfigs.get(configId);
    if (!config) {
      this.logger.warn(`Attempted to spawn unknown enemy config ID: ${configId}`);
      return;
    }

    const scaledHealth = this.waveHandler.getScaledHealth(config.baseHealth);
    const speedMultiplier = this.waveHandler.getScaledSpeedMultiplier(); // Base speed multiplier from wave
    const instanceId = `enemy-${this.nextInstanceId++}`;
    const newEnemy: EnemyInstance = { // Only store basic info
      id: instanceId,
      configId: config.id,
      health: scaledHealth,
      creationTime: Date.now(),
    };

    this.enemies.set(instanceId, newEnemy);
    this.waveHandler.trackEnemyInWave(instanceId);
    this.logger.debug(
      `Spawning enemy: ${configId} (Instance ID: ${instanceId}) at (${position.x}, ${position.y}) with ${scaledHealth} health (Base Speed x${speedMultiplier.toFixed(2)})`
    );

    // Emit event for GameScene to create the EnemyEntity GameObject
    // Pass the manager instance so the Entity can reference it if needed (though maybe not for slow anymore)
    // Pass the base speed multiplier; the Entity will handle its own slow state.
    this.eventBus.emit(ENEMY_SPAWNED, {
      instanceId: newEnemy.id,
      config: config,
      position: position,
      initialHealth: scaledHealth,
      maxHealth: scaledHealth,
      speedMultiplier: speedMultiplier, // Pass the base multiplier
      enemyManager: this, // Pass manager reference
    });
  }

  public handleDamage(instanceId: string, damage: number): void {
    const enemy = this.enemies.get(instanceId);
    if (!enemy) {
      return;
    }

    enemy.health -= damage;

    if (enemy.health <= 0) {
      this.destroyEnemy(instanceId);
    } else {
      const baseMaxHealth = this.enemyConfigs.get(enemy.configId)?.baseHealth;
      const scaledMaxHealth = baseMaxHealth
        ? this.waveHandler.getScaledHealth(baseMaxHealth)
        : enemy.health; // Fallback, though should have baseMaxHealth
      this.eventBus.emit(ENEMY_HEALTH_UPDATED, {
        instanceId: enemy.id,
        currentHealth: enemy.health,
        maxHealth: scaledMaxHealth,
      });
    }
  }

  public destroyEnemy(instanceId: string): void {
    const enemy = this.enemies.get(instanceId);
    if (!enemy) {
      return;
    }

    const config = this.enemyConfigs.get(enemy.configId);
    const baseReward = config?.baseReward ?? 0;
    const scaledReward = this.waveHandler.getScaledReward(baseReward);
    const scoreValue = config?.scoreValue ?? 0;

    this.enemies.delete(instanceId);
    this.logger.log(`Destroyed enemy: ${enemy.configId} (Instance ID: ${instanceId})`);

    const eventData: EnemyDestroyedData = {
      instanceId: instanceId,
      configId: enemy.configId,
      reward: scaledReward,
      scoreValue: scoreValue,
      config: config as EnemyConfig, // Assume config exists if enemy existed
    };
    this.eventBus.emit(ENEMY_DESTROYED, eventData);

    this.waveHandler.handleEnemyDestroyedInWave(instanceId);
  }

  // --- Event Handlers ---

  private handleProjectileHitEnemy(data: ProjectileHitEnemyData): void {
    const damage = data.damage;
    // Removed redundant logging, handleDamage is sufficient
    this.handleDamage(data.enemyInstanceId, damage);
  }

  // Removed handleApplySlowEffect - EnemyEntity will handle it

  // --- Getters needed by Inspector ---
  public getEnemyHealth(instanceId: string): number | undefined {
      return this.enemies.get(instanceId)?.health;
  }

  public getEnemyCreationTime(instanceId: string): number | undefined {
      return this.enemies.get(instanceId)?.creationTime;
  }
  // --- End Getters ---

  private registerEventListeners(): void {
    this.handleProjectileHitEnemy = this.handleProjectileHitEnemy.bind(this);
    this.eventBus.on(PROJECTILE_HIT_ENEMY, this.handleProjectileHitEnemy);
    // Removed listener for APPLY_SLOW_EFFECT
  }

  // --- Update Loop ---
  public update(delta: number): void {
    // Manager update loop is now empty.
    // EnemyEntity instances handle their own updates (movement, slow expiry).
    // WaveHandler handles wave progression.
  }

  // --- Cleanup ---
  public destroy(): void {
    this.eventBus.off(PROJECTILE_HIT_ENEMY, this.handleProjectileHitEnemy);
    // Removed unregister for APPLY_SLOW_EFFECT
    this.waveHandler.destroy();
    this.enemies.clear();
    this.enemyConfigs.clear();
    this.logger.log('EnemyManager destroyed, listeners and timers removed');
  }

  // --- Getters ---
  public getCurrentWave(): number {
    return this.waveHandler.getCurrentWave();
  }

  // Removed getEffectiveSpeedMultiplier - no longer needed here
}
