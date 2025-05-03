# Weapon UI Implementation Plan

Based on the redesign strategy outlined in the weapon-ui-redesign-plan.md, here's a detailed implementation plan with specific code changes for each affected file.

## 1. HtmlUIFactory.ts Changes

### Button Container Integration

Replace the current separate button container with an integrated approach:

```typescript
// BEFORE - Separate container added to document.body
const buttonContainer = document.createElement('div');
buttonContainer.id = 'weaponButtonContainer';
buttonContainer.style.position = 'absolute';
buttonContainer.style.bottom = '20px';
buttonContainer.style.left = '50%';
buttonContainer.style.transform = 'translateX(-50%)';
document.body.appendChild(buttonContainer);

// AFTER - Integrated container within the main UI
const buttonContainer = document.createElement('div');
buttonContainer.id = 'weaponButtonContainer';
buttonContainer.style.position = 'absolute';
buttonContainer.style.bottom = '15%';  // Percentage-based positioning
buttonContainer.style.left = '50%';
buttonContainer.style.transform = 'translateX(-50%)';
buttonContainer.style.display = 'flex';
buttonContainer.style.gap = '10px';
buttonContainer.style.zIndex = '999';
this.container.appendChild(buttonContainer);  // Add to main UI container
this.uiElementsMap.set('weaponButtonContainer', buttonContainer);
```

### Improved Button Component Structure

Enhance the button creation with a clearer component structure:

```typescript
buttonConfigs.forEach((config, index) => {
    const buttonId = config.id;
    const weaponId = ['bullet', 'laser', 'slow_field'][index];
    const weaponName = buttonId === 'weaponButton1' ? 'Bullet' : 
                        buttonId === 'weaponButton2' ? 'Laser' : 'Slow';
    
    // Create main button element
    const button = document.createElement('div');
    button.id = buttonId;
    button.className = 'weapon-button';
    button.dataset.weapon = weaponId;
    button.style.position = 'relative';
    button.style.display = 'flex';
    button.style.flexDirection = 'column';
    button.style.justifyContent = 'space-between';
    button.style.padding = '8px';
    button.style.borderRadius = '6px';
    button.style.backgroundColor = '#555555';
    button.style.color = '#dddddd';
    button.style.minWidth = '80px';
    button.style.minHeight = '60px';
    button.style.textAlign = 'center';
    button.style.cursor = 'pointer';
    button.style.userSelect = 'none';
    button.style.border = '2px solid transparent';
    
    // Add weapon name element
    const nameElement = document.createElement('div');
    nameElement.className = 'weapon-name';
    nameElement.textContent = `${index+1}: ${weaponName}`;
    nameElement.style.fontWeight = 'bold';
    nameElement.style.marginBottom = '4px';
    button.appendChild(nameElement);
    
    // Add level indicator element
    const levelElement = document.createElement('div');
    levelElement.className = 'weapon-level';
    levelElement.textContent = 'Lvl 1';  // Will be updated later
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
    progressBar.style.backgroundColor = buttonId === 'weaponButton1' ? '#ff0000' :
                                       buttonId === 'weaponButton2' ? '#00ffff' :
                                       'rgba(255, 215, 0, 0.7)';
    progressContainer.appendChild(progressBar);
    button.appendChild(progressContainer);
    
    // Store the button and bar in maps
    this.uiElementsMap.set(buttonId, button);
    
    const barId = buttonId.replace('weaponButton', 'cooldownBar');
    this.cooldownBarsMap.set(barId, {
        barId,
        innerBar: progressBar,
        color: progressBar.style.backgroundColor
    });
    
    // Add button to container
    const buttonContainer = this.uiElementsMap.get('weaponButtonContainer');
    if (buttonContainer) {
        buttonContainer.appendChild(button);
    }
});
```

### Improved Positioning Logic

Update the handleCanvasResize method:

```typescript
public handleCanvasResize(): void {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const canvasRect = this.canvas.getBoundingClientRect();
    
    // Reposition all elements based on their stored config
    this.uiElementsMap.forEach((element, id) => {
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
    
    // Reposition the weapon button container
    const buttonContainer = this.uiElementsMap.get('weaponButtonContainer');
    if (buttonContainer) {
        // Position relative to canvas, not window
        const bottom = canvasHeight * 0.15;
        buttonContainer.style.bottom = `${bottom}px`;
        buttonContainer.style.left = `${canvasWidth * 0.5}px`;
        
        // Log for debugging
        logger.debug(`Repositioned weapon buttons at bottom: ${bottom}px, left: ${canvasWidth * 0.5}px`);
    }
}
```

## 2. HtmlUIComponents.ts Changes

### Refactored updateWeaponButtons Function

```typescript
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
    
    // Update each button's appearance
    Object.entries(weaponToButtonMap).forEach(([weaponId, buttonId]) => {
        const button = uiElements.get(buttonId);
        if (!button) {
            logger.warn(`Button element not found: ${buttonId}`);
            return;
        }
        
        const isActive = weaponId === activeWeaponId;
        logger.debug(`Button ${buttonId} (${weaponId}): ${isActive ? 'ACTIVE' : 'inactive'}`);
        
        // Update styles based on active state
        if (isActive) {
            button.style.backgroundColor = '#888800';
            button.style.color = '#ffff00';
            button.style.borderColor = '#ffff00';
        } else {
            button.style.backgroundColor = '#555555';
            button.style.color = '#dddddd';
            button.style.borderColor = 'transparent';
        }
        
        // Update name display with selection indicators
        const nameElement = button.querySelector('.weapon-name');
        if (nameElement) {
            const index = buttonId.replace('weaponButton', '');
            const weaponName = buttonId === 'weaponButton1' ? 'Bullet' : 
                              buttonId === 'weaponButton2' ? 'Laser' : 'Slow';
            nameElement.textContent = isActive ? `▶ ${index}: ${weaponName}` : `${index}: ${weaponName}`;
        }
    });
}
```

