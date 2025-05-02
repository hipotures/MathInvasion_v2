import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import * as Events from '../../core/constants/events'; // Import event constants
import { type PlayerState } from '../../core/types/PlayerState'; // Import PlayerState type
import HtmlUI from '../../core/utils/HtmlUI'; // Import HtmlUI

// --- Interfaces for Event Payloads ---

// Defines the data expected for the WEAPON_STATE_UPDATED event
interface AllWeaponStatesUpdateData {
  activeWeaponId: string;
  progress: { [weaponId: string]: number }; // Key: weaponId, Value: progress (0-1)
  nextUpgradeCosts: { [weaponId: string]: number | null };
  levels: { [weaponId: string]: number };
}

/** Defines the data expected for the WAVE_UPDATED event */
interface WaveUpdateData {
  waveNumber: number;
}

/** Defines the data expected for CURRENCY_UPDATED */
interface CurrencyUpdateData {
    currentAmount: number;
}

/** Defines the data expected for SCORE_UPDATED */
interface ScoreUpdateData {
    currentScore: number;
}

// --- UIScene Class ---

export default class UIScene extends Phaser.Scene {
  private htmlUI!: HtmlUI;

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

    // Bind methods that aren't arrow functions
    this.handleCurrencyUpdate = this.handleCurrencyUpdate.bind(this);
    this.handleWeaponStateUpdate = this.handleWeaponStateUpdate.bind(this);
    this.handlePlayerStateUpdate = this.handlePlayerStateUpdate.bind(this);
    this.handleScoreUpdate = this.handleScoreUpdate.bind(this);
    this.handleWaveUpdate = this.handleWaveUpdate.bind(this);

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
      eventBus.off(Events.GAME_PAUSED, this.handleGamePaused);
      eventBus.off(Events.GAME_RESUMED, this.handleGameResumed);

      // Destroy HTML UI
      this.htmlUI.destroy();
    });
  }

  private handleCurrencyUpdate(data: CurrencyUpdateData): void {
    logger.debug(`UIScene received CURRENCY_UPDATED: ${data.currentAmount}`);
    this.htmlUI.updateCurrency(data.currentAmount);
  }

  private handleScoreUpdate(data: ScoreUpdateData): void {
    logger.debug(`UIScene received SCORE_UPDATED: ${data.currentScore}`);
    this.htmlUI.updateScore(data.currentScore);
  }

  // Updated handler for the new comprehensive weapon state
  private handleWeaponStateUpdate(data: AllWeaponStatesUpdateData): void {
    logger.debug(`UIScene received WEAPON_STATE_UPDATED: ${JSON.stringify(data)}`);

    // Update button styles based on active weapon
    this.htmlUI.updateWeaponButtons(data.activeWeaponId);

    // --- Update All Cooldown/Energy Bars ---
    // Iterate through the progress data received from WeaponManager
    for (const weaponId in data.progress) {
        // Ensure it's a direct property, not from prototype chain
        if (Object.prototype.hasOwnProperty.call(data.progress, weaponId)) {
            const progress = data.progress[weaponId]; // Already calculated (0-1) by WeaponManager
            // Update the corresponding bar in the UI
            this.htmlUI.updateWeaponCooldown(weaponId, progress);
        }
    }
    // --- End Update Bars ---

    // Update upgrade button text/state based on the *active* weapon's cost
    const activeWeaponCost = data.nextUpgradeCosts[data.activeWeaponId];
    this.htmlUI.updateWeaponUpgradeCost(activeWeaponCost); // Use correct method name

    // Update weapon status (level) display for the active weapon
    const activeWeaponLevel = data.levels[data.activeWeaponId];
    this.htmlUI.updateWeaponStatus(data.activeWeaponId, activeWeaponLevel);

    // TODO: Optionally update level display for *all* weapons if UI supports it
    // for (const weaponId in data.levels) {
    //     if (Object.prototype.hasOwnProperty.call(data.levels, weaponId)) {
    //         const level = data.levels[weaponId];
    //         // Assuming a method like this exists or can be added to HtmlUI
    //         // this.htmlUI.updateWeaponLevelDisplay(weaponId, level);
    //     }
    // }
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
    if (this.htmlUI) {
        this.htmlUI.showPauseIndicator();
    } else {
        logger.error(`UIScene: this.htmlUI is not available in handleGamePaused.`);
    }
  }

  // Use arrow function to lexically bind 'this'
  private handleGameResumed = (): void => {
    logger.debug('UIScene received GAME_RESUMED');
    if (this.htmlUI) {
        this.htmlUI.hidePauseIndicator();
    } else {
        logger.error(`UIScene: this.htmlUI is not available in handleGameResumed.`);
    }
  }
}
