import Phaser from 'phaser';
import PlayerManager from '../../../managers/PlayerManager';
import ConfigLoader from '../../../config/ConfigLoader';
import { PlayerInspectionData } from '../types/InspectionTypes';
import Logger from '../../Logger';

/**
 * Specialized inspector for player entities
 * Extracts player-specific data for debugging
 */
export class PlayerInspector {
  constructor(private playerManager: PlayerManager) {}

  /**
   * Gets detailed inspection data for the player
   * @param playerSprite The player sprite to inspect
   * @param currentTime The current timestamp (potentially frozen during pause) to use for age calculation.
   * @returns Player inspection data or null if data cannot be retrieved
   */
  // Return a simple key-value object instead of the structured PlayerInspectionData
  public getPlayerDetails(playerSprite: Phaser.Physics.Arcade.Sprite, currentTime: number): { [key: string]: any } | null {
    const state = this.playerManager.getPlayerState(); // Get manager state
    const config = ConfigLoader.getPlayerConfig();
    const body = playerSprite.body as Phaser.Physics.Arcade.Body | null;
    const creationTime = this.playerManager.getCreationTime();

    if (!state || !body || !config) {
      Logger.warn('Could not get player state, body, or config for inspection');
      return null;
    }

    const details: { [key: string]: any } = {
      // --- Core Identification ---
      ID: 'player',
      Type: 'Player',
      
      // --- Sprite Properties ---
      X: playerSprite.x?.toFixed(1),
      Y: playerSprite.y?.toFixed(1),
      Angle: playerSprite.angle?.toFixed(1),
      ScaleX: playerSprite.scaleX?.toFixed(2),
      ScaleY: playerSprite.scaleY?.toFixed(2),
      Depth: playerSprite.depth,
      Visible: playerSprite.visible,
      Active: playerSprite.active,
      Texture: playerSprite.texture?.key,

      // --- Physics Body Properties ---
      Vx: body.velocity.x?.toFixed(1),
      Vy: body.velocity.y?.toFixed(1),
      Ax: body.acceleration.x?.toFixed(1),
      Ay: body.acceleration.y?.toFixed(1),
      BodyWidth: body.width?.toFixed(0),
      BodyHeight: body.height?.toFixed(0),
      BodyX: body.x?.toFixed(1),
      BodyY: body.y?.toFixed(1),
      Mass: body.mass?.toFixed(2),
      BounceX: body.bounce.x?.toFixed(2),
      BounceY: body.bounce.y?.toFixed(2),
      OnFloor: body.onFloor(),
      OnWall: body.onWall(),
      AllowGravity: body.allowGravity,
      Immovable: body.immovable,

      // --- Manager State Properties ---
      Health: state.health,
      MaxHealth: state.maxHealth,
      IsInvulnerable: state.isInvulnerable,
      InvulnerabilityTimerMs: state.invulnerabilityTimer,
      MovementDirection: state.movementDirection,
      AgeSeconds: this.calculateAge(creationTime, currentTime), // Pass currentTime

      // --- Config Properties (Prefixed) ---
      // Flatten config or select key properties
    };
    
    // Add config properties with prefix
    // Cast config to any to allow dynamic key access for debugging display
    const configAny = config as any;
    for (const key in configAny) {
        if (Object.prototype.hasOwnProperty.call(configAny, key)) {
            const value = configAny[key];
            // Avoid adding complex objects/arrays directly, stringify or skip
            if (typeof value !== 'object' || value === null) {
                details[`config_${key}`] = value;
            } else if (Array.isArray(value)) {
                 details[`config_${key}`] = JSON.stringify(value); // Or skip
            }
            // Skip nested objects for simplicity for now
        }
    }

    return details;
  }

  /**
   * Calculates the age of an entity based on its creation time and the provided current time
   * @param creationTime The creation time of the entity
   * @param currentTime The current timestamp (potentially frozen during pause)
   * @returns The age as a string, or 'N/A' if creation time is undefined
   */
  private calculateAge(creationTime: number | undefined, currentTime: number): string {
    if (creationTime === undefined) return 'N/A';
    // Use currentTime instead of Date.now()
    return ((currentTime - creationTime) / 1000).toFixed(1);
  }
}