// Type for alignment options
export type ElementAlignment = 'left' | 'center' | 'right';

// Interface for basic element configuration (can be expanded)
export interface UIElementConfig {
    id: string;
    text: string;
    x?: number;          // Absolute X position (optional)
    y?: number;          // Absolute Y position (optional)
    relativeX?: number;  // Position as percentage of canvas width (0.0 to 1.0)
    relativeY?: number;  // Position as percentage of canvas height (0.0 to 1.0)
    color: string;
    align?: ElementAlignment;
    bgColor?: string;
}

// Interface for cooldown bar data
export interface CooldownBarData {
    barId: string;
    innerBar: HTMLDivElement;
    color: string;
}