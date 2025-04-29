// Import singleton instances
import eventBus from '../events/EventBus';
import logger from '../utils/Logger';
// Import class type for annotations
import { EventBus as EventBusType } from '../events/EventBus';

/**
 * Manages player input from various sources (keyboard, mouse, touch).
 * Translates raw input into game actions and emits events.
 */
// Define constants for event names
const MOVE_LEFT_START = 'MOVE_LEFT_START';
const MOVE_LEFT_STOP = 'MOVE_LEFT_STOP';
const MOVE_RIGHT_START = 'MOVE_RIGHT_START';
const MOVE_RIGHT_STOP = 'MOVE_RIGHT_STOP';
const FIRE_START = 'FIRE_START';
const FIRE_STOP = 'FIRE_STOP';
// TODO: Add SWITCH_WEAPON event later

export default class InputManager {
  private eventBus: EventBusType;
  private moveLeftActive: boolean = false;
  private moveRightActive: boolean = false;
  private fireActive: boolean = false;

  constructor(eventBusInstance: EventBusType) {
    this.eventBus = eventBusInstance;
    logger.log('InputManager initialized');
    // Bind methods to ensure 'this' context is correct
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    // Add global event listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    // TODO: Add listeners for mouse/touch later
  }

  // Methods for processing input and emitting events

  public update(deltaTime: number): void {
    // TODO: Implement input polling/processing if needed
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Prevent multiple events firing if key is held down
    if (event.repeat) return;

    switch (event.key) {
      case 'a':
      case 'ArrowLeft':
        if (!this.moveLeftActive) {
          logger.debug('Move Left Started');
          this.moveLeftActive = true;
          this.eventBus.emit(MOVE_LEFT_START);
        }
        break;
      case 'd':
      case 'ArrowRight':
        if (!this.moveRightActive) {
          logger.debug('Move Right Started');
          this.moveRightActive = true;
          this.eventBus.emit(MOVE_RIGHT_START);
        }
        break;
      case ' ': // Spacebar for firing
        if (!this.fireActive) {
          logger.debug('Fire Started');
          this.fireActive = true;
          this.eventBus.emit(FIRE_START);
        }
        break;
      // TODO: Add cases for weapon switching keys
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    switch (event.key) {
      case 'a':
      case 'ArrowLeft':
        if (this.moveLeftActive) {
          logger.debug('Move Left Stopped');
          this.moveLeftActive = false;
          this.eventBus.emit(MOVE_LEFT_STOP);
        }
        break;
      case 'd':
      case 'ArrowRight':
        if (this.moveRightActive) {
          logger.debug('Move Right Stopped');
          this.moveRightActive = false;
          this.eventBus.emit(MOVE_RIGHT_STOP);
        }
        break;
      case ' ': // Spacebar for firing
        if (this.fireActive) {
          logger.debug('Fire Stopped');
          this.fireActive = false;
          this.eventBus.emit(FIRE_STOP); // Emit stop event if needed, though often only START matters for triggering shots
        }
        break;
      // TODO: Add cases for weapon switching keys
    }
  }

  /** Clean up event listeners when the manager is destroyed */
  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    logger.log('InputManager destroyed and listeners removed');
  }

  // TODO: Add methods for mouse/touch input if required
}
