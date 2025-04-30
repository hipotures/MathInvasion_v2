/**
 * Utility class for creating and managing HTML labels for game objects in debug mode
 * This uses the browser's DOM rendering instead of Phaser's text rendering
 * for better font scaling at high resolutions
 */
export class HtmlDebugLabels {
  private container: HTMLDivElement;
  private labels: Map<string, HTMLDivElement> = new Map();
  private isVisible = false;
  
  constructor() {
    // Create container for all labels
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none'; // Don't interfere with game input
    this.container.style.zIndex = '999';
    this.container.style.display = 'none';
    this.container.style.overflow = 'hidden'; // Prevent scrollbars
    
    // Add to document
    document.body.appendChild(this.container);
    
    // Add window resize listener to handle scaling
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  /**
   * Handle window resize to adjust label positions
   */
  private handleResize(): void {
    // Force update of all labels on resize
    const labels = Array.from(this.labels.entries());
    this.clearLabels();
    
    // Re-add all labels with updated positions
    labels.forEach(([id, label]) => {
      const x = parseFloat(label.dataset.x || '0');
      const y = parseFloat(label.dataset.y || '0');
      const name = label.textContent || '';
      const color = label.style.color;
      
      this.updateLabel(id, name, x, y, color);
    });
  }
  
  /**
   * Set the visibility of all debug labels
   * @param visible Whether the labels should be visible
   */
  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.container.style.display = visible ? 'block' : 'none';
  }
  
  /**
   * Clear all labels
   */
  public clearLabels(): void {
    this.labels.forEach(label => {
      if (this.container.contains(label)) {
        this.container.removeChild(label);
      }
    });
    this.labels.clear();
  }
  
  /**
   * Add or update a label for a game object
   * @param id Unique identifier for the object
   * @param name Name to display
   * @param x X position in game coordinates
   * @param y Y position in game coordinates
   * @param color Text color (CSS color string)
   */
  public updateLabel(id: string, name: string, x: number, y: number, color = '#ffffff'): void {
    if (!this.isVisible) return;
    
    // Get or create label
    let label = this.labels.get(id);
    if (!label) {
      label = this.createLabel(color);
      this.labels.set(id, label);
      this.container.appendChild(label);
    }
    
    // Store original coordinates for resize handling
    label.dataset.x = x.toString();
    label.dataset.y = y.toString();
    
    // Update label content and position
    label.textContent = name;
    
    // Calculate position based on game canvas size and position
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / canvas.width;
      const scaleY = rect.height / canvas.height;
      
      const scaledX = x * scaleX;
      const scaledY = y * scaleY;
      
      label.style.left = `${rect.left + scaledX}px`;
      label.style.top = `${rect.top + scaledY}px`;
    } else {
      // Fallback if canvas not found
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
    }
  }
  
  /**
   * Create a new label element
   * @param color Text color
   * @returns HTML element for the label
   */
  private createLabel(color: string): HTMLDivElement {
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.transform = 'translate(-50%, -50%)'; // Center on position
    label.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    label.style.color = color;
    label.style.padding = '3px 6px';
    label.style.borderRadius = '4px';
    label.style.fontSize = '14px';
    label.style.fontFamily = 'Arial, sans-serif';
    label.style.fontWeight = 'bold';
    label.style.whiteSpace = 'nowrap';
    label.style.pointerEvents = 'none'; // Don't interfere with game input
    label.style.border = '1px solid ' + color;
    label.style.boxShadow = '0 0 3px rgba(0, 0, 0, 0.5)';
    label.style.textShadow = '0 0 2px #000';
    return label;
  }
  
  /**
   * Remove a specific label
   * @param id Identifier of the label to remove
   */
  public removeLabel(id: string): void {
    const label = this.labels.get(id);
    if (label && this.container.contains(label)) {
      this.container.removeChild(label);
      this.labels.delete(id);
    }
  }
  
  /**
   * Destroy all labels and the container
   */
  public destroy(): void {
    // Remove resize listener
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    // Clear labels and remove container
    this.clearLabels();
    if (document.body.contains(this.container)) {
      document.body.removeChild(this.container);
    }
  }
}

export default HtmlDebugLabels;