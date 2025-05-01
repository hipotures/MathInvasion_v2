# EnemyEntity Refactoring Plan

## Current Issues
- File is 290 lines long
- Handles multiple responsibilities:
  - Enemy entity representation
  - Movement patterns
  - Shooting logic
  - Visual effects
  - Game pause handling

## Proposed Split

### 1. `EnemyEntity.ts` (Core class)
- Main entity class that represents an enemy in the game
- Handles basic initialization and properties
- Delegates to specialized components
- ~100 lines

### 2. `enemies/components/EnemyMovementComponent.ts`
- Handles different movement patterns
- Implements movement logic for each pattern type
- Updates enemy position and velocity
- ~100 lines

### 3. `enemies/components/EnemyWeaponComponent.ts`
- Handles enemy shooting logic
- Manages cooldown timers
- Triggers fire events
- ~50 lines

### 4. `enemies/components/EnemyVisualComponent.ts`
- Handles visual effects for the enemy
- Manages damage visualization
- Handles destruction effects
- ~50 lines

### 5. `enemies/utils/EnemyPauseManager.ts`
- Static utility to handle game pause state
- Manages pause event listeners
- ~30 lines

### 6. `enemies/types/EnemyTypes.ts`
- Shared type definitions for enemy entities
- ~30 lines

## Implementation Strategy
1. Create the shared types file first
2. Extract the static pause handling to a utility class
3. Implement each specialized component
4. Update the main EnemyEntity to use the new components
5. Ensure proper initialization and cleanup in each component
6. Update imports and references

## Notes
- Consider using a component-based architecture for enemies
- The movement patterns could be further split into strategy classes if they grow in complexity