import Phaser from 'phaser';
import Logger from '../Logger';
import PlayerManager from '../../managers/PlayerManager';
import WeaponManager from '../../managers/WeaponManager';
import { EnemyManager } from '../../managers/EnemyManager';
import ProjectileManager from '../../managers/ProjectileManager';
import { PowerupManager } from '../../managers/PowerupManager';
import EconomyManager from '../../managers/EconomyManager';
import { EnemyEntity } from '../../../phaser/entities/EnemyEntity';
import { ProjectileShape } from '../../../phaser/handlers/event/ProjectileEventHandler';

// Import specialized inspectors
import { PlayerInspector } from './inspectors/PlayerInspector';
import { EnemyInspector } from './inspectors/EnemyInspector';
import { ProjectileInspector } from './inspectors/ProjectileInspector';
import { PowerupInspector } from './inspectors/PowerupInspector';
import { DebugDataFormatter } from './formatters/DebugDataFormatter';

/**
 * Orchestrates the inspection of game objects for debugging
 * Delegates to specialized inspectors for different entity types
 */
export class DebugObjectInspector {
  private playerInspector: PlayerInspector;
  private enemyInspector: EnemyInspector;
  private projectileInspector: ProjectileInspector;
  private powerupInspector: PowerupInspector;
  private dataFormatter: DebugDataFormatter;

  constructor(
    private playerManager: PlayerManager,
    private weaponManager: WeaponManager,
    private enemyManager: EnemyManager,
    private projectileManager: ProjectileManager,
    private powerupManager: PowerupManager,
    private economyManager: EconomyManager // EconomyManager might not be needed directly here, but good to have access
  ) {
    Logger.log('DebugObjectInspector initialized');

    // Initialize specialized inspectors
    this.playerInspector = new PlayerInspector(playerManager);
    this.enemyInspector = new EnemyInspector(enemyManager);
    this.projectileInspector = new ProjectileInspector(projectileManager);
    this.powerupInspector = new PowerupInspector(powerupManager);
    this.dataFormatter = new DebugDataFormatter();
  }

  /**
   * Fetches the raw details for a specific game object.
   * @param gameObject The Phaser GameObject to inspect.
   * @returns A flat object containing the details, or null if object cannot be identified or data is missing.
   */
  public getObjectDetails(gameObject: Phaser.GameObjects.GameObject): { [key: string]: any } | null {
    // Determine objectId and objectType from the gameObject
    let objectId: string | null = null;
    let objectType: 'player' | 'enemy' | 'projectile' | 'powerup' | null = null;
    let specificData: any = {}; // To hold specific properties like instanceId if needed elsewhere

    // Use properties or getData to identify the object
    if (gameObject.name === 'player') { // Assuming player sprite name is set to 'player'
      objectId = 'player';
      objectType = 'player';
    } else if (gameObject instanceof EnemyEntity) {
      const enemyEntity = gameObject as EnemyEntity; // Cast first
      objectId = enemyEntity.instanceId;
      objectType = 'enemy';
      specificData = { configId: enemyEntity.configId }; // Use cast variable
    } else if (gameObject.getData('instanceId') && gameObject.getData('objectType') === 'projectile') {
      objectId = gameObject.getData('instanceId');
      objectType = 'projectile';
      // We might need the projectile type from the shape itself if stored there, or from ProjectileManager
      specificData = { projectileType: gameObject.getData('projectileType') || 'unknown' }; // Example
    } else if (gameObject.getData('instanceId') && gameObject.getData('objectType') === 'powerup') { // Check for powerup data
      objectId = String(gameObject.getData('instanceId')); // Ensure string ID
      objectType = 'powerup';
      specificData = { configId: gameObject.getData('configId') }; // Example if configId is stored
    }

    if (!objectId || !objectType) {
      Logger.warn('Could not identify the inspected object type or ID.', gameObject);
      return null; // Return null instead of HTML string
    }

    Logger.debug(`Fetching details for ${objectType} ID: ${objectId}`);
    
    // Delegate to the appropriate specialized inspector
    let data = null;
    try {
      switch (objectType) {
        case 'player':
          // Pass the player sprite (assuming gameObject is the player sprite)
          data = this.playerInspector.getPlayerDetails(gameObject as Phaser.Physics.Arcade.Sprite);
          break;
        case 'enemy':
          // Pass the EnemyEntity instance
          data = this.enemyInspector.getEnemyDetails(objectId, gameObject as EnemyEntity);
          break;
        case 'projectile':
          // Pass the ProjectileShape instance
          data = this.projectileInspector.getProjectileDetails(
            objectId, 
            gameObject as ProjectileShape, 
            specificData.projectileType
          );
          break;
        case 'powerup':
          // Pass the powerup sprite instance
          data = this.powerupInspector.getPowerupDetails(
            objectId, 
            gameObject as Phaser.Physics.Arcade.Sprite, 
            specificData.configId
          );
          break;
      }
    } catch (error) {
      Logger.error(`Error fetching details for ${objectType} ${objectId}:`, error);
      return null; // Return null instead of HTML string
    }

    // Check for null data
    if (!data) {
      Logger.warn(`Could not find data for ${objectType} ID: ${objectId}`);
      return null; // Return null instead of HTML string
    }

    // Return the raw data object, no formatting here
    return data;
  }
}