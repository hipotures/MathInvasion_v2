# UI and Debug Repair Implementation Guide

This document provides detailed implementation instructions for fixing the UI and debug functionality issues. Each section contains the specific code changes needed, file paths, and relevant line numbers.

## 1. UI Element Position Fixes

### 1.1. File: `src/core/utils/factory/HtmlUIFactory.ts`

#### 1.1.1. Weapon Button Positioning

Find the elementConfigs array and locate the weapon button definitions (around line 40-44):

```javascript
// Bottom Left (Weapon Buttons) - Positions might need adjustment
{ id: 'weaponButton1', text: '1: Bullet', x: 20, y: canvasHeight - 50, color: '#dddddd', bgColor: '#555555' },
{ id: 'weaponButton2', text: '2: Laser', x: 150, y: canvasHeight - 50, color: '#dddddd', bgColor: '#555555' },
{ id: 'weaponButton3', text: '3: Slow', x: 280, y: canvasHeight - 50, color: '#dddddd', bgColor: '#555555' },
```

Change to:

```javascript
// Bottom Center (Weapon Buttons)
{ id: 'weaponButton1', text: '1: Bullet', x: (canvasWidth / 2) - 130, y: canvasHeight - 50, color: '#dddddd', bgColor: '#555555' },
{ id: 'weaponButton2', text: '2: Laser', x: (canvasWidth / 2), y: canvasHeight - 50, color: '#dddddd', bgColor: '#555555' },
{ id: 'weaponButton3', text: '3: Slow', x: (canvasWidth / 2) + 130, y: canvasHeight - 50, color: '#dddddd', bgColor: '#555555' },
```

#### 1.1.2. Cooldown Bar Positioning

Find the cooldown bar creation code (around line 55-57):

```javascript
// Create Cooldown Bars separately below buttons
this.createCooldownBar('cooldownBar1', 20, canvasHeight - 25, 100, '#ff0000'); // Below Button 1
this.createCooldownBar('cooldownBar2', 150, canvasHeight - 25, 100, '#00ffff'); // Below Button 2
this.createCooldownBar('cooldownBar3', 280, canvasHeight - 25, 100, 'rgba(255, 215, 0, 0.7)'); // Below Button 3
```

Change to:

```javascript
// Create Cooldown Bars separately below buttons
this.createCooldownBar('cooldownBar1', (canvasWidth / 2) - 130, canvasHeight - 25, 100, '#ff0000'); // Below Button 1
this.createCooldownBar('cooldownBar2', (canvasWidth / 2), canvasHeight - 25, 100, '#00ffff'); // Below Button 2
this.createCooldownBar('cooldownBar3', (canvasWidth / 2) + 130, canvasHeight - 25, 100, 'rgba(255, 215, 0, 0.7)'); // Below Button 3
```

#### 1.1.3. Game Stat Display Balance

Find the elementConfigs array and locate the stats elements (around line 30-37):

```javascript
// Top Left
{ id: 'health', text: 'Health: 100', x: 20, y: 20, color: '#00ff00' },
{ id: 'score', text: 'Score: 0', x: 20, y: 50, color: '#ffffff' },
{ id: 'wave', text: 'Wave: 1', x: 20, y: 80, color: '#ffffff' },
// Top Right
{ id: 'currency', text: 'Currency: 0', x: 20, y: 20, color: '#ffff00', align: 'right' },
```

Change to:

```javascript
// Top Left
{ id: 'health', text: 'Health: 100', x: 20, y: 20, color: '#00ff00' },
{ id: 'score', text: 'Score: 0', x: 20, y: 50, color: '#ffffff' },
// Top Right
{ id: 'wave', text: 'Wave: 1', x: 20, y: 20, color: '#ffffff', align: 'right' },
{ id: 'currency', text: 'Currency: 0', x: 20, y: 50, color: '#ffff00', align: 'right' },
```

## 2. Debug Mode Visualization Fixes

### 2.1. File: `src/phaser/handlers/debug/handlers/DebugVisualizationHandler.ts`

#### 2.1.1. Restore Collision Area Visualization

Find the `drawDebugRectangle` method. After a comment that says "Removed hit area visualization (red rectangles)" (around line 162-163), add the following code:

```javascript
// Add back hit area visualization (red rectangles)
if (body && body.enable) {
  this.debugGraphics.lineStyle(2, 0xff0000, 1);
  if (body.isCircle) {
    // Draw circle for circular physics bodies
    this.debugGraphics.strokeCircle(body.center.x, body.center.y, body.radius);
  } else {
    // Draw rectangle for box physics bodies
    this.debugGraphics.strokeRect(body.x, body.y, body.width, body.height);
  }
}
```

