import Phaser from 'phaser';
import logger from '../../../core/utils/Logger';
import eventBus from '../../../core/events/EventBus';
import debugState from '../../../core/utils/DebugState';
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
    this.handleDebugModeChanged = this.handleDebugModeChanged.bind(this);
  }

  /**
   * Sets up event listeners
   */
  public setupEventListeners(): void {
    logger.debug('GameSceneEventManager: Setting up event listeners');
    
    // Add listener for pause toggle
    eventBus.on(Events.TOGGLE_PAUSE, this.handleTogglePause);
    
    // Add listener for debug mode changes
    eventBus.on(Events.DEBUG_MODE_CHANGED, this.handleDebugModeChanged);
  }

  /**
   * Cleans up event listeners
   */
  public cleanupEventListeners(): void {
    logger.debug('GameSceneEventManager: Cleaning up event listeners');
    
    // Remove pause toggle listener
    eventBus.off(Events.TOGGLE_PAUSE, this.handleTogglePause);
    
    // Remove debug mode listener
    eventBus.off(Events.DEBUG_MODE_CHANGED, this.handleDebugModeChanged);
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
    
    const canvas = this.scene.game.canvas; // Get canvas reference
    const isDebugMode = debugState.isDebugMode;

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
      // Pause tweens
      this.scene.tweens.pauseAll();

      // Disable canvas interaction to allow clicks on HTML elements above it
      if (canvas) {
        canvas.style.pointerEvents = 'none';
        logger.debug('Canvas pointer events disabled (paused)');
      }
      
      eventBus.emit(Events.GAME_PAUSED);
      debugState.setPaused(true); // Set debug state pause
    } else {
      logger.log('Game Resumed');
      debugState.setPaused(false); // Clear debug state pause
      // Resume physics
      this.scene.physics.resume();
      
      // Resume timers
      if (this.enemySpawnerTimer) {
        this.enemySpawnerTimer.paused = false;
      }
      // Resume tweens
      this.scene.tweens.resumeAll();

      // Re-enable canvas interaction ONLY if not in debug mode
      if (canvas) {
        // If in debug mode, keep pointer events disabled to allow clicking labels
        // Otherwise, re-enable pointer events
        canvas.style.pointerEvents = isDebugMode ? 'none' : 'auto';
        logger.debug(`Canvas pointer events ${isDebugMode ? 'kept disabled (debug mode)' : 'enabled'}`);
      }
      
      eventBus.emit(Events.GAME_RESUMED);
    }
  }

  /**
   * Handles changes to debug mode
   * Updates canvas pointer events to allow clicking on HTML elements in debug mode
   */
  private handleDebugModeChanged(data: { isDebugMode: boolean }): void {
    const canvas = this.scene.game.canvas;
    if (!canvas) return;
    
    if (data.isDebugMode) {
      // In debug mode, disable canvas pointer events to allow clicking HTML elements
      canvas.style.pointerEvents = 'none';
      logger.debug('Canvas pointer events disabled (debug mode activated)');
    } else if (!this.isPaused) {
      // Only re-enable if not paused
      canvas.style.pointerEvents = 'auto';
      logger.debug('Canvas pointer events enabled (debug mode deactivated)');
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