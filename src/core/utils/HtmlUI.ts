import logger from './Logger';
import { HtmlUIFactory } from './factory/HtmlUIFactory'; // Import the factory
import { type CooldownBarData } from './types/HtmlUI.types'; // Import types
import * as UIComponents from './components/HtmlUIComponents'; // Import all component functions
import eventBus from '../events/EventBus';

/**
 * Utility class for creating and managing HTML UI elements using the browser's DOM.
 * Orchestrates the HtmlUIFactory and HtmlUIComponents.
 */
export class HtmlUI {
    private container: HTMLDivElement;
    private weaponButtonContainer: HTMLDivElement | null = null;
    private uiElements: Map<string, HTMLDivElement> = new Map();
    private cooldownBars: Map<string, CooldownBarData> = new Map(); // Store cooldown bar data
    private factory: HtmlUIFactory | null = null;
    private gameCanvas: HTMLCanvasElement | null = null;

    constructor() {
        // Create container for all UI elements
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.pointerEvents = 'none'; // Don't interfere with game input by default
        this.container.style.zIndex = '998'; // Below debug labels

        // Add container to document
        document.body.appendChild(this.container);

        // Find canvas and initialize factory
        this.gameCanvas = document.querySelector('canvas');
        if (!this.gameCanvas) {
            logger.error('Canvas element not found for HtmlUI initialization');
            return; // Cannot proceed without canvas
        }
        this.factory = new HtmlUIFactory(this.gameCanvas);

        // Create initial UI elements using the factory
        this.recreateUIElements();

        // Add window resize listener
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Listen for canvas resize events
        eventBus.on('CANVAS_RESIZED', this.handleCanvasResized.bind(this));
    }

    /**
     * Handle window resize to reposition elements.
     */
    private handleResize(): void {
        if (this.factory) {
            // Use the factory's handleCanvasResize method to reposition elements
            this.factory.handleCanvasResize();
        }
        
        // Reposition weapon buttons
        this.positionWeaponButtons();
    }
    
    /**
     * Handle canvas resize events from the game
     */
    private handleCanvasResized(data: { width: number, height: number }): void {
        if (this.factory) {
            // Use the factory's handleCanvasResize method to reposition elements
            this.factory.handleCanvasResize();
        }
        
        // Reposition weapon buttons
        this.positionWeaponButtons();
    }

    /**
     * Clears existing elements and recreates them using the factory.
     * Also re-appends them to the container.
     */
    private recreateUIElements(): void {
        if (!this.factory) return;

        // Clear existing elements from DOM and maps
        this.container.innerHTML = '';
        this.uiElements.clear();
        this.cooldownBars.clear();

        // Use factory to create all elements
        const { elements, cooldownBars } = this.factory.createAllElements();
        this.uiElements = elements;
        this.cooldownBars = cooldownBars;

        // Create a separate container for weapon buttons
        this.createWeaponButtonContainer();

        // Append other UI elements to the container
        this.uiElements.forEach((element, id) => {
            // Skip weapon buttons - they go in their own container
            if (id === 'weaponButton1' || id === 'weaponButton2' || id === 'weaponButton3') {
                return;
            }
            
            this.container.appendChild(element);
        });

        // Ensure pause indicator is hidden initially after creation/recreation
        this.hidePauseIndicator();
    }
    
    /**
     * Creates a fixed container for weapon buttons at the bottom of the canvas
     */
    private createWeaponButtonContainer(): void {
        if (!this.gameCanvas) return;
        
        // Remove existing container if any
        if (this.weaponButtonContainer && document.body.contains(this.weaponButtonContainer)) {
            document.body.removeChild(this.weaponButtonContainer);
        }
        
        // Create new container
        this.weaponButtonContainer = document.createElement('div');
        this.weaponButtonContainer.id = 'weaponButtonContainer';
        this.weaponButtonContainer.style.position = 'fixed';
        this.weaponButtonContainer.style.display = 'flex';
        this.weaponButtonContainer.style.flexDirection = 'row';
        this.weaponButtonContainer.style.justifyContent = 'center';
        this.weaponButtonContainer.style.gap = '10px';
        this.weaponButtonContainer.style.zIndex = '999';
        this.weaponButtonContainer.style.pointerEvents = 'auto';
        
        // Add weapon buttons to container
        const weaponButtons = [
            this.uiElements.get('weaponButton1'),
            this.uiElements.get('weaponButton2'),
            this.uiElements.get('weaponButton3')
        ];
        
        weaponButtons.forEach(button => {
            if (button) {
                this.weaponButtonContainer!.appendChild(button);
            }
        });
        
        // Add to document and position
        document.body.appendChild(this.weaponButtonContainer);
        this.positionWeaponButtons();
    }
    
