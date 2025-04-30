import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events';
import logger from '../utils/Logger';
import debugState from '../utils/DebugState';

/**
 * Manages debug state and functionality
 */
export default class DebugManager {
  private eventBus: EventBusType;
  private debugPanelVisible: boolean = false;
  private debugData: Record<string, any> = {};

  constructor(eventBusInstance: EventBusType) {
    this.eventBus = eventBusInstance;
    logger.log('DebugManager initialized');

    // Bind methods
    this.handleDebugToggle = this.handleDebugToggle.bind(this);

    // Subscribe to events
    this.eventBus.on(Events.DEBUG_TOGGLE, this.handleDebugToggle);
  }

  private handleDebugToggle(): void {
    debugState.toggleDebugMode();
    logger.log(`Debug mode ${debugState.isDebugMode ? 'enabled' : 'disabled'}`);
    
    // Emit an event to notify all scenes about the debug mode change
    this.eventBus.emit(Events.DEBUG_MODE_CHANGED, { isDebugMode: debugState.isDebugMode });
  }

  /**
   * Update debug data for a specific manager or component
   * @param source The name of the manager or component
   * @param data The data to display in the debug panel
   */
  public updateDebugData(source: string, data: any): void {
    this.debugData[source] = data;
  }

  /**
   * Get all debug data
   */
  public getDebugData(): Record<string, any> {
    return this.debugData;
  }

  /** Clean up event listeners when the manager is destroyed */
  public destroy(): void {
    this.eventBus.off(Events.DEBUG_TOGGLE, this.handleDebugToggle);
    logger.log('DebugManager destroyed and listeners removed');
  }
}