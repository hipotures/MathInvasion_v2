// Define the type for the callback function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventCallback = (...args: any[]) => void;

/**
 * A simple event bus implementation for pub/sub communication.
 */
class EventBus {
  // Use a Map to store event listeners: eventName -> Set<callback>
  private listeners: Map<string, Set<EventCallback>>;

  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribes a callback function to an event.
   * @param eventName The name of the event to subscribe to.
   * @param callback The function to call when the event is emitted.
   */
  on(eventName: string, callback: EventCallback): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)?.add(callback);
  }

  /**
   * Unsubscribes a callback function from an event.
   * @param eventName The name of the event to unsubscribe from.
   * @param callback The callback function to remove.
   */
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

  /**
   * Emits an event, calling all subscribed callback functions.
   * @param eventName The name of the event to emit.
   * @param args Optional arguments to pass to the callback functions.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(eventName: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      // Iterate over a copy of the Set in case a callback modifies the original Set (e.g., unsubscribes itself)
      [...eventListeners].forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }
}

// Export a singleton instance of the EventBus
const eventBus = new EventBus();
export default eventBus;
