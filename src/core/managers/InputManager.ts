import logger from '../utils/Logger';
import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events';

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
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleGamePaused = this.handleGamePaused.bind(this);
    this.handleGameResumed = this.handleGameResumed.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.eventBus.on(Events.GAME_PAUSED, this.handleGamePaused);
    this.eventBus.on(Events.GAME_RESUMED, this.handleGameResumed);
    // TODO: Add listeners for mouse/touch later
  }

  public update(_deltaTime: number): void {
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
          logger.debug('InputManager: Fire Started - Emitting FIRE_START event');
          this.fireActive = true;
          try {
            this.eventBus.emit(Events.FIRE_START);
            logger.debug('InputManager: FIRE_START event emitted successfully');
          } catch (error) {
            logger.error(`InputManager: Error emitting FIRE_START event: ${error}`);
          }
        }
        break;
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
      case 'u':
      case 'U':
        logger.debug('Weapon Upgrade Key U pressed');
        this.eventBus.emit(Events.REQUEST_WEAPON_UPGRADE);
        break;
      case ';':
        logger.debug('Debug Toggle Key ; pressed');
        this.eventBus.emit(Events.DEBUG_TOGGLE);
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
          logger.debug('InputManager: Fire Stopped - Emitting FIRE_STOP event');
          this.fireActive = false;
          try {
            this.eventBus.emit(Events.FIRE_STOP);
            logger.debug('InputManager: FIRE_STOP event emitted successfully');
          } catch (error) {
            logger.error(`InputManager: Error emitting FIRE_STOP event: ${error}`);
          }
        }
        break;
      // TODO: Add cases for weapon switching keys
    }
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.eventBus.off(Events.GAME_PAUSED, this.handleGamePaused);
    this.eventBus.off(Events.GAME_RESUMED, this.handleGameResumed);
    logger.log('InputManager destroyed and listeners removed');
  }

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
  }

  // TODO: Add methods for mouse/touch input if required
}
