import eventBus from '../events/EventBus';
import * as Events from '../constants/events';

export class HtmlDebugPanel {
  private container: HTMLDivElement;
  private isVisible = false;
  private isInspecting = false; // New state for inspection mode
  private contentSections: Map<string, HTMLDivElement> = new Map();
  private inspectionContentDiv: HTMLDivElement | null = null; // Div for inspection details
 
  constructor() {
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
 
    // this.handleInspectObject = this.handleInspectObject.bind(this); // Removed as method is removed
    this.handleStopInspecting = this.handleStopInspecting.bind(this);
    this.handleShowInspectionDetails = this.handleShowInspectionDetails.bind(this);
 
    // eventBus.on(Events.DEBUG_INSPECT_OBJECT, this.handleInspectObject); // No longer needed
    eventBus.on(Events.DEBUG_STOP_INSPECTING, this.handleStopInspecting);
    eventBus.on(Events.DEBUG_SHOW_INSPECTION_DETAILS, this.handleShowInspectionDetails);
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
    // If inspecting, don't update with the default data stream
    if (!this.isVisible || this.isInspecting) return;
 
    this.hideInspectionView();
 
    Object.entries(data).forEach(([category, categoryData]) => {
      let section = this.contentSections.get(category);
      if (!section) {
        section = this.createCategorySection(category);
        this.contentSections.set(category, section);
        this.container.appendChild(section);
        section.style.display = 'block';
      } else {
        section.style.display = 'block'; // Ensure section is visible if it was hidden during inspection
      }
 
      // Clear existing content within the section (keep the header)
      while (section.children.length > 1) {
        section.removeChild(section.lastChild!);
      }

      // Special handling for ActiveObjects category
      if (category === 'ActiveObjects') {
        const { legend, objects } = categoryData as {
          legend: Record<string, string>;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          objects: Record<string, any>[]; // Reverted unknown back to any
        };

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

        objects.forEach((obj) => {
          const entry = document.createElement('div');
          entry.style.marginLeft = '10px';
          entry.style.marginBottom = '3px'; // Less margin for compact list
          entry.style.fontSize = '13px'; // Slightly smaller font for list
          entry.style.whiteSpace = 'nowrap';

          const objectString = Object.entries(obj)
            .map(([key, value]) => {
              if (value === undefined || value === null) return null; // Skip undefined/null properties
              if (typeof value === 'boolean') {
                return `${key}:${value ? 'T' : 'F'}`; // Format boolean values nicely
              }
              if (typeof value === 'number') {
                return `${key}:${Number.isInteger(value) ? value : value.toFixed(1)}`; // Format numbers
              }
              return `${key}:${value}`; // Keep strings/IDs as is
            })
            .filter(Boolean) // Remove null entries
            .join(' ');

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
    // eventBus.off(Events.DEBUG_INSPECT_OBJECT, this.handleInspectObject); // No longer needed
    eventBus.off(Events.DEBUG_STOP_INSPECTING, this.handleStopInspecting);
    eventBus.off(Events.DEBUG_SHOW_INSPECTION_DETAILS, this.handleShowInspectionDetails);
  }
 
  // --- Inspection Mode Methods ---
 
  // private handleInspectObject(data: { id: string; type: string }): void { // No longer needed
  //   if (!this.isVisible) return;
  //
  //   this.isInspecting = true;
  //   this.hideDefaultSections(); // Hide default sections
  //   this.showInspectionView(`Inspecting ${data.type} ID: ${data.id}...`); // Show placeholder
  //
  //   // Data fetching is now handled by GameSceneDebugHandler + DebugObjectInspector
  // }
 
  private handleStopInspecting(): void {
    if (!this.isVisible) return;
 
    this.isInspecting = false;
    this.hideInspectionView();
    this.showDefaultSections();
    // The next call to updateData will repopulate the default sections
  }
 
  private handleShowInspectionDetails(data: { html: string }): void {
      if (!this.isVisible) return;
 
      this.isInspecting = true;
      this.hideDefaultSections();
      this.showInspectionView(data.html, true); // Display the received HTML
  }
 
  // Method to be called by DebugObjectInspector later - RENAME/REPURPOSE
  // public displayObjectDetails(formattedHtml: string): void {
  //   if (!this.isInspecting || !this.isVisible) return;
  //   this.showInspectionView(formattedHtml, true); // Display formatted HTML
  // }
 
  private showInspectionView(content: string, isHtml = false): void {
    if (!this.inspectionContentDiv) {
      this.inspectionContentDiv = document.createElement('div');
      this.inspectionContentDiv.style.marginTop = '10px';
      this.container.appendChild(this.inspectionContentDiv);
    }
    if (isHtml) {
      this.inspectionContentDiv.innerHTML = content; // Set as HTML
    } else {
      this.inspectionContentDiv.textContent = content; // Set as plain text
    }
    this.inspectionContentDiv.style.display = 'block';
  }
 
  private hideInspectionView(): void {
    if (this.inspectionContentDiv) {
      this.inspectionContentDiv.style.display = 'none';
      this.inspectionContentDiv.innerHTML = '';
    }
  }
 
  private hideDefaultSections(): void {
    this.contentSections.forEach(section => {
      section.style.display = 'none';
    });
  }
 
  private showDefaultSections(): void {
    this.contentSections.forEach(section => {
      section.style.display = 'block';
    });
  }
}
 
export default HtmlDebugPanel;
