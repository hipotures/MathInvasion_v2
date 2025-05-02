# Debug Powerup Implementation Plan

## Overview
Add a debug feature to spawn random powerups when the 'P' key is pressed while in debug mode.

## Implementation Details

### Modify `src/core/managers/InputManager.ts`

1. Add import for debugState:
```typescript
import debugState from '../utils/DebugState';
```

2. Add a new method to handle spawning random powerups:
```typescript
private spawnRandomPowerupForDebug(): void {
  // Generate a random position on screen
  const x = Math.random() * 800; // Approximate game width
  const y = Math.random() * 600; // Approximate game height
  
  logger.debug('Debug: Spawning random powerup');
  
  // Emit event to request powerup spawn
  this.eventBus.emit(Events.REQUEST_SPAWN_POWERUP, {
    x,
    y,
    enemyId: 'debug-spawn' // Mark as debug-spawned
  });
}
```

3. Update the 'P' key handler in `handleKeyDown` method:
```typescript
case 'p':
case 'P':
  if (debugState.isDebugMode) {
    logger.debug('Debug: P key pressed - spawning random powerup');
    this.spawnRandomPowerupForDebug();
  } else {
    logger.debug('Pause Toggle Key P pressed');
    this.eventBus.emit(Events.TOGGLE_PAUSE);
  }
  break;
```

## Testing
1. Enable debug mode by pressing ';'
2. Press 'P' to spawn a random powerup
3. Verify that a powerup appears on screen
4. Disable debug mode by pressing ';' again
5. Press 'P' to verify it toggles pause as before

## Expected Behavior
- In regular mode: 'P' key continues to toggle pause/unpause
- In debug mode: 'P' key spawns a random powerup instead of toggling pause