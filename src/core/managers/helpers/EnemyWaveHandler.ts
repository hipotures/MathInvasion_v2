import EventBus, { EventBus as EventBusType } from '../../events/EventBus';
import Logger, { Logger as LoggerType } from '../../utils/Logger';
import { DifficultyConfig } from '../../config/schemas/difficultySchema';
import { WAVE_UPDATED } from '../../constants/events';
import type { EnemyManager } from '../EnemyManager';

interface WaveUpdateData {
  waveNumber: number;
}

export class EnemyWaveHandler {
  private currentWave: number;
  private availableEnemyTypes: string[] = [];
  private isWaveActive: boolean = false;
  private enemiesInCurrentWave: Set<string> = new Set();
  private waveClearTimer: number | null = null;

  constructor(
    private enemyManager: EnemyManager, // Reference to the main manager
    private difficultyConfig: DifficultyConfig,
    private eventBus: EventBusType = EventBus,
    private logger: LoggerType = Logger
  ) {
    this.currentWave = this.difficultyConfig.initialWaveNumber - 1;
    this.logger.log('EnemyWaveHandler initialized');
    // DO NOT start the wave sequence immediately from constructor
  }

  public start(): void {
    this.logger.log('EnemyWaveHandler starting wave progression...');
    this.advanceWave();
  }

  private getWaveMultiplier(baseMultiplier: number): number {
    // Calculate multiplier based on how many waves have passed since the initial one
    return Math.pow(
      baseMultiplier,
      Math.max(0, this.currentWave - this.difficultyConfig.initialWaveNumber)
    );
  }

  // Public access needed by EnemyManager before spawning
  public getScaledHealth(baseHealth: number): number {
    const multiplier = this.getWaveMultiplier(this.difficultyConfig.enemyHealthMultiplierPerWave);
    return Math.round(baseHealth * multiplier);
  }

  // Public access needed by EnemyManager before spawning
  public getScaledSpeedMultiplier(): number {
    return this.getWaveMultiplier(this.difficultyConfig.enemySpeedMultiplierPerWave);
  }

  // Public access needed by EnemyManager when destroying
  public getScaledReward(baseReward: number): number {
    const multiplier = this.getWaveMultiplier(this.difficultyConfig.enemyRewardMultiplierPerWave);
    return Math.round(baseReward * multiplier);
  }

  private getScaledEnemyCount(): number {
    const baseCount = 10; // Example base count, could be configurable
    const multiplier = this.getWaveMultiplier(this.difficultyConfig.enemyCountMultiplierPerWave);
    return Math.round(baseCount * multiplier);
  }

  private updateAvailableEnemyTypes(): void {
    const available = [...this.difficultyConfig.initialEnemyTypes];
    const unlocks = this.difficultyConfig.waveEnemyTypeUnlock;
    const sortedUnlockWaves = Object.keys(unlocks)
      .map(Number)
      .sort((a, b) => a - b);

    for (const waveNum of sortedUnlockWaves) {
      if (this.currentWave >= waveNum) {
        const typeToAdd = unlocks[waveNum.toString()];
        if (!available.includes(typeToAdd)) {
          available.push(typeToAdd);
        }
      } else {
        break;
      }
    }
    this.availableEnemyTypes = available;
    this.logger.debug(
      `Available enemy types for wave ${this.currentWave}: ${available.join(', ')}`
    );
  } // Corrected closing brace position

  public advanceWave(): void {
    if (this.waveClearTimer !== null) {
      clearTimeout(this.waveClearTimer);
      this.waveClearTimer = null;
      this.logger.debug('Cleared pending wave clear timer due to advanceWave call.');
    }

    this.currentWave++;
    this.logger.log(`Advanced to Wave ${this.currentWave}`);
    this.updateAvailableEnemyTypes();
    this.emitWaveUpdate();
    this.spawnWave();
  }

  private spawnWave(): void {
    this.logger.log(`Spawning Wave ${this.currentWave}`);
    this.isWaveActive = true;
    this.enemiesInCurrentWave.clear();

    const enemyCount = this.getScaledEnemyCount(); // Note: Grid pattern currently ignores this
    const isBossWave = this.currentWave % this.difficultyConfig.bossWaveFrequency === 0;

    if (isBossWave) {
      this.logger.log(
        `Spawning Boss Wave ${this.currentWave} with boss: ${this.difficultyConfig.bossId}`
      );
      this.enemyManager.spawnEnemy(this.difficultyConfig.bossId, { x: 400, y: -50 }); // Spawn above screen
    } else {
      this.logger.log(`Spawning enemies for regular wave ${this.currentWave} using standard_grid`);
      const gridConfig = {
        columns: 8,
        rows: 3,
        horizontalSpacing: 60,
        verticalSpacing: 50,
        startXOffset: 0,
        startY: -50, // Spawn above screen
        gameWidth: 800,
      };
      const totalGridWidth = (gridConfig.columns - 1) * gridConfig.horizontalSpacing;
      const gridStartX = gridConfig.gameWidth / 2 - totalGridWidth / 2 + gridConfig.startXOffset;
      let enemiesSpawned = 0;

      for (let row = 0; row < gridConfig.rows; row++) {
        for (let col = 0; col < gridConfig.columns; col++) {
          if (this.availableEnemyTypes.length === 0) {
            this.logger.warn('No available enemy types to spawn for grid!');
            break;
          }
          const randomTypeIndex = Math.floor(Math.random() * this.availableEnemyTypes.length);
          const configId = this.availableEnemyTypes[randomTypeIndex];
          const spawnX = gridStartX + col * gridConfig.horizontalSpacing;
          const spawnY = gridConfig.startY + row * gridConfig.verticalSpacing;
          this.enemyManager.spawnEnemy(configId, { x: spawnX, y: spawnY });
          enemiesSpawned++;
        }
        if (this.availableEnemyTypes.length === 0) break;
      }
      this.logger.log(`Spawned ${enemiesSpawned} enemies in standard_grid pattern.`);
    }
  }

  /** Called by EnemyManager when an enemy is spawned during an active wave */
  public trackEnemyInWave(instanceId: string): void {
    if (this.isWaveActive) {
      this.enemiesInCurrentWave.add(instanceId);
    }
  }

  /** Called by EnemyManager when an enemy is destroyed */
  public handleEnemyDestroyedInWave(instanceId: string): void {
    const wasInCurrentWave = this.enemiesInCurrentWave.delete(instanceId);

    // Check if the wave is now clear
    if (wasInCurrentWave && this.isWaveActive && this.enemiesInCurrentWave.size === 0) {
      this.logger.log(`Wave ${this.currentWave} cleared.`);
      this.isWaveActive = false;
      const delayMs = this.difficultyConfig.timeBetweenWavesSec * 1000;
      this.logger.log(`Scheduling next wave advance in ${delayMs}ms`);
      if (this.waveClearTimer !== null) {
        clearTimeout(this.waveClearTimer); // Clear any existing timer just in case
      }
      this.waveClearTimer = setTimeout(() => {
        this.advanceWave();
        this.waveClearTimer = null;
      }, delayMs);
    }
  }

  private emitWaveUpdate(): void {
    const eventData: WaveUpdateData = { waveNumber: this.currentWave };
    this.eventBus.emit(WAVE_UPDATED, eventData);
  }

  public getCurrentWave(): number {
    return this.currentWave;
  }

  public destroy(): void {
    if (this.waveClearTimer !== null) {
      clearTimeout(this.waveClearTimer);
      this.waveClearTimer = null;
    }
    this.enemiesInCurrentWave.clear();
    this.logger.log('EnemyWaveHandler destroyed');
  }
}
