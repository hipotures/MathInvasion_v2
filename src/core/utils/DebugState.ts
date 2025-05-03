class DebugState {
  private static instance: DebugState;
  private _isDebugMode: boolean = false;
  private _isPaused: boolean = false;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): DebugState {
    if (!DebugState.instance) {
      DebugState.instance = new DebugState();
    }
    return DebugState.instance;
  }

  public get isDebugMode(): boolean {
    return this._isDebugMode;
  }

  public toggleDebugMode(): void {
    this._isDebugMode = !this._isDebugMode;
  }

  public get isPaused(): boolean {
    return this._isPaused;
  }

  public setPaused(paused: boolean): void {
    this._isPaused = paused;
  }
}

const debugState = DebugState.getInstance();
export default debugState;

// Export the class type for annotations
export { DebugState };