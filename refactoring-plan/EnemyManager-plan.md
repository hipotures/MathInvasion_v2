# EnemyManager Refactoring Plan

## Current Issues
- File is 290 lines long
- Handles multiple responsibilities:
  - Enemy instance management
  - Enemy spawning
  - Damage and destruction
  - Configuration loading
  - Wave management (partially delegated)

## Proposed Split

### 1. `EnemyManager.ts` (Core class)
- Main manager class that orchestrates enemy functionality
- Maintains the collection of active enemies
- Delegates to specialized handlers
- Handles high-level event subscriptions
- ~100 lines

### 2. `enemies/EnemyConfigLoader.ts`
- Handles loading and caching enemy configurations
- Provides access to enemy config data
- ~50 lines

### 3. `enemies/EnemySpawner.ts`
- Handles enemy spawning logic
- Creates enemy instances with appropriate properties
- ~50 lines

### 4. `enemies/EnemyDamageHandler.ts`
- Processes damage to enemies
- Handles health updates and destruction
- ~70 lines

### 5. `enemies/EnemyStateManager.ts`
- Provides access to enemy state
- Handles state queries (health, creation time, etc.)
- ~50 lines

### 6. `enemies/types/EnemyManagerTypes.ts`
- Shared type definitions for enemy management
- Includes event payload interfaces
- ~30 lines

## Implementation Strategy
1. Create the shared types file first
2. Implement each specialized handler
3. Update the main EnemyManager to use the new components
4. Ensure proper initialization and cleanup in each component
5. Update imports and references

## Notes
- The EnemyWaveHandler is already extracted, which is good
- Consider further separating reward/score handling if it grows in complexity