import EventBus, { EventBus as EventBusType } from '../events/EventBus';
import Logger, { Logger as LoggerType } from '../utils/Logger';
import { EnemyConfig, EnemiesConfig } from '../config/schemas/enemySchema';
import { DifficultyConfig } from '../config/schemas/difficultySchema';
import ConfigLoader from '../config/ConfigLoader';
import { EnemyWaveHandler } from './helpers/EnemyWaveHandler'; // Import the helper
// Event constants
import { ENEMY_SPAWNED } from '../constants/events';

import { ENEMY_DESTROYED } from '../constants/events';

import { ENEMY_HEALTH_UPDATED } from '../constants/events';
import { PROJECTILE_HIT_ENEMY } from '../constants/events';
// WAVE_UPDATED is emitted by EnemyWaveHandler now

/** Defines the data expected for the PROJECTILE_HIT_ENEMY event */
// Note: This interface might be better placed in a shared types file or events.ts
interface ProjectileHitEnemyData {
  projectileId: string;
  enemyInstanceId: string;
  damage: number; // Damage is now expected from the event payload
}

/** Defines the data expected for the ENEMY_DESTROYED event */
// Note: This interface should match the payload structure emitted below.
interface EnemyDestroyedData {
  instanceId: string;
  configId: string;
  reward: number;
  scoreValue: number; // Explicitly include score value
  config: EnemyConfig; // Keep full config for other listeners (e.g., ability checks)
}

// TODO: Define a proper EnemyInstance type/interface
interface EnemyInstance {
  id: string; // Unique instance ID
  configId: string; // ID from config (e.g., 'triangle_scout')
  health: number;
  creationTime: number; // Timestamp when the instance was created
  // Add other relevant state properties like position, velocity etc. later
}

// WaveUpdateData interface removed as WAVE_UPDATED is handled by EnemyWaveHandler

export class EnemyManager {
  private enemies: Map<string, EnemyInstance> = new Map();
  private nextInstanceId = 0;
  private enemyConfigs: Map<string, EnemyConfig>;
  private difficultyConfig: DifficultyConfig; // Keep for passing to helper
  private waveHandler: EnemyWaveHandler; // Instance of the helper

