# UI and Debug Mode Fix Plan

## Current Issues

1. **Weapon Button Positioning**
   - Buttons (Bullet/Laser/Slow) moved from bottom of play area to middle-left
   - Default button (Bullet) not highlighted properly at game start

2. **Cooldown/Energy Indicators**
   - Separate from weapon buttons instead of integrated
   - Index mapping inconsistency between buttons and cooldown bars

3. **Pause Button**
   - Shifted upward and left from original position when game paused

4. **HUD Layout**
   - Health/Score/Wave/Currency not arranged properly (should be 2 on each side)
   - Currently 3 on left, 1 on right

5. **Debug Mode Issues**
   - Collision boundaries not shown in debug mode
   - Object selection highlighting not working
   - Some objects can't be selected for debugging
   - Selected objects show a purple circle (collision area?) with unclear purpose

## Fix Strategy

### 1. UI Element Position Fixes

#### Weapon Buttons
- Move buttons back to bottom center of screen
- Integrate cooldown/energy bars directly into button elements
- Fix default button highlighting on startup

```javascript
// In HtmlUIFactory.ts:
// Update element configurations
{ id: 'weaponButton1', text: '1: Bullet', relativeX: 0.4, relativeY: 0.93, color: '#dddddd', bgColor: '#555555' },
{ id: 'weaponButton2', text: '2: Laser', relativeX: 0.5, relativeY: 0.93, color: '#dddddd', bgColor: '#555555' },
{ id: 'weaponButton3', text: '3: Slow', relativeX: 0.6, relativeY: 0.93, color: '#dddddd', bgColor: '#555555' },

// Remove separate cooldown bars:
// this.createCooldownBar('cooldownBar1', 0.4 * canvasWidth, 0.97 * canvasHeight, 0.08 * canvasWidth, '#ff0000');
// this.createCooldownBar('cooldownBar2', 0.5 * canvasWidth, 0.97 * canvasHeight, 0.08 * canvasWidth, '#00ffff');
// this.createCooldownBar('cooldownBar3', 0.6 * canvasWidth, 0.97 * canvasHeight, 0.08 * canvasWidth, 'rgba(255, 215, 0, 0.7)');
```

#### HUD Layout
- Fix Health/Score/Wave/Currency arrangement:

```javascript
// In HtmlUIFactory.ts, adjust positioning:
// Left side elements
{ id: 'health', text: 'Health: 100', relativeX: 0.02, relativeY: 0.03, color: '#00ff00' },
{ id: 'score', text: 'Score: 0', relativeX: 0.02, relativeY: 0.07, color: '#ffffff' },
// Right side elements
{ id: 'wave', text: 'Wave: 1', relativeX: 0.02, relativeY: 0.03, color: '#ffffff', align: 'right' },
{ id: 'currency', text: 'Currency: 0', relativeX: 0.02, relativeY: 0.07, color: '#ffff00', align: 'right' },
```

#### Pause Button
- Fix pause indicator positioning:

```javascript
// Center (Pause Indicator)
{ id: 'pauseIndicator', text: 'PAUSED', relativeX: 0.5, relativeY: 0.5, color: '#ff0000', align: 'center', bgColor: 'rgba(0,0,0,0.7)' },
```

### 2. Integrating Cooldown/Energy Bars into Weapon Buttons

Instead of separate cooldown bars, we'll integrate them directly into the buttons:

```javascript
// In createUIElement function, add for weapon buttons:
if (id.startsWith('weaponButton')) {
    // Create progress indicator within the button
    const progressBar = document.createElement('div');
    progressBar.style.position = 'absolute';
    progressBar.style.bottom = '0';
    progressBar.style.left = '0';
    progressBar.style.height = '3px';
    progressBar.style.width = '0%';
    progressBar.style.backgroundColor = id === 'weaponButton1' ? '#ff0000' : 
                                      id === 'weaponButton2' ? '#00ffff' : 
                                      'rgba(255, 215, 0, 0.7)';
    element.appendChild(progressBar);
    element.dataset.progressBar = 'true';
}
```

Then update the `updateWeaponCooldown` function:

```javascript
export function updateWeaponCooldown(
    uiElements: Map<string, HTMLDivElement>,
    weaponId: string,
    progress: number
): void {
    const buttonMap = {
        'bullet': 'weaponButton1',
        'laser': 'weaponButton2',
        'slow_field': 'weaponButton3'
    };
    
    const buttonId = buttonMap[weaponId];
    if (buttonId) {
        const button = uiElements.get(buttonId);
        if (button) {
            // Find the progress bar (first child element)
            const progressBar = button.querySelector('div');
            if (progressBar) {
                const clampedProgress = Math.max(0, Math.min(1, progress));
                progressBar.style.width = `${clampedProgress * 100}%`;
            }
        }
    }
}
```

### 3. Debug Mode Fixes

#### Fix Projectile Visibility
- Update ProjectileEventHandler.ts to always keep projectiles visible:

```javascript
// Replace:
projectileShape.setVisible(!debugState.isDebugMode);

// With:
projectileShape.setVisible(true); // Always visible
```

#### Fix Debug Object Selection and Collision Visualization

- Review GameSceneDebugVisualization.ts to ensure collision areas are properly drawn
- Update the drawInspectionHighlight method to better highlight selected objects
- Fix the object selection filtering logic in DebugInspectionHandler

```javascript
// In drawInspectionHighlight function:
// Draw collision area (red)
if (body && body.enable) {
    this.customDebugGraphics.lineStyle(2, 0xff0000, 1); // Red for collision areas
    if (body.isCircle) {
        this.customDebugGraphics.strokeCircle(body.center.x, body.center.y, body.radius);
    } else {
        this.customDebugGraphics.strokeRect(body.x, body.y, body.width, body.height);
    }
}
```

## Implementation Steps

1. **Update ProjectileEventHandler.ts**
   - Fix projectile visibility in debug mode

2. **Update HtmlUIFactory.ts**
   - Fix UI element positioning
   - Integrate cooldown indicators into buttons
   - Remove separate cooldown bars

3. **Update HtmlUIComponents.ts**
   - Fix weapon button highlighting logic
   - Update cooldown visualization to work with integrated bars

4. **Update GameSceneDebugVisualization.ts**
   - Ensure debug highlights and collision areas appear properly

5. **Update DebugInspectionHandler.ts**
   - Fix object selection filtering
   - Improve debug panel display of object properties