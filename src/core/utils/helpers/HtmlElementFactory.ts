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
  ) => HTMLDivElement; // Expect return value
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
    ) => HTMLDivElement, // Expect return value
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
    // Create cooldown bars after buttons
    this.createCooldownBars(canvasLeft, canvasTop, canvasWidth, canvasHeight);
    this.createPauseIndicatorElement(canvasLeft, canvasTop, canvasWidth, canvasHeight); // Add pause indicator
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

  // New method to create cooldown bars
  private createCooldownBars(
    canvasLeft: number,
    canvasTop: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const barWidth = 100; // Match the intended button width
    const barHeight = 5; // Height of the bar
    const barYOffset = canvasTop + canvasHeight - 15; // Position below buttons

    // Cooldown Bar 1 (Bullet)
    // Assign the result of createUIElement to bar1Container
    const bar1Container = this.createUIElement(
      'cooldownBar1',
      '', // No text
      canvasLeft + canvasWidth * 0.3, // Center align with button 1
      barYOffset,
      '#ff0000', // Red (will be overridden by update)
      'center' // Use center alignment logic
      // No background color needed initially, just the bar itself
    );

    // Apply specific styles for the bar element after creation
    if (bar1Container) { // Use the returned reference
        bar1Container.style.width = `${barWidth}px`; // Set total width container
        bar1Container.style.height = `${barHeight}px`;
        bar1Container.style.backgroundColor = '#333333'; // Dark background for the container
        bar1Container.style.padding = '0'; // Remove padding
        bar1Container.style.borderRadius = '2px';
        bar1Container.style.overflow = 'hidden'; // Hide inner bar overflow
        // Create the inner filling bar
        const innerBar1 = document.createElement('div');
        innerBar1.style.width = '0%'; // Start empty
        innerBar1.style.height = '100%';
        innerBar1.style.backgroundColor = '#ff0000'; // Red fill
        innerBar1.style.transition = 'width 0.1s linear';
        bar1Container.appendChild(innerBar1); // Append to the returned container
        // Adjust margin-left based on the actual barWidth
        bar1Container.style.marginLeft = `-${barWidth / 2}px`;
    }


    // Cooldown Bar 2 (Laser)
    // Assign the result of createUIElement to bar2Container
    const bar2Container = this.createUIElement(
      'cooldownBar2',
      '',
      canvasLeft + canvasWidth * 0.5, // Center align with button 2
      barYOffset,
      '#00ffff', // Cyan
      'center'
    );
     if (bar2Container) { // Use the returned reference
        bar2Container.style.width = `${barWidth}px`;
        bar2Container.style.height = `${barHeight}px`;
        bar2Container.style.backgroundColor = '#333333';
        bar2Container.style.padding = '0';
        bar2Container.style.borderRadius = '2px';
        bar2Container.style.overflow = 'hidden';
        const innerBar2 = document.createElement('div');
        innerBar2.style.width = '0%';
        innerBar2.style.height = '100%';
        innerBar2.style.backgroundColor = '#00ffff'; // Cyan fill
        innerBar2.style.transition = 'width 0.1s linear';
        bar2Container.appendChild(innerBar2); // Append to the returned container
        bar2Container.style.marginLeft = `-${barWidth / 2}px`;
    }

    // Cooldown Bar 3 (Slow)
    // Assign the result of createUIElement to bar3Container
    const bar3Container = this.createUIElement(
      'cooldownBar3',
      '',
      canvasLeft + canvasWidth * 0.7, // Center align with button 3
      barYOffset,
      '#ffd700', // Gold
      'center'
    );
     if (bar3Container) { // Use the returned reference
        bar3Container.style.width = `${barWidth}px`;
        bar3Container.style.height = `${barHeight}px`;
        bar3Container.style.backgroundColor = '#333333';
        bar3Container.style.padding = '0';
        bar3Container.style.borderRadius = '2px';
        bar3Container.style.overflow = 'hidden';
        const innerBar3 = document.createElement('div');
        innerBar3.style.width = '0%';
        innerBar3.style.height = '100%';
        innerBar3.style.backgroundColor = 'rgba(255, 215, 0, 0.7)'; // Gold fill
        innerBar3.style.transition = 'width 0.1s linear';
        bar3Container.appendChild(innerBar3); // Append to the returned container
        bar3Container.style.marginLeft = `-${barWidth / 2}px`;
    }
  }


  private createPauseIndicatorElement(
    canvasLeft: number,
    canvasTop: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    // Removed debug log
    this.createUIElement(
      'pauseIndicator',
      'PAUSED',
      canvasLeft + canvasWidth / 2,
      canvasTop + canvasHeight / 2,
      '#ff0000', // Red color
      'center'
    );
    // Removed debug log
    // Initially hide it - this needs to be done in HtmlUI after creation
  }
}
