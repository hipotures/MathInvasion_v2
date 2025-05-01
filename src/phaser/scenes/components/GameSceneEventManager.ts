import Phaser from 'phaser';
import logger from '../../../core/utils/Logger';
import eventBus from '../../../core/events/EventBus';
import * as Events from '../../../core/constants/events';
import { GameObjects } from '../types/GameSceneTypes';

/**
 * Handles event setup and management for the game scene
 */
export class GameSceneEventManager {
  private scene: Phaser.Scene;
  private gameObjects: GameObjects;
  private enemySpawnerTimer: Phaser.Time.TimerEvent | null = null;
  private isPaused: boolean = false;

  constructor(scene: Phaser.Scene, gameObjects: GameObjects) {
    this.scene = scene;
    this.gameObjects = gameObjects;

    // Bind event handlers
    this.handleTogglePause = this.handleTogglePause.bind(this);
  }

  /**
   * Sets up event listeners
   */
  public setupEventListeners(): void {
    logger.debug('GameSceneEventManager: Setting up event listeners');
    
    // Add listener for pause toggle
    eventBus.on(Events.TOGGLE_PAUSE, this.handleTogglePause);
  }

  /**
   * Cleans up event listeners
   */
  public cleanupEventListeners(): void {
    logger.debug('GameSceneEventManager: Cleaning up event listeners');
    
    // Remove pause toggle listener
    eventBus.off(Events.TOGGLE_PAUSE, this.handleTogglePause);
  }

  /**
   * Sets the enemy spawner timer
   * @param timer The enemy spawner timer
   */
  public setEnemySpawnerTimer(timer: Phaser.Time.TimerEvent): void {
    this.enemySpawnerTimer = timer;
  }

  /**
   * Handles toggling the game pause state
   */
  private handleTogglePause(): void {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      logger.log('Game Paused');
      // Instead of using scene.pause(), we'll implement a custom pause
      // that allows debug functionality to still work
      // this.scene.pause(); // Don't use this as it stops all input events
      
      // Pause physics
      this.scene.physics.pause();
      
      // Pause timers
      if (this.enemySpawnerTimer) {
        this.enemySpawnerTimer.paused = true;
      }
      
      eventBus.emit(Events.GAME_PAUSED);
    } else {
      logger.log('Game Resumed');
      // Resume physics
      this.scene.physics.resume();
      
      // Resume timers
      if (this.enemySpawnerTimer) {
        this.enemySpawnerTimer.paused = false;
      }
      
      eventBus.emit(Events.GAME_RESUMED);
    }
  }

  /**
   * Gets the current pause state
   * @returns Whether the game is paused
   */
  public isPauseActive(): boolean {
    return this.isPaused;
  }

  /**
   * Cleans up resources used by this manager
   */
  public destroy(): void {
    this.cleanupEventListeners();
    
    // Clean up timer if it exists
    if (this.enemySpawnerTimer) {
      this.enemySpawnerTimer.destroy();
      this.enemySpawnerTimer = null;
    }
    
    logger.log('GameSceneEventManager destroyed');
  }
}