#### 2.1.2. Improve Object Selection Highlighting

Find the config definition in the `drawDebugRectangle` method (around line 135-139):

```javascript
const config: DebugVisualizationConfig = {
  strokeColor: isInspected ? 0xffff00 : 0x00ff00, // Yellow if inspected, green otherwise
  labelColor: isInspected ? '#ffff00' : '#00ff00', // Yellow if inspected, green otherwise
  lineWidth: 1,
};
```

Change to:

```javascript
const config: DebugVisualizationConfig = {
  strokeColor: isInspected ? 0xffff00 : 0x00ff00, // Yellow if inspected, green otherwise
  labelColor: isInspected ? '#ffff00' : '#00ff00', // Yellow if inspected, green otherwise
  lineWidth: isInspected ? 2 : 1, // Thicker line for inspected objects
};
```

#### 2.1.3. Fix Label Highlighting for Selected Objects

Find the label text definition in the `drawDebugRectangle` method (around line 219):

```javascript
const labelText = isInspected ? `⭐ ${displayName} ⭐` : displayName;
```

Make sure this line is present and correct.

### 2.2. File: `src/phaser/handlers/GameSceneDebugHandler.ts`

#### 2.2.1. Ensure Debug Panel Updates on Object Selection

Find the `handleObjectClick` method (around line 170) and ensure the debug panel updater is called:

```javascript
private handleObjectClick(gameObject: Phaser.GameObjects.GameObject): void {
  if (!debugState.isDebugMode) return; // Should not happen if interactivity is off, but safety check

  const stateChanged = this.inspectionHandler.handleObjectClick(gameObject);
  if (stateChanged) {
    // If inspection state changed, immediately update visuals to reflect it
    this.updateDebugVisuals();
    
    // Make sure to update the debug panel with new object info
    this.debugPanelUpdater.update();
  }
}
```

#### 2.2.2. Toggle Object Visibility in Debug Mode

Find the `handleDebugModeChanged` method and ensure the visualizationHandler properly sets object visibility:

```javascript
public handleDebugModeChanged(data: { isDebugMode: boolean }): void {
  const isDebugMode = data.isDebugMode;
  logger.debug(`GameSceneDebugHandler: Debug mode changed to ${isDebugMode ? 'ON' : 'OFF'}`);

  // Toggle visibility for UI and visuals
  this.htmlDebugPanel.setVisible(isDebugMode);
  this.visualizationHandler.setVisible(isDebugMode); // Handles labels and graphics
  
  // Ensure game objects remain visible even in debug mode (remove if this was toggling visibility)
  // this.visualizationHandler.toggleObjectVisibility(!isDebugMode);
  
  // Toggle interactivity (for cursor changes and potential future use)
  this.interactionHandler.setObjectInteractivity(isDebugMode);

  if (!isDebugMode) {
    // Additional cleanup when turning OFF
    this.inspectionHandler.stopInspecting();
  } else {
    // Refresh visuals when turning ON
    this.updateDebugVisuals();
  }
}
```

## 3. Additional Fixes

### 3.1. Make sure the toggleObjectVisibility method in DebugVisualizationHandler.ts is NOT called

The `toggleObjectVisibility` method in `DebugVisualizationHandler.ts` should not be called when debug mode is activated. If it is being called, it could be causing game objects to become invisible.

In the method `setVisible(visible: boolean)` of `DebugVisualizationHandler.ts`, make sure it doesn't call `toggleObjectVisibility` with the opposite value. This may be causing the objects to disappear when debug mode is enabled.

### 3.2. Fix the object inspection in `DebugInspectionHandler.ts`

Ensure the `handleObjectClick` method in `DebugInspectionHandler.ts` correctly extracts object information for all types of game objects. Check any type checking or property access that might be failing for certain object types.

## Implementation Process

1. Switch to Code mode for implementation
2. Make changes to `HtmlUIFactory.ts` first to fix UI positioning
3. Then fix the debug visualization issues in `DebugVisualizationHandler.ts`
4. Finally fix the integration issues in `GameSceneDebugHandler.ts`
5. Test each set of changes to verify they fix the issues

## Testing Guidelines

After implementing these changes, test the following:

1. **UI Element Placement**:
   - Check that weapon buttons are centered at the bottom of the screen
   - Verify pause indicator appears in the center when game is paused
   - Confirm stats are balanced with 2 on left (health, score) and 2 on right (wave, currency)

2. **Debug Mode**:
   - Activate debug mode and verify all game objects remain visible
   - Check that collision boundaries (red outlines) are visible
   - Click on different objects and verify they get highlighted
   - Confirm that object properties appear in the debug panel when selected

If any issues persist, additional investigation of the object inspection and debug visualization code may be needed.