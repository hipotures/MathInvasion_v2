import logger from './Logger';
import { HtmlDebugElementFactory } from './helpers/HtmlDebugElementFactory';

export class HtmlDebugUI {
  private container: HTMLDivElement;
  private uiElements: Map<string, HTMLDivElement> = new Map();
  private isVisible = false;
  private elementFactory: HtmlDebugElementFactory | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none'; // Don't interfere with game input
    this.container.style.zIndex = '998'; // Below debug labels
    this.container.style.display = 'none';

    document.body.appendChild(this.container);

    this.createUIElements();

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * Handle window resize to adjust element positions
   */
  private handleResize(): void {
    this.container.innerHTML = '';
    this.uiElements.clear();
    this.createUIElements();
  }

  /**
   * Create all UI elements using the factory.
   */
  private createUIElements(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      logger.error('Canvas element not found for HtmlDebugUI');
      return;
    }
  
    if (!this.elementFactory) {
      this.elementFactory = new HtmlDebugElementFactory(this.createUIElement.bind(this), canvas);
    }
  
    this.elementFactory.createAllElements();
  }

  /**
   /**
    * Generic method to create a single UI element and add it to the container and map.
    * This method is passed to the HtmlDebugElementFactory.
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
   ): void {
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
   
     if (align === 'right') {
       const canvas = document.querySelector('canvas');
       const canvasRightEdge = canvas ? canvas.getBoundingClientRect().right : window.innerWidth;
       element.style.right = `${window.innerWidth - canvasRightEdge + x}px`;
       element.style.textAlign = 'right';
     } else if (align === 'center') {
       element.style.left = `${x}px`;
       element.style.transform = 'translateX(-50%)';
       element.style.textAlign = 'center';
     } else {
       element.style.left = `${x}px`;
     }
   
     element.style.top = `${y}px`;
     element.textContent = text;
   
     this.container.appendChild(element);
     this.uiElements.set(id, element);
   }
  /**
   * Set the visibility of all UI elements
   * @param visible Whether the elements should be visible
   */
  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.container.style.display = visible ? 'block' : 'none';
  }

  /**
   * Update a UI element's text
   * @param id Element ID
   * @param text New text
   * @param color Optional new color
   */
  public updateElement(id: string, text: string, color?: string): void {
    if (!this.isVisible) return;

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
    let color = '#00ff00';
    if (health < 30) {
      color = '#ff0000';
    } else if (health < 60) {
      color = '#ffff00';
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
    const weaponName = weaponId.charAt(0).toUpperCase() + weaponId.slice(1);
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
    const activeColor = '#ffff00';
    const inactiveColor = '#dddddd';
    const activeBgColor = '#888800';
    const inactiveBgColor = '#555555';
  
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
   * Destroy all UI elements and the container
   */
  public destroy(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
  
    if (document.body.contains(this.container)) {
      document.body.removeChild(this.container);
    }
    this.uiElements.clear();
  }
}

export default HtmlDebugUI; // Keep default export if used elsewhere
