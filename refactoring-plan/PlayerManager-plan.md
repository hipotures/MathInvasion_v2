# PlayerManager Refactoring Plan

## Current Issues
- File is 294 lines long
- Handles multiple responsibilities:
  - Player state management
  - Movement handling
  - Damage and invulnerability
  - Event handling
  - State updates

## Proposed Split

### 1. `PlayerManager.ts` (Core class)
- Main manager class that orchestrates player functionality
- Maintains core player state
- Delegates to specialized handlers
- Handles high-level event subscriptions
- ~100 lines

### 2. `player/PlayerMovementHandler.ts`
- Handles player movement logic
- Processes movement input events
- Updates velocity based on input state
- ~50 lines

### 3. `player/PlayerDamageHandler.ts`
- Handles player damage and health
- Manages invulnerability state
- Processes hit events from enemies and projectiles
- ~70 lines

### 4. `player/PlayerStateManager.ts`
- Provides access to player state
- Emits state update events
- Handles state queries
- ~50 lines

### 5. `player/types/PlayerTypes.ts`
- Shared type definitions for player functionality
- Includes event payload interfaces
- ~30 lines

## Implementation Strategy
1. Create the shared types file first
2. Implement each specialized handler
3. Update the main PlayerManager to use the new components
4. Ensure proper initialization and cleanup in each component
5. Update imports and references

## Notes
- The PlayerPowerupHandler is already extracted, which is good
- Consider further extracting player death handling if it grows in complexity