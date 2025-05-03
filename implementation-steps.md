# Detailed Implementation Steps

## 1. Fix Projectile Visibility in Debug Mode

### ProjectileEventHandler.ts

- **Change**: Make projectiles always visible regardless of debug mode
```typescript
// Replace line ~140:
projectileShape.setVisible(!debugState.isDebugMode);

// With:
projectileShape.setVisible(true); // Always visible in both normal and debug modes
```

## 2. Fix Weapon Button UI and Positioning

### HtmlUIFactory.ts

- **Remove** separate cooldown bars creation (lines ~63-66)
```typescript
// Remove these lines:
this.createCooldownBar('cooldownBar1', 0.4 * canvasWidth, 0.97 * canvasHeight, 0.08 * canvasWidth, '#ff0000');
this.createCooldownBar('cooldownBar2', 0.5 * canvasWidth, 0.97 * canvasHeight, 0.08 * canvasWidth, '#00ffff');
this.createCooldownBar('cooldownBar3', 0.6 * canvasWidth, 0.97 * canvasHeight, 0.08 * canvasWidth, 'rgba(255, 215, 0, 0.7)');
```

- **Update** element configuration for weapon buttons to ensure they're at the bottom of the game area:
```typescript
// Update these configurations:
{ id: 'weaponButton1', text: '1: Bullet', relativeX: 0.4, relativeY: 0.93, color: '#dddddd', bgColor: '#555555' },
{ id: 'weaponButton2', text: '2: Laser', relativeX: 0.5, relativeY: 0.93, color: '#dddddd', bgColor: '#555555' },
{ id: 'weaponButton3', text: '3: Slow', relativeX: 0.6, relativeY: 0.93, color: '#dddddd', bgColor: '#555555' },
```

- **Modify** `createUIElement` function to add progress bars inside weapon buttons:
```typescript
// In createUIElement function, add after line ~114:
if (id.startsWith('weaponButton')) {
    // Add progress bar inside the button
    const progressBar = document.createElement('div');
    progressBar.style.position = 'absolute';
    progressBar.style.bottom = '0';
    progressBar.style.left = '0';
    progressBar.style.height = '4px';
    progressBar.style.width = '0%';
    progressBar.style.backgroundColor = id === 'weaponButton1' ? '#ff0000' : 
                                        id === 'weaponButton2' ? '#00ffff' : 
                                        'rgba(255, 215, 0, 0.7)';
    progressBar.style.transition = 'width 0.05s linear';
    element.appendChild(progressBar);
    element.style.position = 'relative'; // Ensure relative positioning
}
```

- **Remove** the entire `createCooldownBar` function (lines ~122-145)

- **Remove** `repositionCooldownBars` function (lines ~214-237) and its call in the `handleCanvasResize` function

### HtmlUIComponents.ts

- **Update** `updateWeaponCooldown` function to use the integrated progress bars:
```typescript
export function updateWeaponCooldown(
    cooldownBars: Map<string, CooldownBarData>,
    weaponId: string,
    progress: number
): void {
    // Map weapon IDs to button IDs
    const buttonMap: {[key: string]: string} = {
        'bullet': 'weaponButton1',
        'laser': 'weaponButton2',
        'slow_field': 'weaponButton3'
    };
    
    const buttonId = buttonMap[weaponId];
    if (!buttonId) return;
    
    // Instead of using cooldownBars map, get the button element directly via DOM
    const buttonElement = document.getElementById(buttonId);
    if (!buttonElement) return;
    
    // Find the progress bar (first child div)
    const progressBar = buttonElement.querySelector('div');
    if (!progressBar) return;
    
    // Update progress bar width
    const clampedProgress = Math.max(0, Math.min(1, progress));
    progressBar.style.width = `${clampedProgress * 100}%`;
    
    // Log for debugging
    logger.debug(`Updated ${weaponId} cooldown progress: ${clampedProgress}`);
}
```

