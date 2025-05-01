import EventBus, { EventBus as EventBusType } from '../events/EventBus';
import Logger, { Logger as LoggerType } from '../utils/Logger';
import { EnemyConfig, EnemiesConfig } from '../config/schemas/enemySchema';
import { DifficultyConfig } from '../config/schemas/difficultySchema';
import ConfigLoader from '../config/ConfigLoader';
import { EnemyWaveHandler } from './helpers/EnemyWaveHandler';
import { ENEMY_SPAWNED } from '../constants/events';
import { ENEMY_DESTROYED } from '../constants/events';
import { ENEMY_HEALTH_UPDATED } from '../constants/events';
import { PROJECTILE_HIT_ENEMY } from '../constants/events';

// Data expected for the PROJECTILE_HIT_ENEMY event
// TODO: Consider moving this interface to a shared types or events file
interface ProjectileHitEnemyData {
  projectileId: string;
  enemyInstanceId: string;
  damage: number;
}

// Data expected for the ENEMY_DESTROYED event
// Matches the payload structure emitted below
interface EnemyDestroyedData {
  instanceId: string;
  configId: string;
  reward: number;
  scoreValue: number;
  config: EnemyConfig; // Full config for other listeners (e.g., ability checks)
}

// TODO: Define a proper EnemyInstance type/interface
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
      this, // Pass reference to self
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

  // --- Spawning Logic (Delegates scaling to helper) ---
 
  public spawnEnemy(configId: string, position: { x: number; y: number }): void {
    const config = this.enemyConfigs.get(configId);
    if (!config) {
      this.logger.warn(`Attempted to spawn unknown enemy config ID: ${configId}`);
      return;
    }
  
    const scaledHealth = this.waveHandler.getScaledHealth(config.baseHealth);
    const speedMultiplier = this.waveHandler.getScaledSpeedMultiplier();
    const instanceId = `enemy-${this.nextInstanceId++}`;
    const newEnemy: EnemyInstance = {
      id: instanceId,
      configId: config.id,
      health: scaledHealth,
      creationTime: Date.now(),
    };
  
    this.enemies.set(instanceId, newEnemy);
    this.waveHandler.trackEnemyInWave(instanceId);
    this.logger.debug(
      `Spawning enemy: ${configId} (Instance ID: ${instanceId}) at (${position.x}, ${position.y}) with ${scaledHealth} health (Speed x${speedMultiplier.toFixed(2)})`
    );
  
    this.eventBus.emit(ENEMY_SPAWNED, {
      instanceId: newEnemy.id,
      config: config,
      position: position,
      initialHealth: scaledHealth,
      maxHealth: scaledHealth,
      speedMultiplier: speedMultiplier,
    });
  }

  // TODO: Implement method to handle enemy taking damage
  public handleDamage(instanceId: string, damage: number): void {
    const enemy = this.enemies.get(instanceId);
    if (!enemy) {
      this.logger.warn(`Attempted to damage unknown enemy instance ID: ${instanceId}`);
      return;
    }
  
    enemy.health -= damage;
    this.logger.debug(`Enemy ${instanceId} took ${damage} damage. Health: ${enemy.health}`);
  
    if (enemy.health <= 0) {
      this.destroyEnemy(instanceId);
    } else {
      const baseMaxHealth = this.enemyConfigs.get(enemy.configId)?.baseHealth;
      const scaledMaxHealth = baseMaxHealth
        ? this.waveHandler.getScaledHealth(baseMaxHealth)
        : enemy.health;
      this.eventBus.emit(ENEMY_HEALTH_UPDATED, {
        instanceId: enemy.id,
        currentHealth: enemy.health,
        maxHealth: scaledMaxHealth,
      });
    }
  }

  // TODO: Implement method to destroy an enemy
  public destroyEnemy(instanceId: string): void {
    const enemy = this.enemies.get(instanceId);
    if (!enemy) {
      this.logger.warn(`Attempted to destroy unknown enemy instance ID: ${instanceId}`);
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
      config: config as EnemyConfig,
    };
    this.eventBus.emit(ENEMY_DESTROYED, eventData);
  
    this.waveHandler.handleEnemyDestroyedInWave(instanceId);
  }

  /**
   * Retrieves the current health of a specific enemy instance.
   * @param instanceId The unique ID of the enemy instance.
   * @returns The current health of the enemy, or 0 if not found.
   */
  public getEnemyHealth(instanceId: string): number {
    const enemy = this.enemies.get(instanceId);
    if (!enemy) {
      this.logger.warn(`getEnemyHealth called for unknown or destroyed enemy: ${instanceId}`);
      return 0;
    }
    return enemy.health;
  }

  /**
   * Retrieves the creation timestamp of a specific enemy instance.
   * @param instanceId The unique ID of the enemy instance.
   * @returns The creation timestamp (ms since epoch), or undefined if not found.
   */
  public getEnemyCreationTime(instanceId: string): number | undefined {
    return this.enemies.get(instanceId)?.creationTime;
  }
 
  /**
   * Retrieves the configuration ID (e.g., 'triangle_scout') for a specific enemy instance.
   * @param instanceId The unique ID of the enemy instance.
   * @returns The configuration ID, or undefined if not found.
   */
  public getEnemyConfigId(instanceId: string): string | undefined {
    return this.enemies.get(instanceId)?.configId;
  }
 
  // Position and Velocity are not tracked directly by the manager.
  // DebugObjectInspector must get this from the Phaser sprite/body.

  private handleProjectileHitEnemy(data: ProjectileHitEnemyData): void {
    const damage = data.damage;
    this.logger.debug(
      `Enemy ${data.enemyInstanceId} hit by projectile ${data.projectileId}. Applying ${damage} damage.`
    );
    this.handleDamage(data.enemyInstanceId, damage);
  }

  private registerEventListeners(): void {
    this.handleProjectileHitEnemy = this.handleProjectileHitEnemy.bind(this);
    this.eventBus.on(PROJECTILE_HIT_ENEMY, this.handleProjectileHitEnemy);
  }

  // TODO: Add methods for updating enemy state, movement patterns, etc.
 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(delta: number): void {
  }

  /** Clean up event listeners and timers when the manager is destroyed */
  public destroy(): void {
    this.eventBus.off(PROJECTILE_HIT_ENEMY, this.handleProjectileHitEnemy);
    this.waveHandler.destroy();
    this.enemies.clear();
    this.enemyConfigs.clear();
    this.logger.log('EnemyManager destroyed, listeners and timers removed');
  }

  /** Gets the current wave number from the handler */
  public getCurrentWave(): number {
    return this.waveHandler.getCurrentWave();
  }
}
