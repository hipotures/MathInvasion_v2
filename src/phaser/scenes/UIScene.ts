import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import * as Events from '../../core/constants/events'; // Import event constants
import { type PlayerState } from '../../core/types/PlayerState'; // Import PlayerState type

/** Defines the data expected for the WEAPON_STATE_UPDATED event */
interface WeaponStateUpdateData {
  weaponId: string;
  level: number;
}

export default class UIScene extends Phaser.Scene {
  private currencyText!: Phaser.GameObjects.Text; // Definite assignment assertion
  private weaponButton1!: Phaser.GameObjects.Text;
  private weaponButton2!: Phaser.GameObjects.Text;
  private weaponButton3!: Phaser.GameObjects.Text;
  private weaponStatusText!: Phaser.GameObjects.Text; // For displaying name/level
  private weaponButtons: Phaser.GameObjects.Text[] = []; // Array for easier management
  private healthText!: Phaser.GameObjects.Text; // For displaying player health

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

    // Store buttons in array for easier access
    this.weaponButtons = [this.weaponButton1, this.weaponButton2, this.weaponButton3];

    // Add interactivity to emit WEAPON_SWITCH event on click/tap
    this.weaponButton1
      .setInteractive()
      .on('pointerdown', () => eventBus.emit(Events.WEAPON_SWITCH, 'bullet'));
    this.weaponButton2
      .setInteractive()
      .on('pointerdown', () => eventBus.emit(Events.WEAPON_SWITCH, 'laser'));
    this.weaponButton3
      .setInteractive()
      .on('pointerdown', () => eventBus.emit(Events.WEAPON_SWITCH, 'slow_field'));

    // --- Weapon Status Display ---
    this.weaponStatusText = this.add
      .text(screenWidth / 2, buttonY - 40, 'Weapon: - Lvl: -', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    // --- Health Display ---
    this.healthText = this.add
      .text(10, 40, 'Health: -', {
        // Position below currency
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#00ff00', // Green for health
      })
      .setScrollFactor(0);

    // Bind methods
    this.handleCurrencyUpdate = this.handleCurrencyUpdate.bind(this);
    this.handleWeaponStateUpdate = this.handleWeaponStateUpdate.bind(this); // Bind new handler
    this.handlePlayerStateUpdate = this.handlePlayerStateUpdate.bind(this); // Bind health handler

    // --- Event Listeners ---
    eventBus.on(Events.CURRENCY_UPDATED, this.handleCurrencyUpdate);
    eventBus.on(Events.WEAPON_STATE_UPDATED, this.handleWeaponStateUpdate); // Listen for weapon state
    eventBus.on(Events.PLAYER_STATE_UPDATED, this.handlePlayerStateUpdate); // Listen for player state

    // Clean up listeners when the scene is shut down
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      logger.log('UIScene shutdown, removing listeners');
      eventBus.off(Events.CURRENCY_UPDATED, this.handleCurrencyUpdate);
      eventBus.off(Events.WEAPON_STATE_UPDATED, this.handleWeaponStateUpdate); // Unsubscribe weapon state
      eventBus.off(Events.PLAYER_STATE_UPDATED, this.handlePlayerStateUpdate); // Unsubscribe player state
    });

    // Request initial currency state (EconomyManager emits it on init, but good practice)
    // eventBus.emit('REQUEST_CURRENCY_STATE'); // Need EconomyManager to listen for this
  }

  private handleCurrencyUpdate(data: { currentAmount: number }): void {
    logger.debug(`UIScene received CURRENCY_UPDATED: ${data.currentAmount}`);
    this.currencyText.setText(`Currency: ${data.currentAmount}`);
  }

  private handleWeaponStateUpdate(data: WeaponStateUpdateData): void {
    logger.debug(`UIScene received WEAPON_STATE_UPDATED: ${JSON.stringify(data)}`);
    // Update status text
    const weaponName = data.weaponId.charAt(0).toUpperCase() + data.weaponId.slice(1); // Capitalize
    this.weaponStatusText.setText(`Weapon: ${weaponName} Lvl: ${data.level}`);

    // Update button appearance (highlight active)
    const activeColor = '#ffff00'; // Yellow for active
    const inactiveColor = '#dddddd'; // Default grey
    const activeBgColor = '#888800'; // Darker yellow bg
    const inactiveBgColor = '#555555'; // Default grey bg

    this.weaponButtons.forEach((button) => {
      // Extract the weapon ID from the button text (simple approach)
      const buttonText = button.text.toLowerCase();
      let buttonWeaponId = '';
      if (buttonText.includes('bullet')) buttonWeaponId = 'bullet';
      else if (buttonText.includes('laser')) buttonWeaponId = 'laser';
      else if (buttonText.includes('slow')) buttonWeaponId = 'slow_field'; // Match the ID used in emit

      if (buttonWeaponId === data.weaponId) {
        button.setColor(activeColor);
        button.setBackgroundColor(activeBgColor);
      } else {
        button.setColor(inactiveColor);
        button.setBackgroundColor(inactiveBgColor);
      }
    });
  }

  private handlePlayerStateUpdate(data: PlayerState): void {
    logger.debug(`UIScene received PLAYER_STATE_UPDATED: Health=${data.health}`);
    this.healthText.setText(`Health: ${data.health}`);
    // Optional: Change color based on health percentage
    if (data.health < 30) {
      this.healthText.setColor('#ff0000'); // Red when low
    } else if (data.health < 60) {
      this.healthText.setColor('#ffff00'); // Yellow when medium
    } else {
      this.healthText.setColor('#00ff00'); // Green when high
    }
  }

  // update(time: number, delta: number): void {
  //   // UI updates are mostly event-driven
  // }
}
