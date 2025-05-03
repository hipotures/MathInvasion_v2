# UI and Debug Functionality Repair Plan

After analyzing the code post-refactoring, I've identified several issues that need to be fixed to restore the original functionality. This plan outlines the specific problems and proposes solutions to restore the user interface layout and debug functionality.

## 1. UI Element Position Issues

### 1.1. Weapon Button Positioning
**Problem:** The weapon buttons (Bullet/Laser/Slow) have moved from the bottom of the screen to the middle-left side.

**Solution:** Update the position coordinates in `src/core/utils/factory/HtmlUIFactory.ts` to place them at the bottom center of the screen:

```javascript
// From:
{ id: 'weaponButton1', text: '1: Bullet', x: 20, y: canvasHeight - 50, color: '#dddddd', bgColor: '#555555' },
{ id: 'weaponButton2', text: '2: Laser', x: 150, y: canvasHeight - 50, color: '#dddddd', bgColor: '#555555' },
{ id: 'weaponButton3', text: '3: Slow', x: 280, y: canvasHeight - 50, color: '#dddddd', bgColor: '#555555' },

// To:
{ id: 'weaponButton1', text: '1: Bullet', x: (canvasWidth / 2) - 130, y: canvasHeight - 50, color: '#dddddd', bgColor: '#555555' },
{ id: 'weaponButton2', text: '2: Laser', x: (canvasWidth / 2), y: canvasHeight - 50, color: '#dddddd', bgColor: '#555555' },
{ id: 'weaponButton3', text: '3: Slow', x: (canvasWidth / 2) + 130, y: canvasHeight - 50, color: '#dddddd', bgColor: '#555555' },
```

Also update the cooldown bar positions to match:

```javascript
// From:
this.createCooldownBar('cooldownBar1', 20, canvasHeight - 25, 100, '#ff0000');
this.createCooldownBar('cooldownBar2', 150, canvasHeight - 25, 100, '#00ffff');
this.createCooldownBar('cooldownBar3', 280, canvasHeight - 25, 100, 'rgba(255, 215, 0, 0.7)');

// To:
this.createCooldownBar('cooldownBar1', (canvasWidth / 2) - 130, canvasHeight - 25, 100, '#ff0000');
this.createCooldownBar('cooldownBar2', (canvasWidth / 2), canvasHeight - 25, 100, '#00ffff');
this.createCooldownBar('cooldownBar3', (canvasWidth / 2) + 130, canvasHeight - 25, 100, 'rgba(255, 215, 0, 0.7)');
```

### 1.2. Pause Button Position
**Problem:** The pause indicator has moved up and to the left after refactoring.

**Solution:** Verify the pause indicator position in `HtmlUIFactory.ts` is correctly set to the center of the screen:

```javascript
// Center (Pause Indicator) - Ensure this positioning is correct
{ id: 'pauseIndicator', text: 'PAUSED', x: canvasWidth / 2, y: canvasHeight / 2, color: '#ff0000', align: 'center', bgColor: 'rgba(0,0,0,0.7)' },
```

### 1.3. Game Stats Display Balance
**Problem:** Currently there are 3 stats on the left (health, score, wave) and 1 on the right (currency), but it should be balanced with 2 on each side.

**Solution:** Reposition the wave display to be on the right side with currency:

```javascript
// From:
// Top Left
{ id: 'health', text: 'Health: 100', x: 20, y: 20, color: '#00ff00' },
{ id: 'score', text: 'Score: 0', x: 20, y: 50, color: '#ffffff' },
{ id: 'wave', text: 'Wave: 1', x: 20, y: 80, color: '#ffffff' },
// Top Right
{ id: 'currency', text: 'Currency: 0', x: 20, y: 20, color: '#ffff00', align: 'right' },

// To:
// Top Left
{ id: 'health', text: 'Health: 100', x: 20, y: 20, color: '#00ff00' },
{ id: 'score', text: 'Score: 0', x: 20, y: 50, color: '#ffffff' },
// Top Right
{ id: 'wave', text: 'Wave: 1', x: 20, y: 20, color: '#ffffff', align: 'right' },
{ id: 'currency', text: 'Currency: 0', x: 20, y: 50, color: '#ffff00', align: 'right' },
```

