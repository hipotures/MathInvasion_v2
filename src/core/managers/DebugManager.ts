import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events';
import logger from '../utils/Logger';
import debugState from '../utils/DebugState';

export default class DebugManager {
  private eventBus: EventBusType;
  private debugPanelVisible: boolean = false;
  private debugData: Record<string, any> = {};

  constructor(eventBusInstance: EventBusType) {
    this.eventBus = eventBusInstance;
    logger.log('DebugManager initialized');

    this.handleDebugToggle = this.handleDebugToggle.bind(this);

    this.eventBus.on(Events.DEBUG_TOGGLE, this.handleDebugToggle);
  }

  private handleDebugToggle(): void {
    debugState.toggleDebugMode();
    // Single concise log message
    logger.log(`Debug mode: ${debugState.isDebugMode ? 'ON' : 'OFF'}`);
    
    this.eventBus.emit(Events.DEBUG_MODE_CHANGED, { isDebugMode: debugState.isDebugMode });
  }

  public updateDebugData(source: string, data: any): void {
    this.debugData[source] = data;
  }

  public getDebugData(): Record<string, any> {
    return this.debugData;
  }

  public destroy(): void {
    this.eventBus.off(Events.DEBUG_TOGGLE, this.handleDebugToggle);
    logger.log('DebugManager destroyed and listeners removed');
  }
}