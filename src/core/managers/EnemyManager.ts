import EventBus, { EventBus as EventBusType } from '../events/EventBus';
import Logger, { Logger as LoggerType } from '../utils/Logger';
import { EnemyConfig, EnemiesConfig } from '../config/schemas/enemySchema';
import { DifficultyConfig } from '../config/schemas/difficultySchema'; // Import DifficultyConfig
import ConfigLoader from '../config/ConfigLoader';
// Event constants
import { ENEMY_SPAWNED } from '../constants/events';

import { ENEMY_DESTROYED } from '../constants/events';

import { ENEMY_HEALTH_UPDATED } from '../constants/events';
import { PROJECTILE_HIT_ENEMY } from '../constants/events';
import { WAVE_UPDATED } from '../constants/events'; // Import WAVE_UPDATED

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
  // Add other relevant state properties like position, velocity etc. later
}

/** Data for the WAVE_UPDATED event */
interface WaveUpdateData {
  waveNumber: number;
}

export class EnemyManager {
  private enemies: Map<string, EnemyInstance> = new Map();
  private nextInstanceId = 0;
  private enemyConfigs: Map<string, EnemyConfig>; // Initialize in constructor
  private difficultyConfig: DifficultyConfig; // Store difficulty config
  private currentWave: number;
  private waveTimer: number | null = null; // Timer ID for setTimeout/setInterval
  private availableEnemyTypes: string[] = []; // Types available for the current wave

