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

// Define a type for the specific data collected during identification
interface SpecificObjectData {
  configId?: string;
  projectileType?: string;
}

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
  private powerupSpritesRef: Map<string, Phaser.Physics.Arcade.Sprite>; // Changed key to string

  constructor(
    private playerManager: PlayerManager,
    private weaponManager: WeaponManager,
    private enemyManager: EnemyManager,
    private projectileManager: ProjectileManager,
    private powerupManager: PowerupManager,
    private economyManager: EconomyManager, // EconomyManager might not be needed directly here, but good to have access
    powerupSprites: Map<string, Phaser.Physics.Arcade.Sprite> // Changed key to string
  ) {
    Logger.log('DebugObjectInspector initialized');
    this.powerupSpritesRef = powerupSprites; // Store the reference

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
   * @param currentTime The current timestamp (potentially frozen during pause) to use for age calculation.
   * @returns A flat object containing the details, or a minimal error object if identification fails.
   */
  // Use 'unknown' instead of 'any' for the return type's value, or define a more specific interface/union if possible
  public getObjectDetails(gameObject: Phaser.GameObjects.GameObject, currentTime: number): { [key: string]: unknown } | null {
    // Determine objectId and objectType from the gameObject
    let objectId: string | null = null;
    let objectType: 'player' | 'enemy' | 'projectile' | 'powerup' | null = null;
    let specificData: SpecificObjectData = {}; // Use the defined interface

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
    } else if (gameObject instanceof Phaser.Physics.Arcade.Sprite) {
        // Check if it's a powerup sprite using the injected map or getData as fallback
        const instanceIdFromData = gameObject.getData('instanceId');
        const objectTypeFromData = gameObject.getData('objectType');
        let isPowerup = false;
        let powerupInstanceId: string | undefined; // Changed type to string | undefined

        // Primary check: Is it in the powerupSprites map?
        for (const [id, sprite] of this.powerupSpritesRef.entries()) {
            if (sprite === gameObject) {
                isPowerup = true;
                powerupInstanceId = id;
                break;
            }
        }

        // Fallback check: Use getData if not found in map (or if map isn't populated yet)
        if (!isPowerup && objectTypeFromData === 'powerup' && instanceIdFromData !== undefined) {
             const numericId = Number(instanceIdFromData); // Get the numeric ID from data
             if (!isNaN(numericId)) {
                 isPowerup = true;
                 powerupInstanceId = `powerup_${numericId}`; // Create the string ID
             }
        }

        if (isPowerup && powerupInstanceId !== undefined) { // powerupInstanceId is now string 'powerup_X'
            // Check if the sprite is being destroyed (scene becomes undefined during destruction)
            if (!gameObject.scene) {
                Logger.debug(`Powerup sprite ${powerupInstanceId} is being destroyed. Returning status.`);
                return {
                    ID: String(powerupInstanceId),
                    Type: 'powerup',
                    Status: 'Destroyed/Collected',
                    Message: 'This powerup no longer exists in the game world'
                };
            }
            objectId = powerupInstanceId; // Already a string 'powerup_X'
            objectType = 'powerup';
            // Try to get configId from data, might be undefined initially
            specificData = { configId: gameObject.getData('configId') };
        }
    }


    if (!objectId || !objectType) {
      Logger.warn('Could not identify the inspected object type or ID.', gameObject);
      // Return minimal error object instead of null
      return {
          ID: 'unknown',
          Type: 'unknown',
          Error: 'Could not identify object type/ID (Race condition?)'
      };
    }

    Logger.debug(`Fetching details for ${objectType} ID: ${objectId}`);
    
    // Delegate to the appropriate specialized inspector
    let data = null;
    try {
      switch (objectType) {
        case 'player':
          // Pass the player sprite and currentTime
          data = this.playerInspector.getPlayerDetails(gameObject as Phaser.Physics.Arcade.Sprite, currentTime);
          break;
        case 'enemy':
          // Pass the EnemyEntity instance and currentTime
          data = this.enemyInspector.getEnemyDetails(objectId, gameObject as EnemyEntity, currentTime);
          break;
        case 'projectile':
          // Pass the ProjectileShape instance and currentTime
          data = this.projectileInspector.getProjectileDetails(
            objectId,
            gameObject as ProjectileShape,
            specificData.projectileType ?? 'unknown', // Provide fallback
            currentTime
          );
          break;
        case 'powerup':
          // Pass the powerup sprite instance and currentTime
          data = this.powerupInspector.getPowerupDetails(
            objectId,
            gameObject as Phaser.Physics.Arcade.Sprite,
            specificData.configId ?? 'unknown', // Provide fallback
            currentTime
          );
          break;
      }
    } catch (error) {
      Logger.error(`Error fetching details for ${objectType} ${objectId}:`, error);
      return null; // Return null instead of HTML string
    }

    // Check for null data from the specific inspector
    if (!data) {
      Logger.warn(`Could not get details for ${objectType} ${objectId}. Emitting null data.`);
      // Return a minimal object instead of null to prevent downstream errors
      // This allows the UI to show *something* even if details are missing
      return {
        ID: objectId,
        Type: objectType,
        Error: `Details not available (State missing or race condition?)`
      };
    }

    // Return the raw data object, no formatting here
    return data;
  }
}