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
    const weaponButtonSetup = [
        { id: 'weaponButton1', name: 'Bullet', weaponKey: 'bullet' },
        { id: 'weaponButton2', name: 'Laser', weaponKey: 'laser' },
        { id: 'weaponButton3', name: 'Slow', weaponKey: 'slow_field' } // Assuming 'slow_field' is the weapon key for "Slow"
    ];

    // Ensure activeWeaponId is valid, default to the first weapon's key if not.
    // This check uses .some() to see if any weaponConfig has a weaponKey matching activeWeaponId.
    if (!weaponButtonSetup.some(config => config.weaponKey === activeWeaponId)) {
        logger.warn(`Invalid or missing activeWeaponId "${activeWeaponId}", defaulting to "${weaponButtonSetup[0].weaponKey}"`);
        activeWeaponId = weaponButtonSetup[0].weaponKey;
    }

    weaponButtonSetup.forEach((weaponConfig, index) => {
        const button = uiElements.get(weaponConfig.id);
        if (!button) {
            logger.warn(`Button element not found in uiElements map: ${weaponConfig.id}`);
            return; // Skip if button element doesn't exist
        }

        const isActive = weaponConfig.weaponKey === activeWeaponId;

        // Set styles based on active state
        button.style.backgroundColor = isActive ? '#888800' : '#555555'; // Active yellow-ish, Inactive dark gray
        button.style.color = isActive ? '#ffff00' : '#dddddd'; // Active yellow text, Inactive light gray text
        button.style.borderColor = isActive ? '#ffff00' : 'transparent'; // Active yellow border, Inactive transparent

        // Update name display
        const nameElement = button.querySelector('.weapon-name');
        if (nameElement) {
            nameElement.textContent = `${isActive ? '▶ ' : ''}${index + 1}: ${weaponConfig.name}`;
        } else {
            // This warning was added in a previous step, ensure it remains or is similar
            logger.warn(`'.weapon-name' child not found in button ${weaponConfig.id}`);
        }
    });
    
    // Removed the weaponToButtonMap and the separate logic for setting active button as it's handled in the loop.
    // The initial loop for resetting all buttons is also subsumed by the single loop.
    logger.debug(`Updated weapon buttons display, active weapon key: "${activeWeaponId}"`);
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
        } else {
            logger.warn(`'.weapon-level' child not found in button for weapon ${weaponId}`);
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