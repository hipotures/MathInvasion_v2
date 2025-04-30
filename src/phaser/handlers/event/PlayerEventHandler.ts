import Phaser from 'phaser';
import eventBus from '../../../core/events/EventBus';
import logger from '../../../core/utils/Logger';
import { PlayerState } from '../../../core/types/PlayerState';
import * as Events from '../../../core/constants/events';
import * as Assets from '../../../core/constants/assets'; // Import assets constants

export class PlayerEventHandler {
  private scene: Phaser.Scene;
  private tweens: Phaser.Tweens.TweenManager;
  private time: Phaser.Time.Clock;
  private playerSprite: Phaser.Physics.Arcade.Sprite;
  private enemySpawnerTimerRef?: Phaser.Time.TimerEvent; // To potentially stop it on death
  private gameOverTextRef?: Phaser.GameObjects.Text; // To potentially create it on death
  private playerInvulnerabilityTween?: Phaser.Tweens.Tween; // To manage blinking tween

  constructor(scene: Phaser.Scene, playerSprite: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene;
    this.tweens = scene.tweens;
    this.time = scene.time;
    this.playerSprite = playerSprite;

    // Bind methods
    this.handlePlayerStateUpdate = this.handlePlayerStateUpdate.bind(this);
    this.handlePlayerDied = this.handlePlayerDied.bind(this);
    this.handlePlayerInvulnerabilityStart = this.handlePlayerInvulnerabilityStart.bind(this);
    this.handlePlayerInvulnerabilityEnd = this.handlePlayerInvulnerabilityEnd.bind(this);

    // Register listeners
    eventBus.on(Events.PLAYER_STATE_UPDATED, this.handlePlayerStateUpdate);
    eventBus.on(Events.PLAYER_DIED, this.handlePlayerDied);
    eventBus.on(Events.PLAYER_INVULNERABILITY_START, this.handlePlayerInvulnerabilityStart);
    eventBus.on(Events.PLAYER_INVULNERABILITY_END, this.handlePlayerInvulnerabilityEnd);
  }

  // Pass references needed for player death sequence
  public setEnemySpawnerTimer(timer: Phaser.Time.TimerEvent): void {
    this.enemySpawnerTimerRef = timer;
  }

  // --- Event Handlers ---

  public handlePlayerStateUpdate(state: PlayerState): void {
    // Only handle velocity updates here, other state might be UI related
    if (this.playerSprite?.body) {
      this.playerSprite.setVelocityX(state.velocityX);
      // Note: Invulnerability state change is handled by separate events now
    }
  }

  public handlePlayerDied(): void {
    logger.log('Game Over - Player Died');
    if (this.enemySpawnerTimerRef) this.enemySpawnerTimerRef.destroy(); // Stop spawner

    if (this.playerSprite?.active) {
      const playerX = this.playerSprite.x;
      const playerY = this.playerSprite.y;

      // 1. Play explosion sound
      this.scene.sound.play(Assets.AUDIO_EXPLOSION_SMALL_KEY); // Use Assets import

      // 2. Add visual explosion effect
      const explosionRadius = 40; // Smaller radius for player death
      const explosionCore = this.scene.add.circle(
        playerX,
        playerY,
        explosionRadius * 0.1,
        0xffffff,
        1
      );
      const explosionRing = this.scene.add.circle(
        playerX,
        playerY,
        explosionRadius * 0.15,
        0xffff00,
        0.8
      ); // Yellow ring

      this.tweens.add({
        targets: explosionCore,
        radius: explosionRadius * 0.3,
        alpha: 0,
        duration: 150, // Faster than bomb
        ease: 'Quad.easeOut',
        onComplete: () => explosionCore.destroy(),
      });
      this.tweens.add({
        targets: explosionRing,
        radius: explosionRadius,
        alpha: 0,
        duration: 300, // Faster than bomb
        ease: 'Quad.easeOut',
        onComplete: () => explosionRing.destroy(),
      });

      // 3. Existing player sprite tween (disable body first)
      this.playerSprite.disableBody(true, false); // Disable physics immediately
      this.tweens.add({
        targets: this.playerSprite,
        duration: 200, // Slightly faster fade/shrink
        alpha: 0,
        scale: 0.5,
        angle: 90,
        tint: 0xff0000,
        ease: 'Power2',
        onComplete: () => {
          this.playerSprite.setVisible(false);
        },
      });
    }
    this.time.delayedCall(500, () => {
      const { width, height, x, y } = this.scene.cameras.main.worldView;
      this.gameOverTextRef = this.scene.add
        .text(x + width / 2, y + height / 2, 'GAME OVER', {
          fontSize: '64px',
          color: '#ff0000',
          align: 'center',
        })
        .setOrigin(0.5);
    });
    // Optional: Restart logic
    // this.time.delayedCall(3500, () => { this.scene.scene.restart(); });
  }

  // --- Invulnerability Visuals ---

  private handlePlayerInvulnerabilityStart(): void {
    if (!this.playerSprite?.active) return;
    if (this.playerInvulnerabilityTween) {
      this.playerInvulnerabilityTween.stop();
    }
    this.playerInvulnerabilityTween = this.tweens.add({
      targets: this.playerSprite,
      alpha: 0.5,
      duration: 150,
      ease: 'Linear',
      yoyo: true,
      repeat: -1,
    });
  }

  private handlePlayerInvulnerabilityEnd(): void {
    if (this.playerInvulnerabilityTween) {
      this.playerInvulnerabilityTween.stop();
      this.playerInvulnerabilityTween = undefined;
    }
    if (this.playerSprite?.active) {
      this.playerSprite.setAlpha(1);
    }
  }

  /** Clean up event listeners */
  public destroy(): void {
    eventBus.off(Events.PLAYER_STATE_UPDATED, this.handlePlayerStateUpdate);
    eventBus.off(Events.PLAYER_DIED, this.handlePlayerDied);
    eventBus.off(Events.PLAYER_INVULNERABILITY_START, this.handlePlayerInvulnerabilityStart);
    eventBus.off(Events.PLAYER_INVULNERABILITY_END, this.handlePlayerInvulnerabilityEnd);
    if (this.playerInvulnerabilityTween) {
      this.playerInvulnerabilityTween.stop();
    }
    logger.log('PlayerEventHandler destroyed and listeners removed');
  }
}
