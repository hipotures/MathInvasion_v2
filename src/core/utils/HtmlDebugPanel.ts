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
    this.container.style.top = '0px';
    this.container.style.right = '3px';
    this.container.style.bottom = '3px';
    // Revert to fixed width to prevent overlap
    this.container.style.width = '390px';
    // Remove min/max width constraints
    // this.container.style.minWidth = '360px';
    // this.container.style.maxWidth = '40vw';
    this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.container.style.color = 'white';
    this.container.style.fontFamily = 'Arial, sans-serif';
    this.container.style.fontSize = '14px';
    this.container.style.padding = '10px';
    this.container.style.border = '1px solid #00ff00';
    this.container.style.zIndex = '1000';
    this.container.style.display = 'none';
    // Replace maxHeight with a fixed height calculated based on viewport height minus top/bottom margins
    this.container.style.height = 'calc(100vh - 20px)'; // 10px top margin + 10px bottom margin
    this.container.style.overflowY = 'auto'; // Keep scrolling for overflow
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public updateData(data: Record<string, any>): void {
    // Reverted unknown back to any
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
      while (section.children.length > 1) {
        // Keep the header
        section.removeChild(section.lastChild!);
      }

      // Special handling for ActiveObjects category
      if (category === 'ActiveObjects') {
        const { legend, objects } = categoryData as {
          legend: Record<string, string>;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          objects: Record<string, any>[]; // Reverted unknown back to any
        };

        // Add Legend
        const legendDiv = document.createElement('div');
        legendDiv.style.marginLeft = '10px';
        legendDiv.style.marginBottom = '8px';
        legendDiv.style.fontSize = '12px'; // Smaller font for legend
        legendDiv.style.color = '#cccccc'; // Lighter color for legend
        const legendText = Object.entries(legend)
          .map(([key, desc]) => `${key}=${desc}`)
          .join(', ');
        legendDiv.textContent = `Legend: ${legendText}`;
        section.appendChild(legendDiv);

        // Add Object List
        objects.forEach((obj) => {
          const entry = document.createElement('div');
          entry.style.marginLeft = '10px';
          entry.style.marginBottom = '3px'; // Less margin for compact list
          entry.style.fontSize = '13px'; // Slightly smaller font for list
          entry.style.whiteSpace = 'nowrap'; // Keep on one line

          // Build the string representation dynamically
          const objectString = Object.entries(obj)
            .map(([key, value]) => {
              if (value === undefined || value === null) return null; // Skip undefined/null properties
              // Format boolean values nicely
              if (typeof value === 'boolean') {
                return `${key}:${value ? 'T' : 'F'}`;
              }
              // Format numbers (keep integers as is, floats to 1 decimal)
              if (typeof value === 'number') {
                return `${key}:${Number.isInteger(value) ? value : value.toFixed(1)}`;
              }
              // Keep strings/IDs as is
              return `${key}:${value}`;
            })
            .filter(Boolean) // Remove null entries
            .join(' '); // Join with spaces

          entry.textContent = objectString;
          section.appendChild(entry);
        });
      } else {
        // Generic handling for other categories
        Object.entries(categoryData).forEach(([key, value]) => {
          const entry = document.createElement('div');
          entry.style.marginLeft = '10px';
          entry.style.marginBottom = '5px';
          entry.style.fontSize = '14px';

          let displayValue = value;
          if (typeof value === 'object') {
            try {
              // Use slightly more compact JSON stringification
              displayValue = JSON.stringify(value, null, 1);
            } catch {
              // Removed unused 'e' variable
              displayValue = '[Object]';
            }
          }

          entry.textContent = `${key}: ${displayValue}`;
          section.appendChild(entry);
        });
      }
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
