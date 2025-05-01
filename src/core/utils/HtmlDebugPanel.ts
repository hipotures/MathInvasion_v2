// Removed EventBus imports as they are no longer needed here
// import eventBus from '../events/EventBus';
// import * as Events from '../constants/events';

export class HtmlDebugPanel {
  private container: HTMLDivElement;
  private isVisible = false;
  // Removed isInspecting state - managed by DebugPanelUpdater
  private contentSections: Map<string, HTMLDivElement> = new Map();
  // Removed inspectionContentDiv - inspection uses the main container now

  constructor() {
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.top = '0px';
    this.container.style.right = '3px';
    this.container.style.bottom = '3px';
    this.container.style.width = '390px';
    this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.container.style.color = 'white';
    this.container.style.fontFamily = 'Arial, sans-serif';
    this.container.style.fontSize = '14px';
    this.container.style.padding = '10px';
    this.container.style.border = '1px solid #00ff00';
    this.container.style.zIndex = '1000';
    this.container.style.display = 'none';
    this.container.style.height = 'calc(100vh - 20px)';
    this.container.style.overflowY = 'auto';
    this.container.style.borderRadius = '5px';
    this.container.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';

    // Keep the title
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

    document.body.appendChild(this.container);

    // Removed event listener setup
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
   * Update the debug panel with new data (either overview or inspection)
   * @param data Debug data object to display
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public updateData(data: Record<string, any> | null): void {
    if (!this.isVisible || !data) {
      // If not visible or data is null (e.g., inspection fetch failed), clear content
      this.clearPanelContent(); 
      if (data === null && this.isVisible) {
         // Optionally display an error message if data is explicitly null
         const errorDiv = document.createElement('div');
         errorDiv.textContent = 'Error fetching inspection details.';
         errorDiv.style.color = 'orange';
         errorDiv.style.padding = '10px';
         this.container.appendChild(errorDiv);
      }
      return;
    }

    // Clear previous content (excluding the main title)
    this.clearPanelContent();

    // Check if it's overview data (has specific top-level keys)
    if (data.ActiveObjects && data.Game && data.Weapon) {
      this.renderOverviewData(data);
    } else {
      // Assume it's flat inspection data
      this.renderInspectionData(data);
    }
  }
  
  /**
   * Clears the dynamic content of the panel, keeping the title.
   */
  private clearPanelContent(): void {
     // Remove all children except the title (first child)
     while (this.container.children.length > 1) {
       this.container.removeChild(this.container.lastChild!);
     }
     // Clear the section map as sections are removed
     this.contentSections.clear(); 
  }

  /**
   * Renders the structured overview data.
   * @param data The structured overview data object.
   */
  private renderOverviewData(data: Record<string, any>): void {
    Object.entries(data).forEach(([category, categoryData]) => {
      let section = this.contentSections.get(category); // Check if section exists (it shouldn't after clearPanelContent)
      if (!section) {
        section = this.createCategorySection(category);
        this.contentSections.set(category, section); // Store the new section
        this.container.appendChild(section);
      }
      // Section content rendering logic (similar to before)
      this.renderSectionContent(section, category, categoryData);
    });
  }

  /**
   * Renders the content for a specific overview section.
   * @param section The HTML element for the section.
   * @param category The category name.
   * @param categoryData The data for the category.
   */
  private renderSectionContent(section: HTMLDivElement, category: string, categoryData: any): void {
     // Special handling for ActiveObjects category
      if (category === 'ActiveObjects' && typeof categoryData === 'object' && categoryData !== null) {
        const { legend, objects } = categoryData as {
          legend: Record<string, string>;
          objects: Record<string, any>[]; 
        };

        const legendDiv = document.createElement('div');
        legendDiv.style.marginLeft = '10px';
        legendDiv.style.marginBottom = '8px';
        legendDiv.style.fontSize = '12px'; 
        legendDiv.style.color = '#cccccc'; 
        const legendText = Object.entries(legend)
          .map(([key, desc]) => `${key}=${desc}`)
          .join(', ');
        legendDiv.textContent = `Legend: ${legendText}`;
        section.appendChild(legendDiv);

        objects.forEach((obj) => {
          const entry = document.createElement('div');
          entry.style.marginLeft = '10px';
          entry.style.marginBottom = '3px'; 
          entry.style.fontSize = '13px'; 
          entry.style.whiteSpace = 'nowrap';

          const objectString = Object.entries(obj)
            .map(([key, value]) => {
              if (value === undefined || value === null) return null; 
              if (typeof value === 'boolean') {
                return `${key}:${value ? 'T' : 'F'}`; 
              }
              if (typeof value === 'number') {
                return `${key}:${Number.isInteger(value) ? value : value.toFixed(1)}`; 
              }
              return `${key}:${value}`; 
            })
            .filter(Boolean) 
            .join(' ');

          entry.textContent = objectString;
          section.appendChild(entry);
        });
      } else if (typeof categoryData === 'object' && categoryData !== null) {
        // Generic handling for other categories (Game, Weapon)
        Object.entries(categoryData).forEach(([key, value]) => {
          const entry = document.createElement('div');
          entry.style.marginLeft = '10px';
          entry.style.marginBottom = '5px';
          entry.style.fontSize = '14px';

          let displayValue = value;
          if (typeof value === 'object' && value !== null) {
             try {
               displayValue = JSON.stringify(value, null, 1);
             } catch {
               displayValue = '[Object]';
             }
          } else if (value === undefined || value === null) {
             displayValue = 'N/A';
          }

          entry.textContent = `${key}: ${displayValue}`;
          section.appendChild(entry);
        });
      } else {
         // Handle cases where categoryData might not be an object (though unlikely for overview)
         const entry = document.createElement('div');
         entry.textContent = `${category}: ${categoryData ?? 'N/A'}`;
         section.appendChild(entry);
      }
  }

  /**
   * Renders the flat inspection data.
   * @param data The flat inspection data object.
   */
  private renderInspectionData(data: Record<string, any>): void {
    const inspectionContainer = document.createElement('div');
    // Use <pre> for monospace font and preserving line breaks, similar to DebugDataFormatter
    inspectionContainer.style.fontFamily = 'monospace';
    inspectionContainer.style.whiteSpace = 'pre';
    inspectionContainer.style.lineHeight = '1.4';
    inspectionContainer.style.marginTop = '10px'; // Add some space below the title

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        const entry = document.createElement('div');
        // Format as [key: value]
        entry.textContent = `[${key}: ${value ?? 'N/A'}]`; 
        inspectionContainer.appendChild(entry);
      }
    }
    this.container.appendChild(inspectionContainer);
  }


  /**
   * Create a section header for a category
   * @param category Category name
   * @returns HTML element for the category section header
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
    // Removed event listener cleanup
  }

  // Removed inspection mode methods:
  // - handleStopInspecting
  // - handleShowInspectionDetails
  // - showInspectionView
  // - hideInspectionView
  // - hideDefaultSections
  // - showDefaultSections
}

export default HtmlDebugPanel;
