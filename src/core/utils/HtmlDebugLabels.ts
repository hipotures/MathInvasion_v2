import Phaser from 'phaser'; // Import Phaser
import eventBus from '../../core/events/EventBus'; // Import EventBus
import { DEBUG_PERFORM_HIT_TEST } from '../../core/constants/events'; // Import event constant

// Removed LabelData interface

/**
 * Utility class for creating and managing HTML labels for game objects in debug mode.
 * Labels are appended directly to the body.
 */
export class HtmlDebugLabels {
  // Store only the element now
  private labels: Map<string, HTMLDivElement> = new Map();
  private isVisible = false;
  private gameCanvas: HTMLCanvasElement | null = null;
  private sceneRef: Phaser.Scene | null = null;

  constructor() {
    this.handleLabelClick = this.handleLabelClick.bind(this); // Bind the click handler
  }
  
  /**
   * Sets the scene reference to access camera information.
   */
  public setScene(scene: Phaser.Scene): void {
      this.sceneRef = scene;
      this.gameCanvas = scene.game.canvas; 
      window.removeEventListener('resize', this.handleResize.bind(this)); 
      window.addEventListener('resize', this.handleResize.bind(this));
      this.handleResize(); 
  }

  /**
   * Handle window resize to adjust label positions
   */
  private handleResize(): void {
    this.labels.forEach((element) => {
        const worldX = parseFloat(element.dataset.worldX || '0');
        const worldY = parseFloat(element.dataset.worldY || '0');
        this.positionLabel(element, worldX, worldY); 
    });
  }
  
  /**
   * Set the visibility of all debug labels
   */
  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.labels.forEach(element => {
      element.style.display = visible ? 'block' : 'none';
    });
  }
  
  /**
   * Clear all labels
   */
  public clearLabels(): void {
    this.labels.forEach(element => {
      element.removeEventListener('click', this.handleLabelClick); // Remove listener
      if (element.parentNode === document.body) {
        document.body.removeChild(element);
      }
    });
    this.labels.clear();
  }
  
  /**
   * Add or update a label for a game object
   */
  public updateLabel(
      id: string,
      name: string,
      worldX: number,
      worldY: number,
      color = '#ffffff',
      gameObject: Phaser.GameObjects.GameObject // Keep gameObject for potential future use
    ): void {
    if (!this.isVisible || !this.sceneRef) return;
    
    let labelElement = this.labels.get(id);

    if (!labelElement) {
      labelElement = this.createLabel(color);
      labelElement.addEventListener('click', this.handleLabelClick); // Add click listener
      this.labels.set(id, labelElement);
      document.body.appendChild(labelElement);
    }
    
    // Store world coordinates on dataset for resize
    labelElement.dataset.worldX = worldX.toString();
    labelElement.dataset.worldY = worldY.toString();
    
    // Store the label ID and object type in the dataset
    labelElement.dataset.labelId = id;
    
    // Try to determine object type and store specific ID
    if (id.startsWith('debuglabel_player')) {
      labelElement.dataset.objectType = 'player';
      labelElement.dataset.objectId = 'player';
    } else if (id.startsWith('debuglabel_enemy_')) {
      labelElement.dataset.objectType = 'enemy';
      // Extract the enemy ID from the label ID
      const enemyId = id.replace('debuglabel_enemy_', '');
      labelElement.dataset.objectId = enemyId;
    } else if (id.startsWith('debuglabel_proj_')) {
      labelElement.dataset.objectType = 'projectile';
      // Extract the projectile ID from the label ID
      const projId = id.replace('debuglabel_proj_', '');
      labelElement.dataset.objectId = projId;
    } else if (id.startsWith('debuglabel_powerup_')) {
      labelElement.dataset.objectType = 'powerup';
      // Extract the powerup ID from the label ID
      const powerupId = id.replace('debuglabel_powerup_', '');
      labelElement.dataset.objectId = powerupId;
    }
    
    labelElement.textContent = name;
    labelElement.style.color = color;
    labelElement.style.borderColor = color;
    labelElement.style.display = 'block';

    this.positionLabel(labelElement, worldX, worldY);
  }

  /**
   * Handles clicks on the debug labels.
   * Emits an event with screen coordinates for hit testing.
   */
  private handleLabelClick(event: MouseEvent): void {
    event.stopPropagation(); // Prevent event bubbling further
    event.preventDefault(); // Prevent default behavior
    
    const screenX = event.clientX;
    const screenY = event.clientY;
    
    // Get the label element that was clicked
    const label = event.currentTarget as HTMLDivElement;
    
    // Get the object type and ID from the dataset
    const objectType = label.dataset.objectType || '';
    const objectId = label.dataset.objectId || '';
    const labelId = label.dataset.labelId || '';
    
    // Emit event for GameSceneDebugHandler to perform the hit test
    // Include the object type and ID to precisely identify the object
    eventBus.emit(DEBUG_PERFORM_HIT_TEST, {
      x: screenX,
      y: screenY,
      objectType: objectType,
      objectId: objectId,
      labelId: labelId
    });
  }

  /**
   * Calculates and sets the screen position of a label element relative to the canvas.
   */
  private positionLabel(label: HTMLDivElement, worldX: number, worldY: number): void {
     if (!this.gameCanvas || !this.sceneRef) return;

     try {
        const cam = this.sceneRef.cameras.main;
        const canvasRect = this.gameCanvas.getBoundingClientRect();
        const scaleX = canvasRect.width / cam.width;
        const scaleY = canvasRect.height / cam.height;
        const screenRelX = (worldX - cam.scrollX) * scaleX;
        const screenRelY = (worldY - cam.scrollY) * scaleY;

        label.style.left = `${canvasRect.left + screenRelX}px`;
        label.style.top = `${canvasRect.top + screenRelY}px`;

     } catch (error) {
         console.error("Error positioning debug label:", error);
         label.style.left = `0px`;
         label.style.top = `0px`;
     }
  }
  
  /**
   * Create a new label element
   */
  private createLabel(color: string): HTMLDivElement {
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.transform = 'translate(-50%, -100%)';
    label.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    label.style.color = color;
    label.style.padding = '3px 6px';
    label.style.borderRadius = '4px';
    label.style.fontSize = '14px';
    label.style.fontFamily = 'Arial, sans-serif';
    label.style.fontWeight = 'bold';
    label.style.whiteSpace = 'nowrap';
    label.style.border = '1px solid ' + color;
    label.style.boxShadow = '0 0 3px rgba(0, 0, 0, 0.5)';
    label.style.textShadow = '0 0 2px #000';
    label.style.marginTop = '-5px';
    label.style.display = 'none';
    label.style.pointerEvents = 'auto'; // Allow clicks
    label.style.cursor = 'pointer'; // Indicate interactivity
    label.style.zIndex = '1000';
    
    // Make the label more visible and clickable for debugging
    label.style.minWidth = '80px';
    label.style.minHeight = '20px';
    label.style.textAlign = 'center';
    
    return label;
  }
  
  /**
   * Remove a specific label
   */
  public removeLabel(id: string): void {
    const labelElement = this.labels.get(id);
    if (labelElement) {
      labelElement.removeEventListener('click', this.handleLabelClick); // Remove listener
      if (labelElement.parentNode === document.body) {
        document.body.removeChild(labelElement);
      }
      this.labels.delete(id);
    }
  }
  
  /**
   * Destroy all labels and the container
   */
  public destroy(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    this.clearLabels();
    
    this.sceneRef = null;
    this.gameCanvas = null;
  }
}

export default HtmlDebugLabels;