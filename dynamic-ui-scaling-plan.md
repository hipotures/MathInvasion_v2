# Dynamic UI Scaling Plan

Based on the feedback, we need to make the game board and UI elements dynamically scale based on the browser window size while maintaining proper aspect ratios. This plan outlines the necessary changes.

## 1. Add Aspect Ratio Configuration

### 1.1. Update Configuration File

We'll add aspect ratio settings to the configuration file. Let's look at the available config files:

- `config/difficulty.yml`
- `config/enemies.yml`
- `config/player.yml`
- `config/powerups.yml`
- `config/weapons.yml`

We'll add a new configuration file `config/display.yml` with settings for:
- Default aspect ratio (16:9)
- Supported aspect ratios (16:9, 18:9, 19:9, etc.)
- Base resolution for calculations
- UI scaling factors

```yaml
# Display and UI Configuration
aspect_ratio:
  default: "16:9"
  supported: ["16:9", "18:9", "19:9", "21:9"]

base_resolution:
  width: 1280
  height: 720  # For 16:9 aspect ratio

ui_scaling:
  enabled: true
  min_scale: 0.75
  max_scale: 1.5
```

## 2. Dynamic Canvas Sizing

### 2.1. Update Game Initialization

We need to modify the game initialization to dynamically set the canvas size based on the browser window dimensions:

1. Calculate the maximum possible canvas size while maintaining the configured aspect ratio
2. Add window resize event handler to adjust the canvas size when the browser window changes
3. Trigger UI repositioning when the canvas size changes

```typescript
// In game initialization code
function setupDynamicCanvas(config) {
  const aspectRatio = parseAspectRatio(config.aspect_ratio.default);
  
  // Function to calculate optimal game size
  function calculateGameSize() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Calculate maximum dimensions while maintaining aspect ratio
    let width, height;
    if (windowWidth / windowHeight > aspectRatio) {
      // Window is wider than needed - height is the limiting factor
      height = windowHeight;
      width = height * aspectRatio;
    } else {
      // Window is taller than needed - width is the limiting factor
      width = windowWidth;
      height = width / aspectRatio;
    }
    
    return { width, height };
  }
  
  // Set initial size
  const { width, height } = calculateGameSize();
  game.scale.resize(width, height);
  
  // Add resize listener
  window.addEventListener('resize', () => {
    const newSize = calculateGameSize();
    game.scale.resize(newSize.width, newSize.height);
    
    // Trigger UI repositioning
    eventBus.emit('CANVAS_RESIZED', { width: newSize.width, height: newSize.height });
  });
}
```

## 3. Responsive HtmlUIFactory

### 3.1. Update Element Positioning

Modify the HtmlUIFactory to position elements relative to the canvas size:

1. Add a resize handler that updates element positions when the canvas changes
2. Convert fixed pixel positions to relative positions (percentages or proportions)
3. Update the positionElement method to handle responsive positioning

