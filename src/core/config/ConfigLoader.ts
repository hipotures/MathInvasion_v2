import yaml from 'js-yaml';
import { z } from 'zod';
import { weaponsConfigSchema, type WeaponsConfig } from './schemas/weaponSchema';
import { enemiesConfigSchema, type EnemiesConfig } from './schemas/enemySchema';
import { powerupsConfigSchema, type PowerupsConfig } from './schemas/powerupSchema';
import { difficultyConfigSchema, type DifficultyConfig } from './schemas/difficultySchema';
import { playerSchema, type PlayerConfig } from './schemas/playerSchema'; // Added player schema

// Use Vite's import.meta.glob to import YAML files as raw strings
// Note: The path is relative to the current file (ConfigLoader.ts)
const yamlFiles = import.meta.glob('../../../config/*.yml', {
  query: '?raw', // Use recommended query syntax
  import: 'default', // Specify default import for raw content
  eager: true, // Load immediately
});

/**
 * Loads, parses, and validates game configuration from YAML files.
 */
class ConfigLoader {
  private weapons: WeaponsConfig | null = null;
  private enemies: EnemiesConfig | null = null;
  private powerups: PowerupsConfig | null = null;
  private difficulty: DifficultyConfig | null = null;
  private player: PlayerConfig | null = null; // Added player config property

  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  /**
   * Loads all configuration files asynchronously.
   * Ensures configuration is loaded only once.
   */
  public async loadAllConfigs(): Promise<void> {
    if (this.loaded) {
      return Promise.resolve();
    }
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      try {
        this.weapons = await this.loadAndValidate(
          '../../../config/weapons.yml',
          weaponsConfigSchema
        );
        this.enemies = await this.loadAndValidate(
          '../../../config/enemies.yml',
          enemiesConfigSchema
        );
        this.powerups = await this.loadAndValidate(
          '../../../config/powerups.yml',
          powerupsConfigSchema
        );
        this.difficulty = await this.loadAndValidate(
          '../../../config/difficulty.yml',
          difficultyConfigSchema
        );
        // Load player config
        this.player = await this.loadAndValidate('../../../config/player.yml', playerSchema);
        this.loaded = true;
        console.log('All configurations loaded and validated successfully.');
      } catch (error) {
        console.error('Failed to load or validate configuration:', error);
        // Depending on the game's needs, you might want to throw the error,
        // use default values, or prevent the game from starting.
        throw new Error('Configuration loading failed.');
      } finally {
        this.loadingPromise = null;
      }
    })();

    return this.loadingPromise;
  }

  /**
   * Loads, parses, and validates a single YAML configuration file.
   * @param filePath The relative path key used in import.meta.glob.
   * @param schema The Zod schema to validate against.
   * @returns The validated configuration data.
   */
  private async loadAndValidate<T>(filePath: string, schema: z.ZodType<T>): Promise<T> {
    const rawContent = yamlFiles[filePath];
    if (typeof rawContent !== 'string') {
      throw new Error(`Configuration file not found or empty: ${filePath}`);
    }

    try {
      const parsedData = yaml.load(rawContent);
      // Validate the parsed data against the schema
      const validationResult = schema.safeParse(parsedData);
      if (!validationResult.success) {
        console.error(`Validation failed for ${filePath}:`, validationResult.error.errors);
        throw new Error(`Invalid configuration format in ${filePath}`);
      }
      return validationResult.data;
    } catch (e) {
      if (e instanceof yaml.YAMLException) {
        throw new Error(`Failed to parse YAML file ${filePath}: ${e.message}`);
      }
      // Re-throw validation errors or other unexpected errors
      throw e;
    }
  }

  // --- Getters for validated configurations ---

  public getWeaponsConfig(): WeaponsConfig {
    if (!this.loaded || !this.weapons) {
      throw new Error('Weapons configuration not loaded yet.');
    }
    return this.weapons;
  }

  public getEnemiesConfig(): EnemiesConfig {
    if (!this.loaded || !this.enemies) {
      throw new Error('Enemies configuration not loaded yet.');
    }
    return this.enemies;
  }

  public getPowerupsConfig(): PowerupsConfig {
    if (!this.loaded || !this.powerups) {
      throw new Error('Powerups configuration not loaded yet.');
    }
    return this.powerups;
  }

  public getDifficultyConfig(): DifficultyConfig {
    if (!this.loaded || !this.difficulty) {
      throw new Error('Difficulty configuration not loaded yet.');
    }
    return this.difficulty;
  }

  public getPlayerConfig(): PlayerConfig {
    if (!this.loaded || !this.player) {
      throw new Error('Player configuration not loaded yet.');
    }
    return this.player;
  }
}

// Export a singleton instance
const configLoader = new ConfigLoader();
export default configLoader;
