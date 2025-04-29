/**
 * Basic logger implementation.
 * Currently logs to the console.
 * Planned: Buffering and sending logs to an external API (M6).
 */
export class Logger {
  // Add export keyword here
  public log(message: string, ...optionalParams: unknown[]): void {
    // eslint-disable-next-line no-console
    console.log(`[LOG] ${message}`, ...optionalParams);
  }

  public warn(message: string, ...optionalParams: unknown[]): void {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${message}`, ...optionalParams);
  }

  public error(message: string, ...optionalParams: unknown[]): void {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, ...optionalParams);
  }

  public debug(message: string, ...optionalParams: unknown[]): void {
    // Only log debug messages if a specific flag is set (e.g., during development)
    // For now, let's always log them, but add a check later if needed.
    // if (import.meta.env.DEV) { // Example check using Vite env variable
    // eslint-disable-next-line no-console
    console.debug(`[DEBUG] ${message}`, ...optionalParams);
    // }
  }

  /**
   * Logs a key game event.
   * Planned: This method will buffer events for sending to an API.
   * @param eventName Name of the event (e.g., 'ENEMY_KILLED', 'WEAPON_UPGRADED')
   * @param data Additional data associated with the event
   */
  public gameEvent(eventName: string, data: Record<string, unknown>): void {
    // For now, just log it to the console
    this.log(`Game Event: ${eventName}`, data);
    // TODO (M6): Implement buffering and sending logic
  }
}

// Export a singleton instance
const logger = new Logger();
export default logger;
