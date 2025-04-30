/**
 * Utility class for creating and managing an HTML debug panel
 * This uses the browser's DOM rendering instead of Phaser's text rendering
 * for better font scaling at high resolutions
 */
export class HtmlDebugPanel {
  private container: HTMLDivElement;
  private isVisible = false;
  private contentSections: Map<string, HTMLDivElement> = new Map();

  constructor() {
    // Create container
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.top = '10px';
    this.container.style.right = '10px';
    this.container.style.width = '300px';
    this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.container.style.color = 'white';
    this.container.style.fontFamily = 'Arial, sans-serif';
    this.container.style.fontSize = '14px';
    this.container.style.padding = '10px';
    this.container.style.border = '1px solid #00ff00';
    this.container.style.zIndex = '1000';
    this.container.style.display = 'none';
    this.container.style.maxHeight = '80vh';
    this.container.style.overflowY = 'auto';
    this.container.style.borderRadius = '5px';
    this.container.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    
    // Add title
    const title = document.createElement('div');
    title.textContent = 'DEBUG PANEL';
    title.style.color = '#00ff00';
    title.style.fontWeight = 'bold';
    title.style.fontSize = '18px';
    title.style.marginBottom = '10px';
    title.style.textAlign = 'center';
    title.style.borderBottom = '1px solid #00ff00';
    title.style.paddingBottom = '5px';
    this.container.appendChild(title);
    
    // Add to document
    document.body.appendChild(this.container);
  }
  
  /**
   * Set the visibility of the debug panel
   * @param visible Whether the panel should be visible
   */
  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.container.style.display = visible ? 'block' : 'none';
  }
  
  /**
   * Update the debug panel with new data
   * @param data Debug data to display
   */
  public updateData(data: Record<string, any>): void {
    if (!this.isVisible) return;
    
    // Process each category
    Object.entries(data).forEach(([category, categoryData]) => {
      // Get or create section for this category
      let section = this.contentSections.get(category);
      if (!section) {
        section = this.createCategorySection(category);
        this.contentSections.set(category, section);
        this.container.appendChild(section);
      }
      
      // Clear existing content
      while (section.children.length > 1) { // Keep the header
        section.removeChild(section.lastChild!);
      }
      
      // Add data entries
      Object.entries(categoryData).forEach(([key, value]) => {
        const entry = document.createElement('div');
        entry.style.marginLeft = '10px';
        entry.style.marginBottom = '5px';
        entry.style.fontSize = '14px';
        
        let displayValue = value;
        if (typeof value === 'object') {
          try {
            displayValue = JSON.stringify(value);
          } catch (e) {
            displayValue = '[Object]';
          }
        }
        
        entry.textContent = `${key}: ${displayValue}`;
        section.appendChild(entry);
      });
    });
  }
  
  /**
   * Create a section for a category
   * @param category Category name
   * @returns HTML element for the category section
   */
  private createCategorySection(category: string): HTMLDivElement {
    const section = document.createElement('div');
    section.style.marginBottom = '15px';
    
    const header = document.createElement('div');
    header.textContent = category;
    header.style.color = '#ffff00';
    header.style.fontWeight = 'bold';
    header.style.fontSize = '16px';
    header.style.marginBottom = '5px';
    
    section.appendChild(header);
    return section;
  }
  
  /**
   * Destroy the debug panel
   */
  public destroy(): void {
    if (document.body.contains(this.container)) {
      document.body.removeChild(this.container);
    }
    this.contentSections.clear();
  }
}

export default HtmlDebugPanel;