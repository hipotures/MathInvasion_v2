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
   * @returns Player inspection data or null if data cannot be retrieved
   */
  public getPlayerDetails(playerSprite: Phaser.Physics.Arcade.Sprite): PlayerInspectionData | null {
    const state = this.playerManager.getPlayerState(); // Get manager state
    const config = ConfigLoader.getPlayerConfig();
    const body = playerSprite.body as Phaser.Physics.Arcade.Body | null;
  
    if (!state || !body) {
      Logger.warn('Could not get player state or body for inspection');
      return null;
    }

    return {
      id: 'player',
      type: 'Player',
      configData: this.extractConfigData(config),
      standardProperties: {
        'Position X': playerSprite.x?.toFixed(1), // Get from sprite
        'Position Y': playerSprite.y?.toFixed(1), // Get from sprite
        'Velocity X': body.velocity.x?.toFixed(1), // Get from body
        'Velocity Y': body.velocity.y?.toFixed(1), // Get from body
        'Health': state.health, // Get from manager state
        'Max Health': state.maxHealth, // Get from manager state
        'Age (s)': this.calculateAge(this.playerManager.getCreationTime()),
      },
      otherProperties: {
        'Is Invulnerable': state.isInvulnerable,
        'Invulnerability Timer (ms)': state.invulnerabilityTimer,
        'Movement Direction': state.movementDirection,
      },
    };
  }

  /**
   * Calculates the age of an entity based on its creation time
   * @param creationTime The creation time of the entity
   * @returns The age as a string, or 'N/A' if creation time is undefined
   */
  private calculateAge(creationTime?: number): string {
    if (creationTime === undefined) return 'N/A';
    return ((Date.now() - creationTime) / 1000).toFixed(1);
  }

  /**
   * Extracts config data for display
   * @param config The config object to extract data from
   * @returns The extracted config data
   */
  private extractConfigData(config: any): any {
    if (!config) return { 'Error': 'Config not found' };
    // Simple extraction, might need refinement based on config structure
    // We could filter out complex objects/arrays if needed
    return { ...config };
  }
}