## 2. Debug Mode Visualization Issues

### 2.1. Missing Collision Areas in Debug Mode
**Problem:** In debug mode, collision boundaries (hit areas) are not being displayed.

**Solution:** Restore the collision area visualization in `src/phaser/handlers/debug/handlers/DebugVisualizationHandler.ts` by re-adding the code to draw collision shapes:

A comment in the code indicates this was deliberately removed:
```javascript
// Removed hit area visualization (red rectangles)
```

We need to restore something like this (adjusted to fit the current code structure):

```javascript
// Add back collision area visualization
// Draw hit area visualization (red rectangles)
this.debugGraphics.lineStyle(2, 0xff0000, 1);
if (body && body.enable) {
    if (body.isCircle) {
        this.debugGraphics.strokeCircle(body.center.x, body.center.y, body.radius);
    } else {
        this.debugGraphics.strokeRect(body.x, body.y, body.width, body.height);
    }
}
```

### 2.2. Object Selection and Highlighting Issues
**Problem:** Object selection in debug mode doesn't highlight objects correctly. Some objects can't be selected, and some show a purple circle instead of proper highlighting.

**Solution:** 
1. Make sure the `isInspected` check is working correctly:

```javascript
// Update in the drawDebugRectangle method
const isInspected = inspectedObject?.id === objectId && inspectedObject?.type === objectType;
const config: DebugVisualizationConfig = {
    strokeColor: isInspected ? 0xffff00 : 0x00ff00, // Yellow if inspected, green otherwise
    labelColor: isInspected ? '#ffff00' : '#00ff00',
    lineWidth: isInspected ? 2 : 1, // Make inspected objects' outlines thicker
};
```

2. Ensure that the label highlighting works properly:

```javascript
// In updateLabel method
const labelText = isInspected ? `⭐ ${displayName} ⭐` : displayName;
```

3. Fix the purple circle issue by examining how circular collision bodies are being drawn.

4. Debug the issue where some objects can't be selected by verifying the hit testing code in `GameSceneDebugHandler.ts` correctly identifies all game object types.

### 2.3. Debug Panel Information Display
**Problem:** When clicking on an object in debug mode, its properties aren't displayed in the debug panel.

**Solution:** Ensure the debug panel updater is correctly notified when an object is selected:

```javascript
// In GameSceneDebugHandler.ts, handleObjectClick method:
private handleObjectClick(gameObject: Phaser.GameObjects.GameObject): void {
    if (!debugState.isDebugMode) return;

    const stateChanged = this.inspectionHandler.handleObjectClick(gameObject);
    if (stateChanged) {
        // Update visuals to reflect selection
        this.updateDebugVisuals();
        
        // Make sure debug panel updater refreshes with the newly selected object
        this.debugPanelUpdater.update();
    }
}
```

## 3. Implementation Plan

### Phase 1: UI Element Positioning
1. Update `HtmlUIFactory.ts` to fix weapon button positions
2. Adjust cooldown bar positions to match
3. Verify pause indicator positioning
4. Rebalance status displays between left and right sides

### Phase 2: Debug Visualization
1. Restore collision area visualization in `DebugVisualizationHandler.ts`
2. Fix object selection highlighting
3. Fix object label highlighting to clearly indicate selected objects

### Phase 3: Debug Inspection
1. Verify the inspection state is correctly updated when objects are clicked
2. Ensure debug panel displays selected object properties
3. Fix the inspection handler to properly handle all object types

### Phase 4: Testing
1. Test UI layout at different screen sizes
2. Verify debug mode shows proper collision areas
3. Test object selection for all types (player, enemies, projectiles, powerups)
4. Confirm debug panel shows properties for selected objects

## 4. Additional Considerations

- The refactoring changed the file structure but the core functionality should remain the same
- Some debug functionality may be spread across multiple files now, requiring changes in multiple places
- We'll need to ensure backward compatibility with any external references to these components
- Console logging may be useful during testing to verify object selection and inspection events