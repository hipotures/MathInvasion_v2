# Bug Analysis and Fix Plan: Debug Panel Error for Collected/Out-of-Bounds Powerups

## Problem Description

When a powerup being inspected in debug mode is either:
1. Collected by the player, or
2. Goes out of bounds (off-screen)

The debug panel displays an error message:
```
DEBUG PANEL
[ID: unknown]
[Type: unknown]
[Error: Could not identify object type/ID (Race condition?)]
```

And multiple warnings appear in the logs:
```
Logger.ts:15 [WARN] Could not identify the inspected object type or ID. 
ArcadeSprite2 {_events: Events, _eventsCount: 1, scene: undefined, displayList: null, type: 'Sprite', …}
```

## Root Cause Analysis

After examining the code, I've identified the following issues:

1. **Missing Event Listeners**: The `DebugInspectionHandler` is not listening for `POWERUP_COLLECTED` or `POWERUP_OUT_OF_BOUNDS` events, which are triggered when powerups are collected or go off-screen. It only listens for `POWERUP_EXPIRED` (which is triggered when a powerup effect times out, not when the powerup item is collected).

2. **Data Structure Mismatch**: In the `POWERUP_EXPIRED` event handler, there's a mismatch between what the handler expects and what's actually sent:
   - Handler expects: `{ instanceId: number }`
   - PowerupManager sends: `{ configId: string }`

3. **Object Reference Issue**: When a powerup is collected or goes out of bounds:
   - The sprite is destroyed and removed from the `powerupSprites` map
   - The powerup data is deleted from `PowerupManager.spawnedPowerups` map
   - But the debug panel still tries to inspect the object because it wasn't informed about the destruction

## Detailed Fix Plan

### 1. Update DebugInspectionHandler.ts

1. Add event listeners for `POWERUP_COLLECTED` and `POWERUP_OUT_OF_BOUNDS` events:
   ```typescript
   // Add in constructor:
   eventBus.on(Events.POWERUP_COLLECTED, (eventData: { instanceId: number }) =>
     this.handleObjectDestroyed(String(eventData.instanceId), 'powerup'));
   
   eventBus.on(Events.POWERUP_OUT_OF_BOUNDS, (eventData: { instanceId: number }) =>
     this.handleObjectDestroyed(String(eventData.instanceId), 'powerup'));
   ```

2. Fix the `POWERUP_EXPIRED` event handler to match the data structure sent by PowerupManager:
   ```typescript
   // Change from:
   eventBus.on(Events.POWERUP_EXPIRED, (eventData: { instanceId: number }) => 
     this.handleObjectDestroyed(String(eventData.instanceId), 'powerup'));
   
   // To:
   eventBus.on(Events.POWERUP_EXPIRED, (eventData: { configId: string }) => {
     // If we're inspecting a powerup, stop inspection when any powerup effect expires
     // This is a fallback and may not be exact, but better than showing errors
     if (this.inspectedObject.type === 'powerup') {
       this.stopInspecting();
     }
   });
   ```

3. Update the destroy method to properly remove these event listeners:
   ```typescript
   // Add in destroy():
   eventBus.off(Events.POWERUP_COLLECTED, /* same handler */);
   eventBus.off(Events.POWERUP_OUT_OF_BOUNDS, /* same handler */);
   ```

### 2. Update DebugObjectInspector.ts

In `getObjectDetails` method, improve handling of destroyed powerups:

```typescript
// In the powerup check section:
if (isPowerup && powerupInstanceId !== undefined) {
    // Check if the sprite is being destroyed
    if (!powerupSprite.scene) {
        return {
            ID: String(powerupInstanceId),
            Type: 'powerup',
            Status: 'Destroyed/Collected',
            Message: 'This powerup no longer exists in the game world'
        };
    }
    // Normal powerup processing...
}
```

## Implementation Strategy

To fix this bug, we need to:

1. Add event listeners for `POWERUP_COLLECTED` and `POWERUP_OUT_OF_BOUNDS` in `DebugInspectionHandler`
2. Fix the `POWERUP_EXPIRED` handler to match the actual data structure
3. Improve error handling in `DebugObjectInspector` for destroyed powerups

This will ensure that when powerups are collected or go off-screen, the debug panel will stop inspecting them properly instead of showing error messages.