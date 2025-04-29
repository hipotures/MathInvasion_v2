import EventBus, { EventBus as EventBusType } from '../events/EventBus'; // Import default instance and type separately
import Logger, { Logger as LoggerType } from '../utils/Logger'; // Import default instance and type separately
import { EnemyConfig, EnemiesConfig } from '../config/schemas/enemySchema'; // Keep EnemyConfig named, add EnemiesConfig
import ConfigLoader from '../config/ConfigLoader'; // Import default instance

// Define event constants used or handled by this manager
const ENEMY_SPAWNED = 'ENEMY_SPAWNED'; // Emitted by this manager
const ENEMY_DESTROYED = 'ENEMY_DESTROYED'; // Emitted by this manager
const ENEMY_HEALTH_UPDATED = 'ENEMY_HEALTH_UPDATED'; // Emitted by this manager
const PROJECTILE_HIT_ENEMY = 'PROJECTILE_HIT_ENEMY'; // Handled by this manager

/** Defines the data expected for the PROJECTILE_HIT_ENEMY event */
interface ProjectileHitEnemyData {
  projectileId: string;
  enemyInstanceId: string;
  // damage?: number; // Optional: Damage might be handled by EnemyManager based on projectile type
}

// TODO: Define a proper EnemyInstance type/interface
interface EnemyInstance {
  id: string; // Unique instance ID
  configId: string; // ID from config (e.g., 'triangle_scout')
  health: number;
  // Add other relevant state properties like position, velocity etc. later
}

export class EnemyManager {
  private enemies: Map<string, EnemyInstance> = new Map();
  private nextInstanceId = 0;
  private enemyConfigs: Map<string, EnemyConfig> = new Map();

  constructor(
    private eventBus: EventBusType = EventBus, // Use type alias for annotation, default instance for default value
    private logger: LoggerType = Logger, // Use type alias for annotation, default instance for default value
  ) {
    this.loadConfigs();
    this.registerEventListeners(); // Call listener registration
    this.logger.log('EnemyManager initialized'); // Changed info to log
  }

  private loadConfigs(): void {
    try {
      // Assuming ConfigLoader default instance has the method
      const configs: EnemiesConfig = ConfigLoader.getEnemiesConfig();
      configs.forEach((config: EnemyConfig) => { // Add explicit type annotation for config
        this.enemyConfigs.set(config.id, config);
      });
      this.logger.log(`Loaded ${this.enemyConfigs.size} enemy configurations.`); // Changed info to log
    } catch (error) {
      this.logger.error('Failed to load enemy configurations:', error);
      // Handle error appropriately, maybe prevent game start
    }
  }

  public spawnEnemy(
    configId: string,
    position: { x: number; y: number },
  ): void {
    const config = this.enemyConfigs.get(configId);
    if (!config) {
      this.logger.warn(`Attempted to spawn unknown enemy config ID: ${configId}`);
      return;
    }

    const instanceId = `enemy-${this.nextInstanceId++}`;
    const newEnemy: EnemyInstance = {
      id: instanceId,
      configId: config.id,
      health: config.baseHealth,
      // Initialize other state properties based on config and position
    };

    this.enemies.set(instanceId, newEnemy);
    this.logger.debug(`Spawning enemy: ${configId} (Instance ID: ${instanceId}) at (${position.x}, ${position.y})`);

    // Emit an event for the GameScene to create the actual Phaser sprite/body
    this.eventBus.emit('ENEMY_SPAWNED', {
      instanceId: newEnemy.id,
      config: config,
      position: position,
      initialHealth: newEnemy.health,
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
      this.eventBus.emit('ENEMY_HEALTH_UPDATED', {
        instanceId: enemy.id,
        currentHealth: enemy.health,
        maxHealth: this.enemyConfigs.get(enemy.configId)?.baseHealth || enemy.health, // Provide max health for UI
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
    const reward = config?.baseReward ?? 0;

    this.enemies.delete(instanceId);
    this.logger.log(`Destroyed enemy: ${enemy.configId} (Instance ID: ${instanceId})`); // Changed info to log

    // Emit event for GameScene to remove sprite/body
    this.eventBus.emit('ENEMY_DESTROYED', {
      instanceId: instanceId,
      configId: enemy.configId,
      reward: reward, // Send reward info for EconomyManager
    });
  }

  // --- Event Handlers ---

  private handleProjectileHitEnemy(data: ProjectileHitEnemyData): void {
    // TODO: Determine damage based on projectile type/config later
    const damage = 10; // Placeholder damage value
    this.logger.debug(
      `Enemy ${data.enemyInstanceId} hit by projectile ${data.projectileId}. Applying ${damage} damage.`,
    );
    this.handleDamage(data.enemyInstanceId, damage);
  }

  // --- Listener Setup ---

  private registerEventListeners(): void {
    // Bind the handler method to ensure 'this' context is correct
    this.handleProjectileHitEnemy = this.handleProjectileHitEnemy.bind(this);
    this.eventBus.on(PROJECTILE_HIT_ENEMY, this.handleProjectileHitEnemy);
  }

  // TODO: Add methods for updating enemy state, movement patterns etc.

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(delta: number): void {
    // Placeholder for future per-frame logic (e.g., movement patterns)
    // Currently, enemy movement is basic velocity set on spawn in EnemyEntity
  }

  /** Clean up event listeners when the manager is destroyed */
  public destroy(): void {
    this.eventBus.off(PROJECTILE_HIT_ENEMY, this.handleProjectileHitEnemy);
    this.enemies.clear(); // Clear any remaining enemies
    this.enemyConfigs.clear();
    this.logger.log('EnemyManager destroyed and listeners removed');
  }
}

// Export a singleton instance using the default export pattern
const EnemyManagerInstance = new EnemyManager();
export default EnemyManagerInstance;
