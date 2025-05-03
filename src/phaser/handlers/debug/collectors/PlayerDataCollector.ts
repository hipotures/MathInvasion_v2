import Phaser from 'phaser';
import PlayerManager from '../../../../core/managers/PlayerManager';
import { ActiveObjectData, DataCollector } from '../types/DebugPanelTypes';

/**
 * Extracts and formats player information for the debug panel
 */
export class PlayerDataCollector implements DataCollector<ActiveObjectData | null> {
  private playerManager: PlayerManager;
  private playerSprite: Phaser.Physics.Arcade.Sprite;

  constructor(playerManager: PlayerManager, playerSprite: Phaser.Physics.Arcade.Sprite) {
    this.playerManager = playerManager;
    this.playerSprite = playerSprite;
  }

  /**
   * Collects debug data for the player
   * @param currentTime The current timestamp (potentially frozen during pause) to use for age calculation.
   * @returns The player debug data, or null if the player is not active
   */
  public collectData(currentTime: number): ActiveObjectData | null {
    if (!this.playerSprite || !this.playerSprite.active) {
      return null;
    }

    const playerState = this.playerManager.getPlayerState();
    
    // Use the provided currentTime for age calculation
    const creationTime = this.playerManager.getCreationTime() ?? currentTime;
    const age = Math.floor((currentTime - creationTime) / 1000);

    return {
      ID: 'player',
      T: 'Pl',
      A: age,
      X: Math.round(this.playerSprite.x),
      Y: Math.round(this.playerSprite.y),
      H: playerState.health,
      I: playerState.isInvulnerable,
      Vx: parseFloat(this.playerSprite.body?.velocity.x.toFixed(1) ?? '0'),
      Vy: parseFloat(this.playerSprite.body?.velocity.y.toFixed(1) ?? '0'),
    };
  }

  /**
   * Gets the player's health
   * @returns The player's health
   */
  public getPlayerHealth(): number {
    return this.playerManager.getPlayerState().health;
  }

  /**
   * Gets whether the player is invulnerable
   * @returns Whether the player is invulnerable
   */
  public isPlayerInvulnerable(): boolean {
    return this.playerManager.getPlayerState().isInvulnerable;
  }
}