## 3. Fix HUD Layout

### HtmlUIFactory.ts

- **Update** element configuration to ensure proper layout (2 elements on each side):
```typescript
// Top Left
{ id: 'health', text: 'Health: 100', relativeX: 0.02, relativeY: 0.03, color: '#00ff00' },
{ id: 'score', text: 'Score: 0', relativeX: 0.02, relativeY: 0.07, color: '#ffffff' },
// Top Right
{ id: 'wave', text: 'Wave: 1', relativeX: 0.02, relativeY: 0.03, color: '#ffffff', align: 'right' },
{ id: 'currency', text: 'Currency: 0', relativeX: 0.02, relativeY: 0.07, color: '#ffff00', align: 'right' },
```

## 4. Fix Debug Mode Object Selection and Visualization

### GameSceneDebugVisualization.ts

- **Update** the `drawInspectionHighlight` method to properly show collision boundaries:
```typescript
private drawInspectionHighlight(obj: DebugDrawableObject): void {
    const body = (obj as any).body as Phaser.Physics.Arcade.Body | undefined;
    
    // Draw collision area (red)
    if (body && body.enable) {
        this.customDebugGraphics.lineStyle(2, 0xff0000, 1); // Red for collision areas
        if (body.isCircle) {
            this.customDebugGraphics.strokeCircle(body.center.x, body.center.y, body.radius);
        } else {
            this.customDebugGraphics.strokeRect(body.x, body.y, body.width, body.height);
        }
    }
    
    // Draw selection highlight (magenta)
    this.customDebugGraphics.lineStyle(2, 0xff00ff); // Magenta highlight
    this.customDebugGraphics.fillStyle(0xff00ff, 0.2);

    if (body) {
        if (body.isCircle) {
            this.customDebugGraphics.strokeCircle(body.center.x, body.center.y, body.radius + 2); 
            this.customDebugGraphics.fillCircle(body.center.x, body.center.y, body.radius + 2);
        } else {
            this.customDebugGraphics.strokeRect(body.x - 1, body.y - 1, body.width + 2, body.height + 2);
            this.customDebugGraphics.fillRect(body.x - 1, body.y - 1, body.width + 2, body.height + 2);
        }
    } else if (typeof obj.getBounds === 'function') {
        const bounds = obj.getBounds();
        this.customDebugGraphics.strokeRect(bounds.x - 1, bounds.y - 1, bounds.width + 2, bounds.height + 2);
        this.customDebugGraphics.fillRect(bounds.x - 1, bounds.y - 1, bounds.width + 2, bounds.height + 2);
    }
}
```

### DebugInspectionHandler.ts

- We need to check this file to ensure it properly handles object selection:
```typescript
// Check handleObjectClick method to ensure it's handling all object types correctly
// Particularly projectiles and enemies
```

## 5. Fix Pause Button Positioning

### HtmlUIFactory.ts

- **Verify** pause indicator positioning is centered:
```typescript
// Center (Pause Indicator)
{ id: 'pauseIndicator', text: 'PAUSED', relativeX: 0.5, relativeY: 0.5, color: '#ff0000', align: 'center', bgColor: 'rgba(0,0,0,0.7)' },
```

## Testing Strategy

After implementing these changes, we should test:

1. **Weapon Button Functionality**
   - Verify default highlighting of bullet weapon on startup
   - Check weapon switching correctly updates button highlighting
   - Confirm cooldown/energy indicators appear within buttons

2. **Debug Mode**
   - Test that projectiles remain visible in debug mode
   - Verify collision boundaries are shown
   - Test object selection works for all object types
   - Check that selected objects are properly highlighted

3. **UI Positioning**
   - Verify buttons are positioned at bottom
   - Check HUD elements are properly arranged (2 on each side)
   - Test pause button appears centered

4. **Responsiveness**
   - Test that all UI elements reposition correctly when window is resized