import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import * as Events from '../../core/constants/events'; // Import event constants
import { type PlayerState } from '../../core/types/PlayerState'; // Import PlayerState type

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
  private currencyText!: Phaser.GameObjects.Text; // Definite assignment assertion
  private waveText!: Phaser.GameObjects.Text; // For displaying wave number
  private weaponButton1!: Phaser.GameObjects.Text;
  private weaponButton2!: Phaser.GameObjects.Text;
  private weaponButton3!: Phaser.GameObjects.Text;
  private weaponStatusText!: Phaser.GameObjects.Text; // For displaying name/level
  private weaponUpgradeCostText!: Phaser.GameObjects.Text; // For displaying upgrade cost
  private weaponButtons: Phaser.GameObjects.Text[] = []; // Array for easier management
  private healthText!: Phaser.GameObjects.Text; // For displaying player health
  private scoreText!: Phaser.GameObjects.Text; // For displaying score

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

    // --- Weapon Upgrade Cost Display ---
    this.weaponUpgradeCostText = this.add
      .text(screenWidth / 2, buttonY - 20, 'Upgrade Cost: -', {
        // Position above status text
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#cccccc', // Lighter grey
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

    // --- Score Display ---
    this.scoreText = this.add
      .text(screenWidth - 10, 10, 'Score: 0', {
        // Position top-right
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        align: 'right', // Align text to the right
      })
      .setOrigin(1, 0) // Set origin to top-right
      .setScrollFactor(0);

    // --- Wave Display ---
    this.waveText = this.add
      .text(screenWidth - 10, 40, 'Wave: 1', {
        // Position below score
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        align: 'right',
      })
      .setOrigin(1, 0) // Top-right origin
      .setScrollFactor(0);

    // Bind methods
    this.handleCurrencyUpdate = this.handleCurrencyUpdate.bind(this);
    this.handleWeaponStateUpdate = this.handleWeaponStateUpdate.bind(this); // Bind new handler
    this.handlePlayerStateUpdate = this.handlePlayerStateUpdate.bind(this); // Bind health handler
    this.handleScoreUpdate = this.handleScoreUpdate.bind(this); // Bind score handler
    this.handleWaveUpdate = this.handleWaveUpdate.bind(this); // Bind wave handler

    // --- Event Listeners ---
    eventBus.on(Events.CURRENCY_UPDATED, this.handleCurrencyUpdate);
    eventBus.on(Events.WEAPON_STATE_UPDATED, this.handleWeaponStateUpdate); // Listen for weapon state
    eventBus.on(Events.PLAYER_STATE_UPDATED, this.handlePlayerStateUpdate); // Listen for player state
    eventBus.on(Events.SCORE_UPDATED, this.handleScoreUpdate); // Listen for score updates
    eventBus.on(Events.WAVE_UPDATED, this.handleWaveUpdate); // Listen for wave updates

    // Clean up listeners when the scene is shut down
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      logger.log('UIScene shutdown, removing listeners');
      eventBus.off(Events.CURRENCY_UPDATED, this.handleCurrencyUpdate);
      eventBus.off(Events.WEAPON_STATE_UPDATED, this.handleWeaponStateUpdate); // Unsubscribe weapon state
      eventBus.off(Events.PLAYER_STATE_UPDATED, this.handlePlayerStateUpdate); // Unsubscribe player state
      eventBus.off(Events.SCORE_UPDATED, this.handleScoreUpdate); // Unsubscribe score updates
      eventBus.off(Events.WAVE_UPDATED, this.handleWaveUpdate); // Unsubscribe wave updates
    });

    // Request initial currency state (EconomyManager emits it on init, but good practice)
    // eventBus.emit('REQUEST_CURRENCY_STATE'); // Need EconomyManager to listen for this
  }

  private handleCurrencyUpdate(data: { currentAmount: number }): void {
    logger.debug(`UIScene received CURRENCY_UPDATED: ${data.currentAmount}`);
    this.currencyText.setText(`Currency: ${data.currentAmount}`);
  }

  private handleScoreUpdate(data: { currentScore: number }): void {
    logger.debug(`UIScene received SCORE_UPDATED: ${data.currentScore}`);
    this.scoreText.setText(`Score: ${data.currentScore}`);
  }

  private handleWeaponStateUpdate(data: WeaponStateUpdateData): void {
    logger.debug(`UIScene received WEAPON_STATE_UPDATED: ${JSON.stringify(data)}`);

    // Update status text (Name & Level)
    const weaponName = data.weaponId.charAt(0).toUpperCase() + data.weaponId.slice(1); // Capitalize
    this.weaponStatusText.setText(`Weapon: ${weaponName} Lvl: ${data.level}`);

    // Update upgrade cost text
    if (data.nextUpgradeCost !== null) {
      this.weaponUpgradeCostText.setText(`Upgrade Cost: ${data.nextUpgradeCost}`);
      this.weaponUpgradeCostText.setVisible(true);
    } else {
      this.weaponUpgradeCostText.setText('Max Level'); // Or just hide it
      // this.weaponUpgradeCostText.setVisible(false);
    }

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
        // Check if this button wasn't already active (to avoid tweening unnecessarily)
        const wasActive = button.style.color === activeColor;
        button.setColor(activeColor);
        button.setBackgroundColor(activeBgColor);
        // Add a quick scale tween if it just became active
        if (!wasActive) {
          this.tweens.add({
            targets: button,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 100,
            yoyo: true, // Scale back down
            ease: 'Quad.easeInOut',
          });
        }
      } else {
        button.setColor(inactiveColor);
        button.setBackgroundColor(inactiveBgColor);
        button.setScale(1); // Ensure inactive buttons are at normal scale
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

  private handleWaveUpdate(data: WaveUpdateData): void {
    logger.debug(`UIScene received WAVE_UPDATED: ${data.waveNumber}`);
    this.waveText.setText(`Wave: ${data.waveNumber}`);
  }

  // update(time: number, delta: number): void {
  //   // UI updates are mostly event-driven
  // }
}