    /**
     * Position the weapon buttons at the bottom of the canvas
     */
    private positionWeaponButtons(): void {
        if (!this.gameCanvas || !this.weaponButtonContainer) return;
        
        const canvasRect = this.gameCanvas.getBoundingClientRect();
        
        // Position at the very bottom of the canvas with a small margin
        const bottomOffset = 20; // Fixed 20px from bottom
        
        // Position relative to canvas
        this.weaponButtonContainer.style.bottom = `${bottomOffset}px`;
        this.weaponButtonContainer.style.left = `${canvasRect.left + (canvasRect.width / 2)}px`;
        this.weaponButtonContainer.style.transform = 'translateX(-50%)';
        
        logger.debug(`Positioned weapon buttons at ${bottomOffset}px from bottom`);
    }

    // --- Public Update Methods (Delegating to UIComponents) ---

    public updateCurrency(amount: number): void {
        UIComponents.updateCurrency(this.uiElements, amount);
    }

    public updateHealth(health: number): void {
        UIComponents.updateHealth(this.uiElements, health);
    }

    public updateScore(score: number): void {
        UIComponents.updateScore(this.uiElements, score);
    }

    public updateWave(wave: number): void {
        UIComponents.updateWave(this.uiElements, wave);
    }

    // This method is now redundant as level info is shown in the buttons
    // Keeping it for backward compatibility but it won't be used
    public updateWeaponStatus(weaponId: string, level: number): void {
        // No-op - we're not using the separate weapon status display anymore
    }
    
    /**
     * Updates the level and upgrade cost display for all weapon buttons.
     */
    public updateWeaponLevels(levels: {[weaponId: string]: number}, costs: {[weaponId: string]: number | null} = {}): void {
        UIComponents.updateWeaponLevels(this.uiElements, levels, costs);
    }

    /**
     * This method is kept for backward compatibility but is now a no-op.
     * Upgrade costs are now displayed directly in the weapon buttons.
     */
    public updateWeaponUpgradeCost(cost: number | null): void {
        // No-op - costs are now displayed in the weapon buttons
    }

    public updateWeaponButtons(activeWeaponId: string): void {
        UIComponents.updateWeaponButtons(this.uiElements, activeWeaponId);
    }

    public updateWeaponCooldown(weaponId: string, progress: number): void {
        UIComponents.updateWeaponCooldown(this.cooldownBars, weaponId, progress);
    }

    public showPauseIndicator(): void {
        UIComponents.showPauseIndicator(this.uiElements);
    }

    public hidePauseIndicator(): void {
        UIComponents.hidePauseIndicator(this.uiElements);
    }

    /**
     * Destroy all UI elements and the container, remove listeners.
     */
    public destroy(): void {
        window.removeEventListener('resize', this.handleResize.bind(this));
        eventBus.off('CANVAS_RESIZED', this.handleCanvasResized.bind(this));

        // Remove the main container
        if (document.body.contains(this.container)) {
            document.body.removeChild(this.container);
        }
        
        // Remove weapon button container
        if (this.weaponButtonContainer && document.body.contains(this.weaponButtonContainer)) {
            document.body.removeChild(this.weaponButtonContainer);
        }
        
        this.uiElements.clear();
        this.cooldownBars.clear();
        this.gameCanvas = null;
        this.factory = null; // Release factory reference
        logger.log('HtmlUI destroyed.');
    }
}

// Export as default for backward compatibility
export default HtmlUI;