  constructor(
    private eventBus: EventBusType = EventBus,
    private logger: LoggerType = Logger
  ) {
    // Load configs immediately in constructor
    this.enemyConfigs = this.loadEnemyConfigs();
    this.difficultyConfig = this.loadDifficultyConfig();
    // Initialize currentWave based on config, ensuring it starts before the first wave number for advanceWave logic
    this.currentWave = this.difficultyConfig.initialWaveNumber - 1;

    this.registerEventListeners();
    this.logger.log('EnemyManager initialized');
    this.advanceWave(); // Start the first wave sequence
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
      // Provide a default or throw error to prevent game start
      throw new Error('Difficulty configuration is essential and failed to load.');
    }
  }

  // --- Scaling Calculations ---

  private getWaveMultiplier(baseMultiplier: number): number {
    // Apply multiplier cumulatively for each wave past the first
    // Ensure the exponent is non-negative
    return Math.pow(
      baseMultiplier,
      Math.max(0, this.currentWave - this.difficultyConfig.initialWaveNumber)
    );
  }

  private getScaledHealth(baseHealth: number): number {
    const multiplier = this.getWaveMultiplier(this.difficultyConfig.enemyHealthMultiplierPerWave);
    return Math.round(baseHealth * multiplier); // Round to nearest integer
  }

  // Note: Speed scaling needs to be applied where velocity is set (likely EnemyEntity or spawn event)
  // This method provides the multiplier for the entity/handler to use.
  private getScaledSpeedMultiplier(): number {
    return this.getWaveMultiplier(this.difficultyConfig.enemySpeedMultiplierPerWave);
  }

  private getScaledReward(baseReward: number): number {
    const multiplier = this.getWaveMultiplier(this.difficultyConfig.enemyRewardMultiplierPerWave);
    return Math.round(baseReward * multiplier);
  }

  private getScaledEnemyCount(): number {
    // For simplicity, let's assume a base count and apply multiplier.
    // A more complex approach might use difficultyConfig directly or a base count per wave.
    const baseCount = 10; // Example base count, maybe move to config later
    const multiplier = this.getWaveMultiplier(this.difficultyConfig.enemyCountMultiplierPerWave);
    return Math.round(baseCount * multiplier);
  }

  private updateAvailableEnemyTypes(): void {
    const available = [...this.difficultyConfig.initialEnemyTypes];
    const unlocks = this.difficultyConfig.waveEnemyTypeUnlock;
    // Ensure unlocks are sorted numerically by wave number (key)
    const sortedUnlockWaves = Object.keys(unlocks)
      .map(Number)
      .sort((a, b) => a - b);

    for (const waveNum of sortedUnlockWaves) {
      if (this.currentWave >= waveNum) {
        const typeToAdd = unlocks[waveNum.toString()]; // Access using string key
        if (!available.includes(typeToAdd)) {
          available.push(typeToAdd);
        }
      } else {
        break; // Stop checking once we pass the current wave
      }
    }
    this.availableEnemyTypes = available;
    this.logger.debug(
      `Available enemy types for wave ${this.currentWave}: ${available.join(', ')}`
    );
  }

  // --- Spawning Logic ---

  public spawnEnemy(configId: string, position: { x: number; y: number }): void {
    const config = this.enemyConfigs.get(configId);
    if (!config) {
      this.logger.warn(`Attempted to spawn unknown enemy config ID: ${configId}`);
      return;
    }

    const scaledHealth = this.getScaledHealth(config.baseHealth);
    const speedMultiplier = this.getScaledSpeedMultiplier(); // Get speed multiplier
    const instanceId = `enemy-${this.nextInstanceId++}`;
    const newEnemy: EnemyInstance = {
      id: instanceId,
      configId: config.id,
      health: scaledHealth, // Use scaled health
      // TODO: Initialize other state properties based on config and position
    };

    this.enemies.set(instanceId, newEnemy);
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
      const scaledMaxHealth = baseMaxHealth ? this.getScaledHealth(baseMaxHealth) : enemy.health; // Calculate scaled max health
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
    const scaledReward = this.getScaledReward(baseReward); // Calculate scaled reward
    const scoreValue = config?.scoreValue ?? 0;

    this.enemies.delete(instanceId);
    this.logger.log(`Destroyed enemy: ${enemy.configId} (Instance ID: ${instanceId})`);

    // Emit event for GameScene to remove sprite/body and handle abilities
    const eventData: EnemyDestroyedData = {
      instanceId: instanceId,
      configId: enemy.configId,
      reward: scaledReward, // Send SCALED reward info
      scoreValue: scoreValue,
      config: config as EnemyConfig, // Send the full config
    };
    this.eventBus.emit(ENEMY_DESTROYED, eventData);
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
    if (this.waveTimer !== null) {
      clearTimeout(this.waveTimer); // Use clearTimeout for setTimeout ID
      this.waveTimer = null;
    }
    this.enemies.clear(); // Clear any remaining enemies
    this.enemyConfigs.clear();
    this.logger.log('EnemyManager destroyed, listeners and timers removed');
  }

  // --- Wave Management ---

  /** Advances the wave number, updates available enemies, emits event, and schedules next spawn */
  public advanceWave(): void {
    // Clear any existing timer
    if (this.waveTimer !== null) {
      clearTimeout(this.waveTimer);
      this.waveTimer = null;
    }

    this.currentWave++;
    this.logger.log(`Advanced to Wave ${this.currentWave}`);
    this.updateAvailableEnemyTypes(); // Update available types for the new wave
    this.emitWaveUpdate();

    // Schedule the actual spawning of the wave
    const delayMs = this.difficultyConfig.timeBetweenWavesSec * 1000;
    this.logger.log(`Scheduling wave ${this.currentWave} spawn in ${delayMs}ms`);
    this.waveTimer = setTimeout(() => {
      this.spawnWave();
      this.waveTimer = null; // Clear timer ID after execution
    }, delayMs);
  }

  /** Spawns enemies for the current wave based on difficulty settings */
  private spawnWave(): void {
    this.logger.log(`Spawning Wave ${this.currentWave}`);
    const enemyCount = this.getScaledEnemyCount();
    const isBossWave = this.currentWave % this.difficultyConfig.bossWaveFrequency === 0;

    if (isBossWave) {
      this.logger.log(
        `Spawning Boss Wave ${this.currentWave} with boss: ${this.difficultyConfig.bossId}`
      );
      // TODO: Implement specific boss spawning logic (position, maybe unique pattern trigger)
      // For now, just spawn the boss enemy type at a default position
      this.spawnEnemy(this.difficultyConfig.bossId, { x: 400, y: 100 }); // Example position
    } else {
      this.logger.log(`Spawning ${enemyCount} enemies for regular wave ${this.currentWave}`);
      // TODO: Implement spawn pattern logic (e.g., standard_grid)
      // This likely needs coordination with GameScene or a dedicated Spawner class
      // For now, spawn randomly selected available types at random positions (placeholder)
      for (let i = 0; i < enemyCount; i++) {
        if (this.availableEnemyTypes.length === 0) {
          this.logger.warn('No available enemy types to spawn!');
          break;
        }
        const randomTypeIndex = Math.floor(Math.random() * this.availableEnemyTypes.length);
        const randomConfigId = this.availableEnemyTypes[randomTypeIndex];
        // Placeholder random position - replace with pattern logic
        const randomX = Math.random() * 700 + 50; // Example range
        const randomY = Math.random() * 200 + 50; // Example range
        this.spawnEnemy(randomConfigId, { x: randomX, y: randomY });
      }
    }

    // TODO: Consider adding logic to trigger the *next* advanceWave only when
    // the current wave is cleared (e.g., all enemies destroyed).
    // This requires tracking active enemies per wave.
    // For now, waves advance purely on timer.
  }

  /** Emits the current wave number */
  private emitWaveUpdate(): void {
    const eventData: WaveUpdateData = { waveNumber: this.currentWave };
    this.eventBus.emit(WAVE_UPDATED, eventData);
  }

  /** Gets the current wave number */
  public getCurrentWave(): number {
    return this.currentWave;
  }
}

// Export the class directly, removing the singleton instance creation.
// The scene will be responsible for creating and managing the instance.
// export default EnemyManager; // Keep the default export for now, but it exports the class
// Let's explicitly export the class as named export for clarity in GameScene
// and remove the default export to avoid confusion.
// export default EnemyManager;
