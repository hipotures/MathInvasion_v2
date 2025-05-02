# Debug Powerup Menu Implementation Plan

## Overview
Based on the feedback, we'll create a dropdown menu at the top of the screen that appears in debug mode, allowing the user to spawn specific powerups. This approach keeps the 'P' key functionality for pausing.

## Implementation Steps

### 1. Revert Changes to InputManager.ts
- Restore original P key handler for pausing the game
- Remove the spawnRandomPowerupForDebug method

### 2. Create a New PowerupDebugMenu Component
Create a new file: `src/core/utils/debug/PowerupDebugMenu.ts`

```typescript
import { EventBus } from '../../events/EventBus';
import * as Events from '../../constants/events';
import { PowerupConfig } from '../../config/schemas/powerupSchema';
import logger from '../Logger';
import debugState from '../DebugState';

export class PowerupDebugMenu {
  private container: HTMLDivElement;
  private dropdownButton: HTMLDivElement;
  private dropdownContent: HTMLDivElement;
  private eventBus: EventBus;
  private powerupsConfig: PowerupConfig[];
  private isVisible: boolean = false;
  
  constructor(eventBus: EventBus, powerupsConfig: PowerupConfig[]) {
    this.eventBus = eventBus;
    this.powerupsConfig = powerupsConfig;
    this.setupUI();
    
    // Listen for debug mode changes
    this.eventBus.on(Events.DEBUG_MODE_CHANGED, this.handleDebugModeChanged.bind(this));
  }
  
  private setupUI() {
    // Create container
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.top = '10px';
    this.container.style.left = '50%';
    this.container.style.transform = 'translateX(-50%)';
    this.container.style.zIndex = '1000';
    this.container.style.display = 'none';
    
    // Create dropdown button
    this.dropdownButton = document.createElement('div');
    this.dropdownButton.textContent = 'Powerups ▼';
    this.dropdownButton.style.backgroundColor = '#444';
    this.dropdownButton.style.color = '#fff';
    this.dropdownButton.style.padding = '8px 12px';
    this.dropdownButton.style.cursor = 'pointer';
    this.dropdownButton.style.borderRadius = '4px';
    
    // Create dropdown content
    this.dropdownContent = document.createElement('div');
    this.dropdownContent.style.display = 'none';
    this.dropdownContent.style.position = 'absolute';
    this.dropdownContent.style.backgroundColor = '#333';
    this.dropdownContent.style.minWidth = '160px';
    this.dropdownContent.style.boxShadow = '0px 8px 16px 0px rgba(0,0,0,0.2)';
    this.dropdownContent.style.zIndex = '1';
    
    // Add powerup options
    this.powerupsConfig.forEach(powerup => {
      const option = document.createElement('div');
      option.textContent = powerup.name;
      option.style.padding = '12px 16px';
      option.style.color = '#fff';
      option.style.cursor = 'pointer';
      option.addEventListener('click', () => this.spawnPowerup(powerup.id));
      option.addEventListener('mouseenter', () => {
        option.style.backgroundColor = '#555';
      });
      option.addEventListener('mouseleave', () => {
        option.style.backgroundColor = '';
      });
      this.dropdownContent.appendChild(option);
    });
    
    // Add event listeners
    this.dropdownButton.addEventListener('click', () => {
      this.toggleDropdown();
    });
    
    // Assemble UI
    this.container.appendChild(this.dropdownButton);
    this.container.appendChild(this.dropdownContent);
    document.body.appendChild(this.container);
  }
  
  private toggleDropdown() {
    const isOpen = this.dropdownContent.style.display === 'block';
    this.dropdownContent.style.display = isOpen ? 'none' : 'block';
  }
  
  private spawnPowerup(powerupId: string) {
    // Generate position in center of screen
    const canvas = document.querySelector('canvas');
    let x = 400, y = 300; // Default fallback
    
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      x = rect.width / 2;
      y = rect.height / 2;
    }
    
    logger.debug(`Debug: Spawning powerup ${powerupId}`);
    
    // Emit event to request powerup spawn
    this.eventBus.emit(Events.REQUEST_SPAWN_POWERUP, {
      x,
      y,
      enemyId: 'debug-spawn',
      powerupId // Specify which powerup to spawn
    });
    
    // Close dropdown after selection
    this.dropdownContent.style.display = 'none';
  }
  
  private handleDebugModeChanged(data: { isDebugMode: boolean }): void {
    this.setVisible(data.isDebugMode);
  }
  
  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.container.style.display = visible ? 'block' : 'none';
  }
  
  public destroy(): void {
    this.eventBus.off(Events.DEBUG_MODE_CHANGED, this.handleDebugModeChanged.bind(this));
    
    if (document.body.contains(this.container)) {
      document.body.removeChild(this.container);
    }
  }
}
```

