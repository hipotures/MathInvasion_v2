import logger from './Logger'; // Import the logger instance
import { HtmlElementFactory } from './helpers/HtmlElementFactory'; // Import the new factory

/**
 * Utility class for creating and managing HTML UI elements
 * This uses the browser's DOM rendering instead of Phaser's text rendering
 * for better font scaling at high resolutions
 */
export class HtmlUI {
  private container: HTMLDivElement;
  private uiElements: Map<string, HTMLDivElement> = new Map();
  private elementFactory: HtmlElementFactory | null = null; // Add factory instance

  constructor() {
    // Create container for all UI elements
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none'; // Don't interfere with game input
    this.container.style.zIndex = '998'; // Below debug labels

    // Add to document
    document.body.appendChild(this.container);

    // Create initial UI elements using the factory
    this.createUIElements();

    // Add window resize listener to handle scaling
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * Handle window resize to adjust element positions
   */
  private handleResize(): void {
    // Recreate UI elements on resize using the factory
    this.container.innerHTML = ''; // Clear existing elements
    this.uiElements.clear();
    this.createUIElements(); // Recreate using the factory
  }

  /**
   * Create all UI elements using the factory.
   */
  private createUIElements(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      logger.error('Canvas element not found for HtmlUI');
      return;
    }

    // Instantiate the factory if it doesn't exist
    if (!this.elementFactory) {
      // Pass the bound createUIElement method and canvas
      this.elementFactory = new HtmlElementFactory(this.createUIElement.bind(this), canvas);
    }

    // Delegate creation to the factory
    this.elementFactory.createAllElements();

    // Ensure pause indicator is hidden initially
    this.hidePauseIndicator();
  }

  /**
   * Generic method to create a single UI element and add it to the container and map.
   * This method is passed to the HtmlElementFactory.
   * @param id Element ID
   * @param text Initial text
   * @param x X position
   * @param y Y position
   * @param color Text color
   * @param align Text alignment
   * @param bgColor Background color
   */
  private createUIElement(
    id: string,
    text: string,
    x: number,
    y: number,
    color: string,
    align: 'left' | 'center' | 'right' = 'left',
    bgColor?: string
  ): HTMLDivElement { // Change return type from void
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.color = color;
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.fontSize = '18px';
    element.style.fontWeight = 'bold';
    element.style.pointerEvents = 'none';
    element.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.8)';

    if (bgColor) {
      element.style.backgroundColor = bgColor;
      element.style.padding = '5px 10px';
      element.style.borderRadius = '4px';
    }

    // Set alignment
    if (align === 'right') {
      // Adjust positioning for right alignment relative to canvas edge
      const canvas = document.querySelector('canvas');
      const canvasRightEdge = canvas ? canvas.getBoundingClientRect().right : window.innerWidth;
      // Position relative to the right edge of the canvas/window minus the provided x offset
      element.style.right = `${window.innerWidth - canvasRightEdge + x}px`; // x is offset from right
      element.style.textAlign = 'right';
    } else if (align === 'center') {
      // Revert to using transform for centering
      element.style.left = `${x}px`;
      element.style.transform = 'translateX(-50%)';
      element.style.textAlign = 'center';
      // Remove margin-left if set previously
      element.style.marginLeft = '';
    } else {
      element.style.left = `${x}px`;
    }

    element.style.top = `${y}px`;
    element.textContent = text;

    // --- Remove Cooldown Bar logic and related styles from button ---
    if (id.startsWith('weaponButton')) {
      // Reset styles that might have been added
      element.style.position = 'absolute'; // Revert to default absolute positioning
      element.style.overflow = '';
      element.style.width = ''; // Let it size naturally or based on padding
      element.style.boxSizing = '';
      element.style.whiteSpace = '';
      // Allow pointer events on the button itself for selection
      element.style.pointerEvents = 'auto';
    }
    // --- End Removal ---

