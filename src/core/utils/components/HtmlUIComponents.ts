import logger from '../Logger';
import { type CooldownBarData } from '../types/HtmlUI.types';

/**
 * Updates a specific UI element's text content and optionally its color.
 */
function updateElement(
    uiElements: Map<string, HTMLDivElement>,
    id: string,
    text: string,
    color?: string
): void {
    const element = uiElements.get(id);
    if (element) {
        element.textContent = text;
        if (color) {
            element.style.color = color;
        }
    } else {
        // Log warning only once maybe? Or use debug level
        // logger.warn(`HtmlUIComponents: Element '${id}' not found for update.`);
    }
}

/**
 * Update currency display.
 */
export function updateCurrency(uiElements: Map<string, HTMLDivElement>, amount: number): void {
    updateElement(uiElements, 'currency', `Currency: ${amount}`);
}

/**
 * Update health display, changing color based on value.
 */
export function updateHealth(uiElements: Map<string, HTMLDivElement>, health: number): void {
    let color = '#00ff00'; // Green
    if (health < 30) {
        color = '#ff0000'; // Red
    } else if (health < 60) {
        color = '#ffff00'; // Yellow
    }
    updateElement(uiElements, 'health', `Health: ${health}`, color);
}

/**
 * Update score display.
 */
export function updateScore(uiElements: Map<string, HTMLDivElement>, score: number): void {
    updateElement(uiElements, 'score', `Score: ${score}`);
}

/**
 * Update wave display.
 */
export function updateWave(uiElements: Map<string, HTMLDivElement>, wave: number): void {
    updateElement(uiElements, 'wave', `Wave: ${wave}`);
}

/**
 * Update weapon status display.
 */
export function updateWeaponStatus(uiElements: Map<string, HTMLDivElement>, weaponId: string, level: number): void {
    const weaponName = weaponId.charAt(0).toUpperCase() + weaponId.slice(1).replace('_', ' '); // Capitalize and replace underscore
    updateElement(uiElements, 'weaponStatus', `Weapon: ${weaponName} Lvl: ${level}`);
}

/**
 * Update weapon upgrade cost display.
 * This is now a no-op as the cost is displayed in the weapon buttons.
 */
export function updateWeaponUpgradeCost(uiElements: Map<string, HTMLDivElement>, cost: number | null): void {
    // No-op - cost is now displayed in the weapon buttons
}

/**
 * Update weapon button appearance based on the active weapon.
 */
export function updateWeaponButtons(uiElements: Map<string, HTMLDivElement>, activeWeaponId: string): void {
    // Define consistent weapon mapping
    const weaponToButtonMap: {[key: string]: string} = {
        'bullet': 'weaponButton1',
        'laser': 'weaponButton2',
        'slow_field': 'weaponButton3'
    };
    
    // Standardize active weapon ID handling
    if (!activeWeaponId) {
        logger.warn("No active weapon ID provided, defaulting to 'bullet'");
        activeWeaponId = 'bullet';
    }
    
    logger.debug(`Updating weapon buttons, active weapon: "${activeWeaponId}"`);
    
    // First, reset all buttons to inactive state
    for (let i = 1; i <= 3; i++) {
        const buttonId = `weaponButton${i}`;
        const button = uiElements.get(buttonId);
        if (button) {
            button.style.backgroundColor = '#555555';
            button.style.color = '#dddddd';
            button.style.borderColor = 'transparent';
            
            // Reset name display
            const nameElement = button.querySelector('.weapon-name');
            if (nameElement) {
                const weaponName = buttonId === 'weaponButton1' ? 'Bullet' :
                                  buttonId === 'weaponButton2' ? 'Laser' : 'Slow';
                nameElement.textContent = `${i}: ${weaponName}`;
            }
        }
    }
    
    // Then, set only the active button
    const activeButtonId = weaponToButtonMap[activeWeaponId];
    if (activeButtonId) {
        const activeButton = uiElements.get(activeButtonId);
        if (activeButton) {
            // Set active styles
            activeButton.style.backgroundColor = '#888800';
            activeButton.style.color = '#ffff00';
            activeButton.style.borderColor = '#ffff00';
            
            // Update name display with selection indicators
            const nameElement = activeButton.querySelector('.weapon-name');
            if (nameElement) {
                const index = activeButtonId.replace('weaponButton', '');
                const weaponName = activeButtonId === 'weaponButton1' ? 'Bullet' :
                                  activeButtonId === 'weaponButton2' ? 'Laser' : 'Slow';
                nameElement.textContent = `▶ ${index}: ${weaponName}`;
            }
            
            logger.debug(`Set button ${activeButtonId} as ACTIVE for weapon ${activeWeaponId}`);
        } else {
            logger.warn(`Active button element not found: ${activeButtonId}`);
        }
    } else {
        logger.warn(`No button mapping found for active weapon: ${activeWeaponId}`);
    }
}

