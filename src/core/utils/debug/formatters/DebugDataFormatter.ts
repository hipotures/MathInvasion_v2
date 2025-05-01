// Removed InspectedObjectData import as it's no longer used for the input type
import { DebugFormatterOptions } from '../types/InspectionTypes';

/**
 * Handles formatting of inspection data (now a flat object) to HTML
 * Provides consistent styling and layout for debug data
 */
export class DebugDataFormatter {
  private defaultOptions: DebugFormatterOptions = {
    includeNullValues: false, // Note: These options are currently unused in the simplified formatter
    maxDepth: 2,
    indentSize: 2
  };

  constructor(private options: DebugFormatterOptions = {}) {
    // Merge provided options with defaults
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Formats inspection data (flat object) to HTML
   * @param data The flat key-value object from the inspector
   * @returns Formatted HTML string in [key: value] format
   */
  public formatDataToHtml(data: { [key: string]: any } | null): string {
    // Handle null input gracefully
    if (!data) {
      return `<pre style="font-family: monospace; white-space: pre; line-height: 1.4; margin: 0; padding: 5px; color: orange;">No data available for inspection.</pre>`;
    }

    // Use <pre> for monospace font and preserving line breaks
    let textContent = `<pre style="font-family: monospace; white-space: pre; line-height: 1.4; margin: 0; padding: 5px;">`;

    // Iterate through all properties in the flat data object
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        // Format as [key: value]
        // Handle potential undefined/null values for display
        textContent += `[${key}: ${value ?? 'N/A'}]\n`;
      }
    }

    textContent += `</pre>`;
    return textContent;
  }

  // Removed unused private helper methods:
  // - extractAndAddProperty
  // - addSeparator
  // - formatConfigSection
  // - formatStandardProperties
  // - formatOtherProperties
}