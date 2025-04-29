import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import * as Events from '../../core/constants/events'; // Import event constants

export default class UIScene extends Phaser.Scene {
  private currencyText!: Phaser.GameObjects.Text; // Definite assignment assertion
  private weaponButton1!: Phaser.GameObjects.Text;
  private weaponButton2!: Phaser.GameObjects.Text;
  private weaponButton3!: Phaser.GameObjects.Text;

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

    // --- Weapon Buttons (Non-functional placeholders) ---
    const buttonStyle = {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#dddddd',
      backgroundColor: '#555555',
      padding: { x: 10, y: 5 },
    };
    const screenWidth = this.cameras.main.width;
    const buttonY = this.cameras.main.height - 40;

    this.weaponButton1 = this.add
      .text(screenWidth * 0.3, buttonY, '[1] Bullet', buttonStyle)
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.weaponButton2 = this.add
      .text(screenWidth * 0.5, buttonY, '[2] Laser', buttonStyle)
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.weaponButton3 = this.add
      .text(screenWidth * 0.7, buttonY, '[3] Slow', buttonStyle)
      .setOrigin(0.5)
      .setScrollFactor(0);

    // TODO: Add interactivity later to emit WEAPON_SWITCH event on click/tap
    // this.weaponButton1.setInteractive().on('pointerdown', () => eventBus.emit(Events.WEAPON_SWITCH, { weaponId: 'bullet' }));
    // this.weaponButton2.setInteractive().on('pointerdown', () => eventBus.emit(Events.WEAPON_SWITCH, { weaponId: 'laser' }));
    // this.weaponButton3.setInteractive().on('pointerdown', () => eventBus.emit(Events.WEAPON_SWITCH, { weaponId: 'slow_field' }));
    // TODO: Add visual feedback for the currently selected weapon (e.g., change background color)

    // Bind methods
    this.handleCurrencyUpdate = this.handleCurrencyUpdate.bind(this);
    // TODO: Bind weapon switch handler if needed for UI updates

    // --- Event Listeners ---
    eventBus.on(Events.CURRENCY_UPDATED, this.handleCurrencyUpdate);
    // TODO: Listen for WEAPON_SWITCHED event from WeaponManager to update button appearance

    // Clean up listeners when the scene is shut down
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      logger.log('UIScene shutdown, removing listeners');
      eventBus.off(Events.CURRENCY_UPDATED, this.handleCurrencyUpdate);
      // TODO: Unsubscribe from WEAPON_SWITCHED event
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
