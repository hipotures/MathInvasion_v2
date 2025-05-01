import { DebugPanelData, ActiveObjectData } from '../types/DebugPanelTypes';

/**
 * Transforms collected debug data into display-friendly formats
 * Handles different data types and provides consistent formatting
 */
export class DebugPanelFormatter {
  /**
   * Formats debug data for the HTML debug panel
   * @param data The debug data to format
   * @returns The formatted data
   */
  public formatData(data: DebugPanelData): Record<string, any> {
    // No transformation needed - HtmlDebugPanel already expects this structure
    return data;
  }

  /**
   * Formats an active object for display
   * @param obj The active object data
   * @returns The formatted object string
   public formatActiveObject(obj: ActiveObjectData): string {
     return Object.entries(obj)
       .map(([key, value]) => {
         if (value === undefined || value === null) return null; // Skip undefined/null properties
         
         // Use T/F for booleans to save space
         if (typeof value === 'boolean') {
           return `${key}:${value ? 'T' : 'F'}`;
         }
         
         // Format numbers with consistent precision
         if (typeof value === 'number') {
           return `${key}:${Number.isInteger(value) ? value : value.toFixed(1)}`;
         }
         
         return `${key}:${value}`;
       })
       .filter(Boolean) // Remove null entries
       .join(' '); // Join with spaces for compact display
   }
  }

  /**
   * Creates a legend for active objects
   * @returns The legend data
   */
  public createLegend(): Record<string, string> {
    return {
      ID: 'Unique Object ID',
      T: 'Type (Pl=Player, En=Enemy, Pr=Projectile, Pu=Powerup)',
      X: 'Position X',
      Y: 'Position Y',
      H: 'Health',
      I: 'Invulnerable',
      Vx: 'Velocity X',
      Vy: 'Velocity Y',
      A: 'Age (s)',
    };
  }

  /**
   * Formats a generic object for display
   * @param obj The object to format
   * @returns The formatted object
   */
  public formatGenericObject(obj: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    
    Object.entries(obj).forEach(([key, value]) => {
      let displayValue = value;
      
      if (typeof value === 'object') {
        try {
          // Use minimal indentation for readability while conserving space
          displayValue = JSON.stringify(value, null, 1);
        } catch {
          displayValue = '[Object]'; // Fallback for non-serializable objects
        }
      }
      
      result[key] = String(displayValue);
    });
    
    return result;
  }
}