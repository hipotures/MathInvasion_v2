import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import * as Events from '../../core/constants/events'; // Import event constants
import { type PlayerState } from '../../core/types/PlayerState'; // Import PlayerState type
import HtmlUI from '../../core/utils/HtmlUI'; // Import HtmlUI

/** Defines the data expected for the WEAPON_STATE_UPDATED event */
// Ensure this matches the interface in WeaponManager.ts
interface WeaponStateUpdateData {
  weaponId: string;
  level: number;
  nextUpgradeCost: number | null; // Added cost
}

/** Defines the data expected for the WAVE_UPDATED event */
// Ensure this matches the interface in EnemyManager.ts
interface WaveUpdateData {
  waveNumber: number;
}

export default class UIScene extends Phaser.Scene {
  private htmlUI!: HtmlUI; // HTML UI for all text elements, using definite assignment assertion

  constructor() {
    super({ key: 'UIScene' });
  }

  preload(): void {
    // No assets needed for basic text UI yet
  }

  create(): void {
    logger.log('UIScene created');

    // Create HTML UI
    this.htmlUI = new HtmlUI();

    // Bind methods
    this.handleCurrencyUpdate = this.handleCurrencyUpdate.bind(this);
    this.handleWeaponStateUpdate = this.handleWeaponStateUpdate.bind(this);
    this.handlePlayerStateUpdate = this.handlePlayerStateUpdate.bind(this);
    this.handleScoreUpdate = this.handleScoreUpdate.bind(this);
    this.handleWaveUpdate = this.handleWaveUpdate.bind(this);
    // No need to bind arrow functions: handleGamePaused, handleGameResumed

    // --- Event Listeners ---
    eventBus.on(Events.CURRENCY_UPDATED, this.handleCurrencyUpdate);
    eventBus.on(Events.WEAPON_STATE_UPDATED, this.handleWeaponStateUpdate);
    eventBus.on(Events.PLAYER_STATE_UPDATED, this.handlePlayerStateUpdate);
    eventBus.on(Events.SCORE_UPDATED, this.handleScoreUpdate);
    eventBus.on(Events.WAVE_UPDATED, this.handleWaveUpdate);
    eventBus.on(Events.GAME_PAUSED, this.handleGamePaused); // Listen for pause
    eventBus.on(Events.GAME_RESUMED, this.handleGameResumed); // Listen for resume

    // Clean up listeners when the scene is shut down
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      logger.log('UIScene shutdown, removing listeners');
      eventBus.off(Events.CURRENCY_UPDATED, this.handleCurrencyUpdate);
      eventBus.off(Events.WEAPON_STATE_UPDATED, this.handleWeaponStateUpdate);
      eventBus.off(Events.PLAYER_STATE_UPDATED, this.handlePlayerStateUpdate);
      eventBus.off(Events.SCORE_UPDATED, this.handleScoreUpdate);
      eventBus.off(Events.WAVE_UPDATED, this.handleWaveUpdate);
      eventBus.off(Events.GAME_PAUSED, this.handleGamePaused); // Remove pause listener
      eventBus.off(Events.GAME_RESUMED, this.handleGameResumed); // Remove resume listener

      // Destroy HTML UI
      this.htmlUI.destroy();
    });

    // Request initial currency state (EconomyManager emits it on init, but good practice)
    // eventBus.emit('REQUEST_CURRENCY_STATE'); // Need EconomyManager to listen for this
  }

  private handleCurrencyUpdate(data: { currentAmount: number }): void {
    logger.debug(`UIScene received CURRENCY_UPDATED: ${data.currentAmount}`);
    this.htmlUI.updateCurrency(data.currentAmount);
  }

  private handleScoreUpdate(data: { currentScore: number }): void {
    logger.debug(`UIScene received SCORE_UPDATED: ${data.currentScore}`);
    this.htmlUI.updateScore(data.currentScore);
  }

  private handleWeaponStateUpdate(data: WeaponStateUpdateData): void {
    logger.debug(`UIScene received WEAPON_STATE_UPDATED: ${JSON.stringify(data)}`);

    // Update weapon status and buttons
    this.htmlUI.updateWeaponStatus(data.weaponId, data.level);
    this.htmlUI.updateWeaponUpgradeCost(data.nextUpgradeCost);
    this.htmlUI.updateWeaponButtons(data.weaponId);
  }

  private handlePlayerStateUpdate(data: PlayerState): void {
    logger.debug(`UIScene received PLAYER_STATE_UPDATED: Health=${data.health}`);
    this.htmlUI.updateHealth(data.health);
  }

  private handleWaveUpdate(data: WaveUpdateData): void {
    logger.debug(`UIScene received WAVE_UPDATED: ${data.waveNumber}`);
    this.htmlUI.updateWave(data.waveNumber);
  }

  // Use arrow function to lexically bind 'this'
  private handleGamePaused = (): void => {
    logger.debug('UIScene received GAME_PAUSED');
    // Assuming the check passed based on previous logs, remove extra logging
    if (this.htmlUI) {
        this.htmlUI.showPauseIndicator();
    } else {
        logger.error(`UIScene: this.htmlUI is not available in handleGamePaused.`);
    }
  }

  // Use arrow function to lexically bind 'this'
  private handleGameResumed = (): void => {
    logger.debug('UIScene received GAME_RESUMED');
     // Assuming the check passed based on previous logs, remove extra logging
    if (this.htmlUI) {
        this.htmlUI.hidePauseIndicator();
    } else {
        logger.error(`UIScene: this.htmlUI is not available in handleGameResumed.`);
    }
  }

  // update(time: number, delta: number): void {
  //   // UI updates are mostly event-driven
  // }
}