/**
 * Updates the visual progress of a weapon's cooldown bar.
 */
export function updateWeaponCooldown(
    cooldownBars: Map<string, CooldownBarData>,
    weaponId: string,
    progress: number // Cooldown progress from 0.0 (ready) to 1.0 (full cooldown)
): void {
    // Map weapon IDs to button IDs
    const weaponToButtonMap: {[key: string]: string} = {
        'bullet': 'weaponButton1',
        'laser': 'weaponButton2',
        'slow_field': 'weaponButton3'
    };
    
    const buttonId = weaponToButtonMap[weaponId];
    if (!buttonId) {
        logger.warn(`Unknown weapon ID for cooldown update: ${weaponId}`);
        return;
    }
    
    const barId = buttonId.replace('weaponButton', 'cooldownBar');
    const barData = cooldownBars.get(barId);
    
    if (!barData?.innerBar) {
        logger.warn(`Cooldown bar data not found for weapon: ${weaponId}`);
        return;
    }
    
    // Clamp progress between 0 and 1
    const clampedProgress = Math.max(0, Math.min(1, progress));
    
    // Update progress bar width
    barData.innerBar.style.width = `${clampedProgress * 100}%`;
    
    logger.debug(`Updated ${weaponId} cooldown progress: ${clampedProgress}`);
}


/**
 * Updates the level and upgrade cost display for all weapon buttons.
 */
export function updateWeaponLevels(
    uiElements: Map<string, HTMLDivElement>,
    levels: {[weaponId: string]: number},
    costs: {[weaponId: string]: number | null} = {}
): void {
    // Map weapon IDs to button IDs
    const weaponToButtonMap: {[key: string]: string} = {
        'bullet': 'weaponButton1',
        'laser': 'weaponButton2',
        'slow_field': 'weaponButton3'
    };
    
    // Update level display for each weapon
    Object.entries(levels).forEach(([weaponId, level]) => {
        const buttonId = weaponToButtonMap[weaponId];
        if (!buttonId) return;
        
        const button = uiElements.get(buttonId);
        if (!button) return;
        
        // Find level display element
        const levelElement = button.querySelector('.weapon-level');
        if (levelElement) {
            const cost = costs[weaponId];
            if (cost !== null && cost !== undefined) {
                levelElement.textContent = `Lvl ${level} | Ugr: ${cost}`;
            } else {
                levelElement.textContent = `Lvl ${level} | Max`;
            }
        }
    });
}

/**
 * Shows the pause indicator element.
 */
export function showPauseIndicator(uiElements: Map<string, HTMLDivElement>): void {
    const element = uiElements.get('pauseIndicator');
    if (element) {
        element.style.display = 'block';
    } else {
        logger.error(`HtmlUIComponents: Element 'pauseIndicator' not found when calling showPauseIndicator!`);
    }
}

/**
 * Hides the pause indicator element.
 */
export function hidePauseIndicator(uiElements: Map<string, HTMLDivElement>): void {
    const element = uiElements.get('pauseIndicator');
    if (element) {
        element.style.display = 'none';
    } else {
        // Don't error if called before element exists (e.g., initial setup)
        // logger.warn(`HtmlUIComponents: Element 'pauseIndicator' not found when calling hidePauseIndicator!`);
    }
}