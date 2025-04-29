import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';

// Define constants for event names
const CURRENCY_UPDATED = 'CURRENCY_UPDATED';

export default class UIScene extends Phaser.Scene {
  private currencyText!: Phaser.GameObjects.Text; // Definite assignment assertion

  constructor() {
    super({ key: 'UIScene' });
  }

  preload(): void {
    // No assets needed for basic text UI yet
  }

  create(): void {
    logger.log('UIScene created');

    // --- Currency Display ---
    // TODO: Position more precisely, potentially load style from config
    this.currencyText = this.add.text(10, 10, 'Currency: 0', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      // stroke: '#000000',
      // strokeThickness: 4,
    });
    this.currencyText.setScrollFactor(0); // Keep UI fixed on screen

    // Bind methods
    this.handleCurrencyUpdate = this.handleCurrencyUpdate.bind(this);

    // --- Event Listeners ---
    eventBus.on(CURRENCY_UPDATED, this.handleCurrencyUpdate); // Remove 'this' context argument

    // Clean up listeners when the scene is shut down
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      logger.log('UIScene shutdown, removing listeners');
      eventBus.off(CURRENCY_UPDATED, this.handleCurrencyUpdate); // Remove 'this' context argument
    });

    // Request initial currency state (EconomyManager emits it on init, but good practice)
    // eventBus.emit('REQUEST_CURRENCY_STATE'); // Need EconomyManager to listen for this
  }

  private handleCurrencyUpdate(data: { currentAmount: number }): void {
    logger.debug(`UIScene received CURRENCY_UPDATED: ${data.currentAmount}`);
    this.currencyText.setText(`Currency: ${data.currentAmount}`);
  }

  // update(time: number, delta: number): void {
  //   // UI updates are mostly event-driven
  // }
}