```typescript
// In HtmlUIFactory.ts

// Add a method to handle canvas resizing
public handleCanvasResize(): void {
  // Recalculate all element positions based on new canvas size
  if (this.uiElementsMap.size > 0) {
    this.repositionAllElements();
  }
}

// Update createAllElements to use relative positioning
public createAllElements(): { elements: Map<string, HTMLDivElement>, cooldownBars: Map<string, CooldownBarData> } {
  // ...existing code...
  
  const canvasWidth = this.canvas.width;
  const canvasHeight = this.canvas.height;
  
  // Define element configurations using relative positions
  const elementConfigs: UIElementConfig[] = [
    // Top Left
    { id: 'health', text: 'Health: 100', relativeX: 0.02, relativeY: 0.03, color: '#00ff00' },
    { id: 'score', text: 'Score: 0', relativeX: 0.02, relativeY: 0.07, color: '#ffffff' },
    // Top Right
    { id: 'wave', text: 'Wave: 1', relativeX: 0.02, relativeY: 0.03, color: '#ffffff', align: 'right' },
    { id: 'currency', text: 'Currency: 0', relativeX: 0.02, relativeY: 0.07, color: '#ffff00', align: 'right' },
    // Bottom Center (Weapon Info)
    { id: 'weaponStatus', text: 'Weapon: Bullet Lvl: 1', relativeX: 0.5, relativeY: 0.89, color: '#ffffff', align: 'center' },
    { id: 'weaponUpgradeCost', text: 'Upgrade Cost: 10', relativeX: 0.5, relativeY: 0.93, color: '#ffff00', align: 'center' },
    // Bottom Center (Weapon Buttons)
    { id: 'weaponButton1', text: '1: Bullet', relativeX: 0.4, relativeY: 0.93, color: '#dddddd', bgColor: '#555555' },
    { id: 'weaponButton2', text: '2: Laser', relativeX: 0.5, relativeY: 0.93, color: '#dddddd', bgColor: '#555555' },
    { id: 'weaponButton3', text: '3: Slow', relativeX: 0.6, relativeY: 0.93, color: '#dddddd', bgColor: '#555555' },
    // Center (Pause Indicator)
    { id: 'pauseIndicator', text: 'PAUSED', relativeX: 0.5, relativeY: 0.5, color: '#ff0000', align: 'center', bgColor: 'rgba(0,0,0,0.7)' },
  ];
  
  // Create elements based on configs
  elementConfigs.forEach(config => {
    // Convert relative positions to absolute
    const absoluteX = config.relativeX * canvasWidth;
    const absoluteY = config.relativeY * canvasHeight;
    
    const element = this.createUIElement({
      ...config,
      x: absoluteX,
      y: absoluteY
    });
    
    this.uiElementsMap.set(config.id, element);
  });
  
  // Create Cooldown Bars with relative positioning
  this.createCooldownBar('cooldownBar1', 0.4 * canvasWidth, 0.97 * canvasHeight, 0.08 * canvasWidth, '#ff0000');
  this.createCooldownBar('cooldownBar2', 0.5 * canvasWidth, 0.97 * canvasHeight, 0.08 * canvasWidth, '#00ffff');
  this.createCooldownBar('cooldownBar3', 0.6 * canvasWidth, 0.97 * canvasHeight, 0.08 * canvasWidth, 'rgba(255, 215, 0, 0.7)');
  
  return { elements: this.uiElementsMap, cooldownBars: this.cooldownBarsMap };
}
```

### 3.2. Update the UIElementConfig Interface

Update the UIElementConfig interface to support relative positioning:

```typescript
// In HtmlUI.types.ts
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
```

## 4. HtmlUI Event Handling

### 4.1. Add Resize Event Listener

Update the HtmlUI class to listen for canvas resize events:

```typescript
// In HtmlUI.ts

constructor() {
  // ...existing code...
  
  // Register for canvas resize events
  eventBus.on('CANVAS_RESIZED', this.handleCanvasResized.bind(this));
}

private handleCanvasResized(data: { width: number, height: number }): void {
  this.htmlUIFactory.handleCanvasResize();
}

public destroy(): void {
  // ...existing code...
  
  // Unregister event listeners
  eventBus.off('CANVAS_RESIZED', this.handleCanvasResized.bind(this));
}
```

## 5. Debug Visualization Updates

### 5.1. Update Debug Visualization for Dynamic Canvas

Ensure the debug visualization properly scales with the canvas:

1. Modify the drawing calculations to account for canvas size
2. Update label positioning to maintain readability at different scales

```typescript
// In GameSceneDebugVisualization.ts

// Add method to handle canvas resize
public handleCanvasResize(): void {
  // Adjust physics debug graphics if needed
  if (this.physicsDebugGraphics) {
    // The physics world should automatically update with the game scale
    // Just redraw everything to be safe
    this.physicsDebugGraphics.clear();
  }
  
  // Redraw custom debug graphics
  this.customDebugGraphics.clear();
  
  // Update label positions
  this.htmlDebugLabels.repositionAllLabels();
}
```

## 6. Implementation Sequence

1. Add aspect ratio configuration (create `config/display.yml`)
2. Update game initialization with dynamic canvas sizing
3. Enhance HtmlUIFactory for responsive UI elements
4. Update HtmlUI.ts with resize event handling
5. Make debug visualization responsive to canvas size changes
6. Test with different browser window sizes and aspect ratios

## 7. Testing

1. Test with different browser window sizes and aspect ratios
2. Verify UI element positioning at various window sizes
3. Test dynamic resizing by changing the browser window size during gameplay
4. Confirm debug visualization properly adapts to canvas size changes