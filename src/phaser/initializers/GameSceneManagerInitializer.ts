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
import { WeaponUpgrader } from '../../core/managers/helpers/WeaponUpgrader'; // Import helper
import { WeaponPowerupHandler } from '../../core/managers/helpers/WeaponPowerupHandler'; // Import helper
import DebugManager from '../../core/managers/DebugManager'; // Import DebugManager
import { PowerupDebugMenu } from '../../core/utils/debug/PowerupDebugMenu'; // Import PowerupDebugMenu
import debugState from '../../core/utils/DebugState'; // Import debugState

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
  debugManager: DebugManager; // Add DebugManager to the interface
  powerupDebugMenu: PowerupDebugMenu; // Add PowerupDebugMenu to the interface
}

/**
 * Initializes all core game managers required by GameScene.
 * @param eventBus The global event bus instance.
 * @param logger The global logger instance.
 * @param sceneWidth The actual width of the game scene.
 * @param sceneHeight The actual height of the game scene.
 * @returns An object containing instances of all initialized managers.
 */
export function initializeGameManagers(
  eventBus: EventBus,
  logger: Logger,
  sceneWidth: number,
  sceneHeight: number
): GameManagers {
  logger.log(`Initializing game managers with scene dimensions: ${sceneWidth}x${sceneHeight}...`);

  const playerConfig = configLoader.getPlayerConfig();
  const powerupsConfig = configLoader.getPowerupsConfig();
  // Note: Weapon and Enemy configs are loaded internally by their respective managers

  const economyManager = new EconomyManager(eventBus, 0); // Initial currency 0
  const playerManager = new PlayerManager(eventBus, playerConfig);
  const inputManager = new InputManager(eventBus);
  // Create helper instances first
  const weaponUpgrader = new WeaponUpgrader(economyManager); // Pass EconomyManager
  const weaponPowerupHandler = new WeaponPowerupHandler(eventBus, logger); // Pass EventBus and Logger
  // Inject helpers into WeaponManager
  const weaponManager = new WeaponManager(
    eventBus,
    economyManager,
    weaponUpgrader,
    weaponPowerupHandler
  );
  // Pass the actual scene dimensions to ProjectileManager
  const projectileManager = new ProjectileManager(eventBus, sceneWidth, sceneHeight);
  const enemyManager = new EnemyManager(eventBus, logger); // Inject logger
  const powerupManager = new PowerupManager(eventBus, logger, powerupsConfig); // Inject logger & config
  const debugManager = new DebugManager(eventBus); // Create DebugManager
  // Initialize PowerupDebugMenu after dependencies are created
  const powerupDebugMenu = new PowerupDebugMenu(eventBus, powerupsConfig);

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
    debugManager, // Add DebugManager to the returned object
    powerupDebugMenu, // Add PowerupDebugMenu to the returned object
  };
}
