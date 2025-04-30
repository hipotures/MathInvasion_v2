import { EventBus } from '../../core/events/EventBus';
import { Logger } from '../../core/utils/Logger';
import configLoader from '../../core/config/ConfigLoader';
import PlayerManager from '../../core/managers/PlayerManager';
import InputManager from '../../core/managers/InputManager';
import WeaponManager from '../../core/managers/WeaponManager';
import ProjectileManager from '../../core/managers/ProjectileManager';
import EconomyManager from '../../core/managers/EconomyManager';
import { EnemyManager } from '../../core/managers/EnemyManager';
import { PowerupManager } from '../../core/managers/PowerupManager';

/**
 * Structure to hold the initialized managers for GameScene.
 */
export interface GameManagers {
  playerManager: PlayerManager;
  inputManager: InputManager;
  weaponManager: WeaponManager;
  projectileManager: ProjectileManager;
  economyManager: EconomyManager;
  enemyManager: EnemyManager;
  powerupManager: PowerupManager;
}

/**
 * Initializes all core game managers required by GameScene.
 * @param eventBus The global event bus instance.
 * @param logger The global logger instance.
 * @returns An object containing instances of all initialized managers.
 */
export function initializeGameManagers(eventBus: EventBus, logger: Logger): GameManagers {
  logger.log('Initializing game managers...');

  const playerConfig = configLoader.getPlayerConfig();
  const powerupsConfig = configLoader.getPowerupsConfig();
  // Note: Weapon and Enemy configs are loaded internally by their respective managers

  const economyManager = new EconomyManager(eventBus, 0); // Initial currency 0
  const playerManager = new PlayerManager(eventBus, playerConfig);
  const inputManager = new InputManager(eventBus);
  const weaponManager = new WeaponManager(eventBus, economyManager); // Inject EconomyManager
  const projectileManager = new ProjectileManager(eventBus);
  const enemyManager = new EnemyManager(eventBus, logger); // Inject logger
  const powerupManager = new PowerupManager(eventBus, logger, powerupsConfig); // Inject logger & config

  // Initialize managers that require it
  powerupManager.init();
  // EnemyManager initializes itself (loads config, starts wave) in constructor

  logger.log('Game managers initialized successfully.');

  return {
    playerManager,
    inputManager,
    weaponManager,
    projectileManager,
    economyManager,
    enemyManager,
    powerupManager,
  };
}
