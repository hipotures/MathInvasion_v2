// Import singleton instances
// import eventBus from '../events/EventBus'; // Removed - instance passed in constructor
import logger from '../utils/Logger';
// Import class type for annotations
import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events'; // Import event constants

/**
 * Manages player input from various sources (keyboard, mouse, touch).
 * Translates raw input into game actions and emits events.
 */
// TODO: Add SWITCH_WEAPON event later

export default class InputManager {
  private eventBus: EventBusType;
  private moveLeftActive: boolean = false;
  private moveRightActive: boolean = false;
  private fireActive: boolean = false;
  private isPaused: boolean = false; // Pause state flag

  constructor(eventBusInstance: EventBusType) {
    this.eventBus = eventBusInstance;
    logger.log('InputManager initialized');
    // Bind methods to ensure 'this' context is correct
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleGamePaused = this.handleGamePaused.bind(this); // Bind pause handlers
    this.handleGameResumed = this.handleGameResumed.bind(this); // Bind pause handlers
    // Add global event listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    // Listen for pause events
    this.eventBus.on(Events.GAME_PAUSED, this.handleGamePaused);
    this.eventBus.on(Events.GAME_RESUMED, this.handleGameResumed);
    // TODO: Add listeners for mouse/touch later
  }

  // Methods for processing input and emitting events

  public update(_deltaTime: number): void {
    // Prefix with underscore
    // TODO: Implement input polling/processing if needed
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Prevent multiple events firing if key is held down
    if (event.repeat) return;

    // If paused, only allow the 'P' key to unpause
    if (this.isPaused && event.key !== 'p' && event.key !== 'P') {
      return;
    }

    switch (event.key) {
      case 'a':
      case 'ArrowLeft':
        if (!this.moveLeftActive) {
          logger.debug('Move Left Started');
          this.moveLeftActive = true;
          this.eventBus.emit(Events.MOVE_LEFT_START);
        }
        break;
      case 'd':
      case 'ArrowRight':
        if (!this.moveRightActive) {
          logger.debug('Move Right Started');
          this.moveRightActive = true;
          this.eventBus.emit(Events.MOVE_RIGHT_START);
        }
        break;
      case ' ': // Spacebar for firing
        if (!this.fireActive) {
          logger.debug('Fire Started');
          this.fireActive = true;
          this.eventBus.emit(Events.FIRE_START);
        }
        break;
      // Weapon Switching Keys
      case '1':
        logger.debug('Weapon Switch Key 1 pressed');
        this.eventBus.emit(Events.WEAPON_SWITCH, 'bullet');
        break;
      case '2':
        logger.debug('Weapon Switch Key 2 pressed');
        this.eventBus.emit(Events.WEAPON_SWITCH, 'laser');
        break;
      case '3':
        logger.debug('Weapon Switch Key 3 pressed');
        this.eventBus.emit(Events.WEAPON_SWITCH, 'slow_field');
        break;
      // Weapon Upgrade Key
      case 'u':
      case 'U':
        logger.debug('Weapon Upgrade Key U pressed');
        this.eventBus.emit(Events.REQUEST_WEAPON_UPGRADE); // No payload needed
        break;
      case ';':
        logger.debug('Debug Toggle Key ; pressed');
        this.eventBus.emit(Events.DEBUG_TOGGLE); // Toggle debug mode
        break;
      case 'p':
      case 'P':
        logger.debug('Pause Toggle Key P pressed');
        this.eventBus.emit(Events.TOGGLE_PAUSE);
        break;
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    switch (event.key) {
      case 'a':
      case 'ArrowLeft':
        if (this.moveLeftActive) {
          logger.debug('Move Left Stopped');
          this.moveLeftActive = false;
          this.eventBus.emit(Events.MOVE_LEFT_STOP);
        }
        break;
      case 'd':
      case 'ArrowRight':
        if (this.moveRightActive) {
          logger.debug('Move Right Stopped');
          this.moveRightActive = false;
          this.eventBus.emit(Events.MOVE_RIGHT_STOP);
        }
        break;
      case ' ': // Spacebar for firing
        if (this.fireActive) {
          logger.debug('Fire Stopped');
          this.fireActive = false;
          this.eventBus.emit(Events.FIRE_STOP); // Emit stop event if needed, though often only START matters for triggering shots
        }
        break;
      // TODO: Add cases for weapon switching keys
    }
  }

  /** Clean up event listeners when the manager is destroyed */
  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.eventBus.off(Events.GAME_PAUSED, this.handleGamePaused);
    this.eventBus.off(Events.GAME_RESUMED, this.handleGameResumed);
    logger.log('InputManager destroyed and listeners removed');
  }

  // --- Pause Event Handlers ---

  private handleGamePaused(): void {
    this.isPaused = true;
    logger.debug('InputManager paused');
  }

  private handleGameResumed(): void {
    this.isPaused = false;
    logger.debug('InputManager resumed');
    // Reset movement/fire states on resume to prevent sticky keys
    this.moveLeftActive = false;
    this.moveRightActive = false;
    this.fireActive = false;
    // Optionally emit STOP events if needed, though GameScene pause should handle entity state
    // this.eventBus.emit(Events.MOVE_LEFT_STOP);
    // this.eventBus.emit(Events.MOVE_RIGHT_STOP);
    // this.eventBus.emit(Events.FIRE_STOP);
  }

  // TODO: Add methods for mouse/touch input if required
}
