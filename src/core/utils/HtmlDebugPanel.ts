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
    this.container.style.zIndex = '1001'; // Increased z-index
    this.container.style.display = 'none';
    this.container.style.height = 'calc(100vh - 20px)';
    // Restore overflow
    this.container.style.overflowY = 'auto';
    this.container.style.borderRadius = '5px';
    this.container.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    // Use setProperty to add !important
    // REMOVED: this.container.style.setProperty('user-select', 'text', 'important'); // Keep on children only
    this.container.style.setProperty('pointer-events', 'auto', 'important'); // Add pointer-events

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

    // --- REMOVED Event Listeners from Container for Debugging ---
    // --- End REMOVED Container Event Listeners ---

    // --- REMOVED WINDOW Mousedown Listener for Debugging ---
    // window.addEventListener('mousedown', (e) => {
    //     console.log(`[WINDOW Mousedown Capture] Target:`, e.target, ` | Bubbles: ${e.bubbles}`, ` | DefaultPrevented: ${e.defaultPrevented}`);
    // }, true); // Use CAPTURE phase
    // --- End REMOVED WINDOW Mousedown Listener ---

    // --- Test Input and Button Removed ---

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
     const numStaticElements = 1; // Title
     while (this.container.children.length > numStaticElements) {
       this.container.removeChild(this.container.lastChild!);
     }
     // Clear the section map as dynamic sections are removed
     this.contentSections.clear(); 
  }

  /**
   * Renders the structured overview data.
   * @param data The structured overview data object.
   */
  private renderOverviewData(data: Record<string, any>): void {
    Object.entries(data).forEach(([category, categoryData]) => {
      // Create and append the header directly to the container
      const header = this.createCategoryHeader(category); // Renamed function
      this.container.appendChild(header);

      // Render content directly into the container, passing the container itself
      this.renderSectionContent(this.container, category, categoryData);
    });
    // No need for contentSections map anymore with this structure
    this.contentSections.clear();
  }

  /**
   * Renders the content for a specific overview section directly into the parent container.
   * @param parentContainer The HTML element to append content to (main container).
   * @param category The category name.
   * @param categoryData The data for the category.
   */
  private renderSectionContent(parentContainer: HTMLDivElement, category: string, categoryData: any): void {
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
        parentContainer.appendChild(legendDiv); // Append to parentContainer

        objects.forEach((obj) => {
          const entry = document.createElement('div');
          entry.style.marginLeft = '10px';
          entry.style.marginBottom = '3px';
          entry.style.fontSize = '13px';
          entry.style.whiteSpace = 'pre-wrap'; // Changed from 'nowrap'
          entry.style.setProperty('user-select', 'text', 'important'); // Apply here
          entry.style.setProperty('-webkit-user-select', 'text', 'important'); // Add vendor prefix
          entry.style.setProperty('pointer-events', 'auto', 'important'); // Add pointer-events

          // --- REMOVED Event Listeners from entry for Debugging ---
          // entry.addEventListener('mousedown', (e) => console.log(`[DebugPanel] Mousedown on entry:`, e.target));
          // entry.addEventListener('mousemove', (e) => console.log(`[DebugPanel] Mousemove on entry:`, e.target));
          // entry.addEventListener('mouseup', (e) => console.log(`[DebugPanel] Mouseup on entry:`, e.target));
          // --- End REMOVED Event Listeners ---

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
          parentContainer.appendChild(entry); // Append to parentContainer
        });
      } else if (typeof categoryData === 'object' && categoryData !== null) {
        // Generic handling for other categories (Game, Weapon)
        Object.entries(categoryData).forEach(([key, value]) => {
          const entry = document.createElement('div');
          entry.style.marginLeft = '10px';
          entry.style.marginBottom = '5px';
          entry.style.fontSize = '14px';
          entry.style.setProperty('user-select', 'text', 'important'); // Apply here
          entry.style.setProperty('-webkit-user-select', 'text', 'important'); // Add vendor prefix
          entry.style.setProperty('pointer-events', 'auto', 'important'); // Add pointer-events

          // --- REMOVED Event Listeners from entry for Debugging ---
          // entry.addEventListener('mousedown', (e) => console.log(`[DebugPanel] Mousedown on entry:`, e.target));
          // entry.addEventListener('mousemove', (e) => console.log(`[DebugPanel] Mousemove on entry:`, e.target));
          // entry.addEventListener('mouseup', (e) => console.log(`[DebugPanel] Mouseup on entry:`, e.target));
          // --- End REMOVED Event Listeners ---

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
          parentContainer.appendChild(entry); // Append to parentContainer
        });
      } else {
         // Handle cases where categoryData might not be an object (though unlikely for overview)
         const entry = document.createElement('div');
         entry.textContent = `${category}: ${categoryData ?? 'N/A'}`;
         parentContainer.appendChild(entry); // Append to parentContainer
      }
  }

  /**
   * Renders the flat inspection data using a textarea for guaranteed selection support.
   * @param data The flat inspection data object.
   */
  private renderInspectionData(data: Record<string, any>): void {
    // Create a header to indicate inspection mode
    const inspectionHeader = document.createElement('div');
    inspectionHeader.textContent = "INSPECTION DATA";
    inspectionHeader.style.color = '#ffff00';
    inspectionHeader.style.fontWeight = 'bold';
    inspectionHeader.style.fontSize = '16px';
    inspectionHeader.style.marginBottom = '10px';
    inspectionHeader.style.marginTop = '10px';
    this.container.appendChild(inspectionHeader);

    // Iterate through the flat data and create individual div elements
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        const entry = document.createElement('div');
        entry.style.marginLeft = '10px';
        entry.style.marginBottom = '5px';
        entry.style.fontSize = '14px';
        entry.style.whiteSpace = 'pre-wrap'; // Allow wrapping
        entry.style.setProperty('user-select', 'text', 'important');
        entry.style.setProperty('-webkit-user-select', 'text', 'important');
        entry.style.setProperty('pointer-events', 'auto', 'important');

        entry.textContent = `[${key}: ${value ?? 'N/A'}]`;
        this.container.appendChild(entry);
      }
    }
  }


  /**
   * Create a category header element (no longer creates the wrapping section).
   * @param category Category name
   * @returns HTML element for the category header.
   */
  private createCategoryHeader(category: string): HTMLDivElement {
    // Removed the wrapping section div creation
    // const section = document.createElement('div');
    // section.style.marginBottom = '15px';

    const header = document.createElement('div');
    header.textContent = category;
    header.style.color = '#ffff00';
    header.style.fontWeight = 'bold';
    header.style.fontSize = '16px';
    header.style.marginBottom = '5px';
    header.style.marginTop = '10px'; // Add some top margin since it's directly in container

    // section.appendChild(header); // No longer needed
    return header; // Return only the header
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
