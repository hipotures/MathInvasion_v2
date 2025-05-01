import { InspectedObjectData, DebugFormatterOptions } from '../types/InspectionTypes';

/**
 * Handles formatting of inspection data to HTML
 * Provides consistent styling and layout for debug data
 */
export class DebugDataFormatter {
  private defaultOptions: DebugFormatterOptions = {
    includeNullValues: false,
    maxDepth: 2,
    indentSize: 2
  };

  constructor(private options: DebugFormatterOptions = {}) {
    // Merge provided options with defaults
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Formats inspection data to HTML
   * @param data The inspection data to format
   * @returns Formatted HTML string
   */
  public formatDataToHtml(data: InspectedObjectData): string {
    // Use <pre> for monospace font and preserving line breaks
    let textContent = `<pre style="font-family: monospace; white-space: pre; line-height: 1.4; margin: 0; padding: 5px;">`;
    
    // ID and Type at the top
    textContent += `ID:${data.id}\n`;
    textContent += `Type:${data.type}\n`;
    
    // Add parent info if available (for projectiles)
    if (data.standardProperties['Parent']) {
      textContent += `Parent:${data.standardProperties['Parent']}\n`;
      // Remove parent from standard properties to avoid duplication
      delete data.standardProperties['Parent'];
    }
    
    // Add age if available
    if (data.standardProperties['Age (s)']) {
      textContent += `Age:${data.standardProperties['Age (s)']}\n`;
      // Remove age from standard properties to avoid duplication
      delete data.standardProperties['Age (s)'];
    }
    
    // Add position and velocity at the top level
    this.extractAndAddProperty(textContent, data.standardProperties, 'Position X', 'X');
    this.extractAndAddProperty(textContent, data.standardProperties, 'Position Y', 'Y');
    this.extractAndAddProperty(textContent, data.standardProperties, 'Velocity X', 'Vx');
    this.extractAndAddProperty(textContent, data.standardProperties, 'Velocity Y', 'Vy');
    
    // Add horizontal separator
    textContent += this.addSeparator();
    
    // Config Section (YAML Data)
    if (data.configData && Object.keys(data.configData).length > 0) {
      textContent += this.formatConfigSection(data.configData);
      // Add horizontal separator after config section
      textContent += this.addSeparator();
    }
    
    // Standard Properties Section (remaining properties)
    if (Object.keys(data.standardProperties).length > 0) {
      textContent += this.formatStandardProperties(data.standardProperties);
      // Add horizontal separator after standard properties
      textContent += this.addSeparator();
    }
    
    // Other Properties Section
    if (Object.keys(data.otherProperties).length > 0) {
      textContent += this.formatOtherProperties(data.otherProperties);
      // Add horizontal separator after other properties
      textContent += this.addSeparator();
    }
    
    textContent += `</pre>`;
    return textContent;
  }

  /**
   * Extracts a property from an object and adds it to the text content
   * @param textContent The text content to add to
   * @param properties The properties object to extract from
   * @param originalKey The original key in the properties object
   * @param displayKey The key to display in the output
   */
  private extractAndAddProperty(
    textContent: string, 
    properties: Record<string, any>, 
    originalKey: string, 
    displayKey: string
  ): void {
    if (properties[originalKey] !== undefined) {
      textContent += `${displayKey}:${properties[originalKey]}\n`;
      delete properties[originalKey];
    }
  }

  /**
   * Adds a horizontal separator to the text content
   * @returns The separator string
   */
  private addSeparator(): string {
    return `------------------------------\n`;
  }

  /**
   * Formats the config section of the inspection data
   * @param configData The config data to format
   * @returns Formatted config section
   */
  private formatConfigSection(configData: any): string {
    let result = '';
    
    Object.entries(configData).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'type') { // Skip id and type as they're already shown
        if (typeof value !== 'object' || value === null) {
          result += `[${key}:${value}]\n`;
        } else {
          // Basic stringify for objects/arrays in config
          result += `[${key}:${JSON.stringify(value)}]\n`;
        }
      }
    });
    
    return result;
  }

  /**
   * Formats the standard properties section of the inspection data
   * @param properties The standard properties to format
   * @returns Formatted standard properties section
   */
  private formatStandardProperties(properties: Record<string, any>): string {
    let result = '';
    
    Object.entries(properties).forEach(([key, value]) => {
      if (key !== 'Age (s)' && !key.startsWith('Position') && !key.startsWith('Velocity')) {
        result += `[${key}:${value}]\n`;
      }
    });
    
    return result;
  }

  /**
   * Formats the other properties section of the inspection data
   * @param properties The other properties to format
   * @returns Formatted other properties section
   */
  private formatOtherProperties(properties: Record<string, any>): string {
    let result = '';
    
    Object.entries(properties).forEach(([key, value]) => {
      result += `[${key}:${value}]\n`;
    });
    
    return result;
  }
}