### Improved updateWeaponCooldown Function

```typescript
export function updateWeaponCooldown(
    cooldownBars: Map<string, CooldownBarData>,
    weaponId: string,
    progress: number
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
```

### Update Weapon Level Display

```typescript
export function updateWeaponLevels(
    uiElements: Map<string, HTMLDivElement>,
    levels: {[weaponId: string]: number}
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
            levelElement.textContent = `Lvl ${level}`;
        }
    });
}
```

## 3. UIScene.ts Changes

### Enhanced handleWeaponStateUpdate

```typescript
private handleWeaponStateUpdate(data: AllWeaponStatesUpdateData): void {
    logger.debug(`UIScene received WEAPON_STATE_UPDATED: activeWeapon=${data.activeWeaponId}`);
    
    // Update button styles based on active weapon
    this.htmlUI.updateWeaponButtons(data.activeWeaponId);
    
    // Update all weapon cooldown/energy bars
    for (const weaponId in data.progress) {
        if (Object.prototype.hasOwnProperty.call(data.progress, weaponId)) {
            const progress = data.progress[weaponId];
            this.htmlUI.updateWeaponCooldown(weaponId, progress);
        }
    }
    
    // Update all weapon levels
    this.htmlUI.updateWeaponLevels(data.levels);
    
    // Only update the upgrade cost display since it's separate
    const activeWeaponCost = data.nextUpgradeCosts[data.activeWeaponId];
    this.htmlUI.updateWeaponUpgradeCost(activeWeaponCost);
}
```

## 4. HtmlUI.ts Changes

### Add updateWeaponLevels Method

```typescript
public updateWeaponLevels(levels: {[weaponId: string]: number}): void {
    UIComponents.updateWeaponLevels(this.uiElements, levels);
}
```

### Update Element Config

```typescript
// Move upgrade cost text higher to avoid overlap
{ 
    id: 'weaponUpgradeCost', 
    text: 'Upgrade Cost: 10', 
    relativeX: 0.5, 
    relativeY: 0.84,  // Higher position
    color: '#ffff00', 
    align: 'center' 
},

// Remove or relocate the weaponStatus element since we now show level in buttons
// Either remove it completely:
// { id: 'weaponStatus', text: 'Weapon: Bullet Lvl: 1', relativeX: 0.5, relativeY: 0.89, color: '#ffffff', align: 'center' },

// Or move it to a different position:
{ 
    id: 'weaponStatus', 
    text: 'Weapon: Bullet Lvl: 1', 
    relativeX: 0.5, 
    relativeY: 0.80,  // Higher position
    color: '#ffffff', 
    align: 'center' 
},
```

## 5. WeaponManager.ts Changes

### Ensure Initial State Update

Add to the WeaponManager constructor:

```typescript
constructor(
    eventBusInstance: EventBusType,
    economyManagerInstance: EconomyManager,
    weaponUpgraderInstance: WeaponUpgrader,
    weaponPowerupHandlerInstance: WeaponPowerupHandler
) {
    // ... existing code ...
    
    // Initialize state for all weapons using the imported function
    this.weaponRuntimeState = initializeAllWeaponStates(this.weaponsConfig, this.weaponUpgrader);
    
    // Ensure the initial weapon exists
    if (!this.weaponRuntimeState.has(this.currentWeaponId)) {
        logger.error(`Initial weapon ID "${this.currentWeaponId}" not found in config! Defaulting...`);
        // Fallback logic if needed, e.g., use the first weapon found
        this.currentWeaponId = this.weaponRuntimeState.keys().next().value || 'error_no_weapons';
    }
    
    // Add logging to show the initial weapon
    logger.debug(`WeaponManager initialized with default weapon: "${this.currentWeaponId}"`);
    
    // ... existing code ...
    
    // Emit initial state for all weapons
    this.emitStateUpdate();
    
    // Double check that a weapon state update is emitted with a small delay
    // This ensures the UI has time to initialize before receiving the state
    setTimeout(() => {
        logger.debug('Sending delayed initial weapon state update');
        this.emitStateUpdate();
    }, 100);
}
```

## Testing Plan

1. **Initial Weapon Selection**
   - Verify the default weapon (bullet) is highlighted on game start
   - Check if the cooldown/energy bar is properly displayed

2. **Weapon Switching**
   - Test switching between weapons using number keys
   - Confirm the correct button is highlighted when switched
   - Verify the level display updates correctly

3. **Cooldown/Energy Visualization**
   - Test firing each weapon type and observe cooldown/energy bar updates
   - Verify laser (energy weapon) drains and refills correctly
   - Check that cooldown weapons show the correct cooldown state

4. **Layout Integrity**
   - Verify buttons don't overlap with upgrade cost display
   - Ensure buttons remain properly positioned when window is resized
   - Check that active weapon is clearly distinguishable

5. **Level Display and Upgrades**
   - Upgrade weapons and verify level displays update correctly
   - Confirm upgrade costs are displayed in the correct location

## Implementation Order

1. First, modify HtmlUIFactory.ts to create the new button structure
2. Update HtmlUI.ts with the new method and element configuration
3. Enhance HtmlUIComponents.ts with the improved update functions
4. Modify UIScene.ts to leverage the new component functions
5. Update WeaponManager.ts to ensure proper initialization

After completing these changes, the weapon UI should be properly positioned, display correct information, and integrate weapon state directly into the button design.