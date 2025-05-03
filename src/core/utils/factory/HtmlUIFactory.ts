import logger from '../Logger';
import { type ElementAlignment, type UIElementConfig, type CooldownBarData } from '../types/HtmlUI.types';

/**
 * Factory class responsible for creating and styling HTML UI elements.
 */
export class HtmlUIFactory {
    private canvas: HTMLCanvasElement;
    private uiElementsMap: Map<string, HTMLDivElement>; // To store created elements
    private cooldownBarsMap: Map<string, CooldownBarData>; // To store cooldown bar elements

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.uiElementsMap = new Map();
        this.cooldownBarsMap = new Map();
    }

    /**
     * Creates all standard UI elements and registers them.
     * @returns A map of the created elements.
     */
    public createAllElements(): { elements: Map<string, HTMLDivElement>, cooldownBars: Map<string, CooldownBarData> } {
        this.uiElementsMap.clear();
        this.cooldownBarsMap.clear();

        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        // Define element configurations with relative positioning
        const elementConfigs: UIElementConfig[] = [
            // Top Left
            { id: 'health', text: 'Health: 100', relativeX: 0.02, relativeY: 0.03, color: '#00ff00' },
            { id: 'score', text: 'Score: 0', relativeX: 0.02, relativeY: 0.07, color: '#ffffff' },
            // Top Right
            { id: 'wave', text: 'Wave: 1', relativeX: 0.02, relativeY: 0.03, color: '#ffffff', align: 'right' },
            { id: 'currency', text: 'Currency: 0', relativeX: 0.02, relativeY: 0.07, color: '#ffff00', align: 'right' },
            // We'll show upgrade cost directly in the weapon buttons
            // Center (Pause Indicator)
            { id: 'pauseIndicator', text: 'PAUSED', relativeX: 0.5, relativeY: 0.5, color: '#ff0000', align: 'center', bgColor: 'rgba(0,0,0,0.7)' },
        ];

        // Create elements based on configs with calculated absolute positions
        elementConfigs.forEach(config => {
            // Convert relative positions to absolute if they exist
            let absoluteConfig = { ...config };
            if (config.relativeX !== undefined) {
                absoluteConfig.x = config.relativeX * canvasWidth;
            }
            if (config.relativeY !== undefined) {
                absoluteConfig.y = config.relativeY * canvasHeight;
            }
            
            const element = this.createUIElement(absoluteConfig);
            this.uiElementsMap.set(config.id, element);
        });

        // Create weapon button container
        this.createWeaponButtonContainer();

        return { elements: this.uiElementsMap, cooldownBars: this.cooldownBarsMap };
    }

    /**
     * Creates the weapon button container and buttons
     */
    private createWeaponButtonContainer(): void {
        // Create container for weapon buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'weaponButtonContainer';
        
        // Set container styles
        buttonContainer.style.position = 'absolute';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'row';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.zIndex = '999';
        buttonContainer.style.pointerEvents = 'auto';
        
        // Store in map
        this.uiElementsMap.set('weaponButtonContainer', buttonContainer);
        
        // Create weapon buttons
        const weaponConfigs = [
            { id: 'weaponButton1', weaponId: 'bullet', name: 'Bullet', color: '#ff0000' },
            { id: 'weaponButton2', weaponId: 'laser', name: 'Laser', color: '#00ffff' },
            { id: 'weaponButton3', weaponId: 'slow_field', name: 'Slow', color: 'rgba(255, 215, 0, 0.7)' },
        ];
        
        weaponConfigs.forEach((config, index) => {
            // Create button
            const button = document.createElement('div');
            button.id = config.id;
            button.className = 'weapon-button';
            button.dataset.weapon = config.weaponId;
            
            // Set button styles
            button.style.position = 'relative';
            button.style.display = 'flex';
            button.style.flexDirection = 'column';
            button.style.justifyContent = 'space-between';
            button.style.padding = '8px';
            button.style.borderRadius = '6px';
            button.style.backgroundColor = '#555555';
            button.style.color = '#dddddd';
            button.style.width = '120px'; // Increased by 50% from 80px
            button.style.height = '60px';
            button.style.textAlign = 'center';
            button.style.cursor = 'pointer';
            button.style.userSelect = 'none';
            button.style.border = '2px solid transparent';
            
            // Add weapon name
            const nameElement = document.createElement('div');
            nameElement.className = 'weapon-name';
            nameElement.textContent = `${index+1}: ${config.name}`;
            nameElement.style.fontWeight = 'bold';
            nameElement.style.marginBottom = '4px';
            button.appendChild(nameElement);
            
            // Add level and upgrade cost indicator
            const levelElement = document.createElement('div');
            levelElement.className = 'weapon-level';
            levelElement.textContent = 'Lvl 1 | Ugr: 10';
            levelElement.style.fontSize = '0.8em';
            levelElement.style.marginBottom = '4px';
            button.appendChild(levelElement);
            
            // Add progress bar container
            const progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';
            progressContainer.style.position = 'relative';
            progressContainer.style.height = '4px';
            progressContainer.style.width = '100%';
            progressContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
            progressContainer.style.overflow = 'hidden';
            
            // Add progress bar
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.style.position = 'absolute';
            progressBar.style.height = '100%';
            progressBar.style.width = '0%';
            progressBar.style.transition = 'width 0.05s linear';
            progressBar.style.backgroundColor = config.color;
            progressContainer.appendChild(progressBar);
            button.appendChild(progressContainer);
            
            // Store button and progress bar
            this.uiElementsMap.set(config.id, button);
            
            const barId = config.id.replace('weaponButton', 'cooldownBar');
            this.cooldownBarsMap.set(barId, {
                barId,
                innerBar: progressBar,
                color: config.color
            });
            
            // Add to container
            buttonContainer.appendChild(button);
        });
        
        logger.debug('Created weapon button container with buttons');
    }

    /**
     * Creates a single UI element based on configuration.
     */
    public createUIElement(config: UIElementConfig): HTMLDivElement {
        const { id, text, x, y, relativeX, relativeY, color, align = 'left', bgColor } = config;

        const element = document.createElement('div');
        element.id = id; // Assign ID for easier debugging
        element.style.position = 'absolute';
        element.style.color = color;
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.fontSize = '18px'; // Consider making this configurable
        element.style.fontWeight = 'bold';
        element.style.pointerEvents = 'none'; // Default: no interaction
        element.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.8)';
        element.style.whiteSpace = 'pre'; // Preserve line breaks if any in text

        if (bgColor) {
            element.style.backgroundColor = bgColor;
            element.style.padding = '5px 10px';
            element.style.borderRadius = '4px';
        }

        // Store original config for repositioning
        element.dataset.config = JSON.stringify({
            id,
            relativeX,
            relativeY,
            align
        });

        // Set alignment and position
        if (x !== undefined && y !== undefined) {
            this.positionElement(element, x, y, align);
        }

        element.textContent = text;

        return element;
    }

    /**
     * Calculates and sets the screen position of an element relative to the canvas.
     */
    public positionElement(element: HTMLDivElement, x: number | undefined, y: number | undefined, align: ElementAlignment = 'left'): void {
        if (x === undefined || y === undefined) {
            return; // Skip positioning if coordinates are not provided
        }
        
        const canvasRect = this.canvas.getBoundingClientRect();

        // Calculate base position relative to canvas top-left
        const baseX = canvasRect.left + x;
        const baseY = canvasRect.top + y;

        element.style.top = `${baseY}px`;

        // Handle horizontal alignment
        if (align === 'right') {
            // Position relative to the right edge of the canvas minus the provided x offset
            element.style.right = `${window.innerWidth - canvasRect.right + x}px`;
            element.style.left = ''; // Unset left
            element.style.textAlign = 'right';
            element.style.transform = ''; // Unset transform
        } else if (align === 'center') {
            element.style.left = `${baseX}px`;
            element.style.right = ''; // Unset right
            element.style.textAlign = 'center';
            element.style.transform = 'translateX(-50%)'; // Center horizontally
        } else { // align === 'left'
            element.style.left = `${baseX}px`;
            element.style.right = ''; // Unset right
            element.style.textAlign = 'left';
            element.style.transform = ''; // Unset transform
        }
    }

    /**
     * Handles canvas resize events by repositioning all UI elements
     */
    public handleCanvasResize(): void {
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Reposition all elements based on their stored config
        this.uiElementsMap.forEach((element, id) => {
            // Skip weapon button container - it's handled separately in HtmlUI
            if (id === 'weaponButtonContainer') return;
            
            const configStr = element.dataset.config;
            if (configStr) {
                try {
                    const config = JSON.parse(configStr);
                    if (config.relativeX !== undefined && config.relativeY !== undefined) {
                        const x = config.relativeX * canvasWidth;
                        const y = config.relativeY * canvasHeight;
                        this.positionElement(element, x, y, config.align || 'left');
                    }
                } catch (e) {
                    logger.warn(`Failed to parse config for element ${id}:`, e);
                }
            }
        });
    }
}