  constructor(
    private eventBus: EventBusType = EventBus,
    private logger: LoggerType = Logger
  ) {
    // Load configs immediately in constructor
    this.enemyConfigs = this.loadEnemyConfigs();
    this.difficultyConfig = this.loadDifficultyConfig();

    // Instantiate the helper
    this.waveHandler = new EnemyWaveHandler(
      this, // Pass reference to self
      this.difficultyConfig,
      this.eventBus,
      this.logger
    );

    this.registerEventListeners();
    this.logger.log('EnemyManager initialized');
    // Start the wave handler *after* it's assigned
    this.waveHandler.start();
  } // <<< ADDED MISSING BRACE

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
      // Provide a default or throw error to prevent game start
      throw new Error('Difficulty configuration is essential and failed to load.');
    }
  }

  // --- Spawning Logic (Now delegates scaling to helper) ---

  public spawnEnemy(configId: string, position: { x: number; y: number }): void {
    const config = this.enemyConfigs.get(configId);
    if (!config) {
      this.logger.warn(`Attempted to spawn unknown enemy config ID: ${configId}`);
      return;
    }

    // Get scaled values from the helper
    const scaledHealth = this.waveHandler.getScaledHealth(config.baseHealth);
    const speedMultiplier = this.waveHandler.getScaledSpeedMultiplier();
    const instanceId = `enemy-${this.nextInstanceId++}`;
    const newEnemy: EnemyInstance = {
      id: instanceId,
      configId: config.id,
      health: scaledHealth,
      creationTime: Date.now(), // Record creation time
    };

    this.enemies.set(instanceId, newEnemy);
    // Notify the helper to track this enemy if a wave is active
    this.waveHandler.trackEnemyInWave(instanceId);
    this.logger.debug(
      `Spawning enemy: ${configId} (Instance ID: ${instanceId}) at (${position.x}, ${position.y}) with ${scaledHealth} health (Speed x${speedMultiplier.toFixed(2)})`
    );

    // Emit an event for the GameScene to create the actual Phaser sprite/body
    // Include scaled health as both initial and max for UI consistency
    // Pass speed multiplier for EnemyEntity to use
    this.eventBus.emit(ENEMY_SPAWNED, {
      instanceId: newEnemy.id,
      config: config,
      position: position,
      initialHealth: scaledHealth, // Send scaled health
      maxHealth: scaledHealth, // Send scaled health as max
      speedMultiplier: speedMultiplier, // Pass scaled speed multiplier
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
      // Emit event for health update if needed by UI or effects
      const baseMaxHealth = this.enemyConfigs.get(enemy.configId)?.baseHealth;
      // Get scaled max health from helper
      const scaledMaxHealth = baseMaxHealth
        ? this.waveHandler.getScaledHealth(baseMaxHealth)
        : enemy.health;
      this.eventBus.emit(ENEMY_HEALTH_UPDATED, {
        instanceId: enemy.id,
        currentHealth: enemy.health,
        maxHealth: scaledMaxHealth, // Provide scaled max health for UI
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
    // Get scaled reward from helper
    const scaledReward = this.waveHandler.getScaledReward(baseReward);
    const scoreValue = config?.scoreValue ?? 0;

    this.enemies.delete(instanceId);
    this.logger.log(`Destroyed enemy: ${enemy.configId} (Instance ID: ${instanceId})`);

    // Emit event for GameScene to remove sprite/body and handle abilities
    const eventData: EnemyDestroyedData = {
      instanceId: instanceId,
      configId: enemy.configId,
      reward: scaledReward, // Send SCALED reward info
      scoreValue: scoreValue,
      config: config as EnemyConfig,
    };
    this.eventBus.emit(ENEMY_DESTROYED, eventData);

    // Notify the helper that an enemy was destroyed
    this.waveHandler.handleEnemyDestroyedInWave(instanceId);
  }

  // --- Public Accessors ---

  /**
   * Retrieves the current health of a specific enemy instance.
   * @param instanceId The unique ID of the enemy instance.
   * @returns The current health of the enemy, or 0 if the enemy is not found.
   */
  public getEnemyHealth(instanceId: string): number {
    const enemy = this.enemies.get(instanceId);
    if (!enemy) {
      // Log a warning if the enemy isn't found, might happen if queried after destruction
      this.logger.warn(`getEnemyHealth called for unknown or destroyed enemy: ${instanceId}`);
      return 0;
    }
    return enemy.health;
  }

  /**
   * Retrieves the creation timestamp of a specific enemy instance.
   * @param instanceId The unique ID of the enemy instance.
   * @returns The creation timestamp (milliseconds since epoch), or undefined if not found.
   */
  public getEnemyCreationTime(instanceId: string): number | undefined {
    return this.enemies.get(instanceId)?.creationTime;
  }
  // --- Event Handlers ---

  private handleProjectileHitEnemy(data: ProjectileHitEnemyData): void {
    // Use damage from the event payload
    const damage = data.damage;
    this.logger.debug(
      `Enemy ${data.enemyInstanceId} hit by projectile ${data.projectileId}. Applying ${damage} damage.`
    );
    this.handleDamage(data.enemyInstanceId, damage);
  }

  // --- Listener Setup ---

  private registerEventListeners(): void {
    // Bind the handler method to ensure 'this' context is correct
    // No need to bind if using arrow function property, but this is fine too.
    this.handleProjectileHitEnemy = this.handleProjectileHitEnemy.bind(this);
    this.eventBus.on(PROJECTILE_HIT_ENEMY, this.handleProjectileHitEnemy);
  }

  // TODO: Add methods for updating enemy state, movement patterns etc.

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(delta: number): void {
    // Placeholder for future per-frame logic (e.g., movement patterns)
    // Currently, enemy movement is basic velocity set on spawn in EnemyEntity
  }

  /** Clean up event listeners and timers when the manager is destroyed */
  public destroy(): void {
    this.eventBus.off(PROJECTILE_HIT_ENEMY, this.handleProjectileHitEnemy);
    // Destroy the helper
    this.waveHandler.destroy();
    this.enemies.clear();
    this.enemyConfigs.clear();
    this.logger.log('EnemyManager destroyed, listeners and timers removed');
  }

  // --- Public Accessors (Delegated) ---

  /** Gets the current wave number from the handler */
  public getCurrentWave(): number {
    return this.waveHandler.getCurrentWave();
  }
}
// No longer need WaveUpdateData interface here

// Export the class directly, removing the singleton instance creation.
// The scene will be responsible for creating and managing the instance.
// export default EnemyManager; // Keep the default export for now, but it exports the class
// Let's explicitly export the class as named export for clarity in GameScene
// and remove the default export to avoid confusion.
// export default EnemyManager;
