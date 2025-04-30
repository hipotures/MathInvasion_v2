/**
 * Factory class responsible for creating specific HTML elements for the main game UI.
 */
export class HtmlElementFactory {
  private createUIElement: (
    id: string,
    text: string,
    x: number,
    y: number,
    color: string,
    align?: 'left' | 'center' | 'right',
    bgColor?: string
  ) => void;
  private canvas: HTMLCanvasElement;

  constructor(
    createUIElementMethod: (
      id: string,
      text: string,
      x: number,
      y: number,
      color: string,
      align?: 'left' | 'center' | 'right',
      bgColor?: string
    ) => void,
    canvas: HTMLCanvasElement
  ) {
    this.createUIElement = createUIElementMethod;
    this.canvas = canvas;
  }

  /**
   * Creates all the standard UI elements.
   */
  public createAllElements(): void {
    const rect = this.canvas.getBoundingClientRect();
    const canvasLeft = rect.left;
    const canvasTop = rect.top;
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;

    this.createCurrencyElement(canvasLeft, canvasTop);
    this.createHealthElement(canvasLeft, canvasTop);
    this.createScoreElement(canvasLeft, canvasTop, canvasWidth);
    this.createWaveElement(canvasLeft, canvasTop, canvasWidth);
    this.createWeaponStatusElement(canvasLeft, canvasTop, canvasWidth, canvasHeight);
    this.createWeaponUpgradeCostElement(canvasLeft, canvasTop, canvasWidth, canvasHeight);
    this.createWeaponButtons(canvasLeft, canvasTop, canvasWidth, canvasHeight);
  }

  private createCurrencyElement(canvasLeft: number, canvasTop: number): void {
    this.createUIElement('currency', 'Currency: 0', canvasLeft + 10, canvasTop + 10, '#ffffff');
  }

  private createHealthElement(canvasLeft: number, canvasTop: number): void {
    this.createUIElement('health', 'Health: 100', canvasLeft + 10, canvasTop + 40, '#00ff00');
  }

  private createScoreElement(canvasLeft: number, canvasTop: number, canvasWidth: number): void {
    // Note: Positioning adjusted compared to DebugUI based on original HtmlUI code
    this.createUIElement(
      'score',
      'Score: 0',
      canvasLeft + canvasWidth - 100,
      canvasTop + 10,
      '#ffffff',
      'left'
    );
  }

  private createWaveElement(canvasLeft: number, canvasTop: number, canvasWidth: number): void {
    // Note: Positioning adjusted compared to DebugUI based on original HtmlUI code
    this.createUIElement(
      'wave',
      'Wave: 1',
      canvasLeft + canvasWidth - 100,
      canvasTop + 40,
      '#ffffff',
      'left'
    );
  }

  private createWeaponStatusElement(
    canvasLeft: number,
    canvasTop: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    this.createUIElement(
      'weaponStatus',
      'Weapon: Bullet Lvl: 1',
      canvasLeft + canvasWidth / 2,
      canvasTop + canvasHeight - 80,
      '#ffffff',
      'center'
    );
  }

  private createWeaponUpgradeCostElement(
    canvasLeft: number,
    canvasTop: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    this.createUIElement(
      'weaponUpgradeCost',
      'Upgrade Cost: 100',
      canvasLeft + canvasWidth / 2,
      canvasTop + canvasHeight - 60,
      '#cccccc',
      'center'
    );
  }

  private createWeaponButtons(
    canvasLeft: number,
    canvasTop: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    this.createUIElement(
      'weaponButton1',
      '[1] Bullet',
      canvasLeft + canvasWidth * 0.3,
      canvasTop + canvasHeight - 40,
      '#dddddd',
      'center',
      '#555555'
    );

    this.createUIElement(
      'weaponButton2',
      '[2] Laser',
      canvasLeft + canvasWidth * 0.5,
      canvasTop + canvasHeight - 40,
      '#dddddd',
      'center',
      '#555555'
    );

    this.createUIElement(
      'weaponButton3',
      '[3] Slow',
      canvasLeft + canvasWidth * 0.7,
      canvasTop + canvasHeight - 40,
      '#dddddd',
      'center',
      '#555555'
    );
  }
}