### 3. Update RequestSpawnPowerupData Interface
Modify `src/core/managers/PowerupManager.ts` to add an optional powerupId property:

```typescript
export interface RequestSpawnPowerupData {
  x: number;
  y: number;
  enemyId: string; // ID of the enemy that dropped it (for potential future logic)
  powerupId?: string; // Optional ID to specify which powerup to spawn
}
```

### 4. Update PowerupManager's handleRequestSpawnPowerup Method
Modify the method to handle specific powerup requests:

```typescript
private handleRequestSpawnPowerup(data: RequestSpawnPowerupData): void {
  if (!this.powerupsConfig || this.powerupsConfig.length === 0) {
    this.logger.warn('Received REQUEST_SPAWN_POWERUP but no powerup configurations are loaded.');
    return;
  }

  let selectedPowerupConfig: PowerupConfig | undefined;
  
  // If a specific powerupId is provided, use that one
  if (data.powerupId) {
    selectedPowerupConfig = this.powerupsConfig.find(p => p.id === data.powerupId);
    if (!selectedPowerupConfig) {
      this.logger.warn(`Specified powerupId ${data.powerupId} not found. Selecting random powerup.`);
    }
  }
  
  // If no specific powerup was found, select a random one
  if (!selectedPowerupConfig) {
    const randomIndex = Math.floor(Math.random() * this.powerupsConfig.length);
    selectedPowerupConfig = this.powerupsConfig[randomIndex];
  }

  // Create instance and emit event as before
  const instanceId = this.nextInstanceId++;
  const spawnedInstance: SpawnedPowerupInstance = {
    instanceId,
    config: selectedPowerupConfig,
    x: data.x,
    y: data.y,
    creationTime: Date.now(),
  };
  this.spawnedPowerups.set(instanceId, spawnedInstance);

  const eventData: PowerupSpawnedData = {
    instanceId,
    configId: selectedPowerupConfig.id,
    x: data.x,
    y: data.y,
    visual: selectedPowerupConfig.visual,
  };
  this.eventBus.emit(Events.POWERUP_SPAWNED, eventData);
  this.logger.debug(
    `Powerup spawned: ${selectedPowerupConfig.name} (Instance ID: ${instanceId}) at (${data.x}, ${data.y})`
  );
}
```

### 5. Add Initialization Logic
Add the PowerupDebugMenu initialization to the appropriate game initialization file:

```typescript
// In GameSceneManagerInitializer.ts or similar
import { PowerupDebugMenu } from '../utils/debug/PowerupDebugMenu';

// Add as a class property
private powerupDebugMenu: PowerupDebugMenu;

// During initialization
this.powerupDebugMenu = new PowerupDebugMenu(
  this.eventBus,
  this.powerupsConfig
);

// Initial visibility based on debug mode
this.powerupDebugMenu.setVisible(debugState.isDebugMode);
```

## Testing Plan

1. Restore the original InputManager.ts (revert P key functionality)
2. Implement the PowerupDebugMenu class
3. Update the PowerupManager to support specific powerup spawning
4. Enable debug mode using ';' key
5. Verify the Powerups dropdown appears at the top of the screen
6. Click on a powerup from the dropdown menu
7. Verify the selected powerup appears in the game
8. Verify P key still toggles pause as expected