    this.container.appendChild(element);
    this.uiElements.set(id, element);
    return element; // Return the created element
  }

  /**
   * Update a UI element's text
   * @param id Element ID
   * @param text New text
   * @param color Optional new color
   */
  public updateElement(id: string, text: string, color?: string): void {
    const element = this.uiElements.get(id);
    if (element) {
      element.textContent = text;
      if (color) {
        element.style.color = color;
      }
    }
  }

  /**
   * Update currency display
   * @param amount Currency amount
   */
  public updateCurrency(amount: number): void {
    this.updateElement('currency', `Currency: ${amount}`);
  }

  /**
   * Update health display
   * @param health Health amount
   */
  public updateHealth(health: number): void {
    let color = '#00ff00'; // Green
    if (health < 30) {
      color = '#ff0000'; // Red
    } else if (health < 60) {
      color = '#ffff00'; // Yellow
    }
    this.updateElement('health', `Health: ${health}`, color);
  }

  /**
   * Update score display
   * @param score Score amount
   */
  public updateScore(score: number): void {
    this.updateElement('score', `Score: ${score}`);
  }

  /**
   * Update wave display
   * @param wave Wave number
   */
  public updateWave(wave: number): void {
    this.updateElement('wave', `Wave: ${wave}`);
  }

  /**
   * Update weapon status display
   * @param weaponId Weapon ID
   * @param level Weapon level
   */
  public updateWeaponStatus(weaponId: string, level: number): void {
    const weaponName = weaponId.charAt(0).toUpperCase() + weaponId.slice(1).replace('_', ' '); // Capitalize and replace underscore
    this.updateElement('weaponStatus', `Weapon: ${weaponName} Lvl: ${level}`);
  }

  /**
   * Update weapon upgrade cost display
   * @param cost Upgrade cost
   */
  public updateWeaponUpgradeCost(cost: number | null): void {
    if (cost !== null) {
      this.updateElement('weaponUpgradeCost', `Upgrade Cost: ${cost}`);
    } else {
      this.updateElement('weaponUpgradeCost', 'Max Level');
    }
  }

  /**
   * Update weapon button appearance
   * @param weaponId Active weapon ID
   */
  public updateWeaponButtons(weaponId: string): void {
    const activeColor = '#ffff00'; // Yellow for active
    const inactiveColor = '#dddddd'; // Default grey
    const activeBgColor = '#888800'; // Darker yellow bg
    const inactiveBgColor = '#555555'; // Default grey bg

    const button1 = this.uiElements.get('weaponButton1');
    const button2 = this.uiElements.get('weaponButton2');
    const button3 = this.uiElements.get('weaponButton3');

    if (button1) {
      button1.style.color = weaponId === 'bullet' ? activeColor : inactiveColor;
      button1.style.backgroundColor = weaponId === 'bullet' ? activeBgColor : inactiveBgColor;
    }

    if (button2) {
      button2.style.color = weaponId === 'laser' ? activeColor : inactiveColor;
      button2.style.backgroundColor = weaponId === 'laser' ? activeBgColor : inactiveBgColor;
    }

    if (button3) {
      button3.style.color = weaponId === 'slow_field' ? activeColor : inactiveColor;
      button3.style.backgroundColor = weaponId === 'slow_field' ? activeBgColor : inactiveBgColor;
    }
  }

  /**
   * Updates the cooldown progress bar for a specific weapon button.
   * @param weaponId The ID of the weapon ('bullet', 'laser', 'slow_field').
   * @param progress Cooldown progress from 0.0 (ready) to 1.0 (full cooldown).
   */
  public updateWeaponCooldown(weaponId: string, progress: number): void {
    let barId: string | null = null; // Use separate ID for the bar element
    let barColor: string = '#ffcc00'; // Default gold/yellow

    switch (weaponId) {
      case 'bullet':
        barId = 'cooldownBar1'; // New ID for bullet cooldown bar
        barColor = '#ff0000'; // Red
        break;
      case 'laser':
        barId = 'cooldownBar2'; // New ID for laser cooldown bar
        barColor = '#00ffff'; // Cyan
        break;
      case 'slow_field':
        barId = 'cooldownBar3'; // New ID for slow field cooldown bar
        barColor = 'rgba(255, 215, 0, 0.7)'; // Gold with some transparency
        break;
    }

    if (barId) {
      const barContainer = this.uiElements.get(barId); // Get the container element for the bar
      if (barContainer) {
        // Find the inner div that actually shows the progress
        const innerBar = barContainer.querySelector('div') as HTMLDivElement;
        if (innerBar) {
            // Clamp progress between 0 and 1
            const clampedProgress = Math.max(0, Math.min(1, progress));
            // Set the width of the inner bar based on progress
            innerBar.style.width = `${clampedProgress * 100}%`;
            // Set the color of the inner bar
            innerBar.style.backgroundColor = barColor;
        } else {
             logger.warn(`Inner cooldown bar element not found within container: ${barId}`);
        }
      } else {
        // This might happen briefly during resize/recreation
        // logger.warn(`Cooldown bar container element not found for ID: ${barId}`);
      }
    }
  }

  /**
   * Shows the pause indicator element.
   */
  public showPauseIndicator(): void {
    const element = this.uiElements.get('pauseIndicator');
    if (element) {
      element.style.display = 'block';
    } else {
      logger.error(`HtmlUI: Element 'pauseIndicator' NOT FOUND in map when calling showPauseIndicator! Map size: ${this.uiElements.size}`);
    }
  }

  /**
   * Hides the pause indicator element.
   */
  public hidePauseIndicator(): void {
    const element = this.uiElements.get('pauseIndicator');
    if (element) {
      element.style.display = 'none';
    } else {
      logger.warn(`HtmlUI: Element 'pauseIndicator' NOT FOUND in map when calling hidePauseIndicator! Map size: ${this.uiElements.size}`);
    }
  }

  /**
   * Destroy all UI elements and the container
   */
  public destroy(): void {
    // Remove resize listener
    // Ensure the bound function reference is the same for removal
    const boundHandleResize = this.handleResize.bind(this);
    window.removeEventListener('resize', boundHandleResize);

    if (document.body.contains(this.container)) {
      document.body.removeChild(this.container);
    }
    this.uiElements.clear();
  }
}

export default HtmlUI; // Keep default export
