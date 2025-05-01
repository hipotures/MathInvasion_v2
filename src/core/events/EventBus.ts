// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventCallback = (...args: any[]) => void;

export class EventBus { // Add 'export' here
  // Use a Map to store event listeners: eventName -> Set<callback>
  private listeners: Map<string, Set<EventCallback>>;

  constructor() {
    this.listeners = new Map();
  }

  on(eventName: string, callback: EventCallback): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)?.add(callback);
  }

  off(eventName: string, callback: EventCallback): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.delete(callback);
      // Optional: Remove the Set if it becomes empty
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(eventName: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      // Iterate over a copy of the Set in case a callback modifies the original Set (e.g., unsubscribes itself)
      [...eventListeners].forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }
}

const eventBus = new EventBus();
export default eventBus;
