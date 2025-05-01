# GameScene Refactoring Plan

## Current Issues
- File is 338 lines long
- Handles multiple responsibilities:
  - Scene initialization
  - Manager initialization
  - Game object creation
  - Event handling
  - Collision setup
  - Enemy spawning

## Proposed Split

### 1. `GameScene.ts` (Core class)
- Main scene class with core lifecycle methods (preload, create, update)
- Orchestrates the specialized scene components
- Manages high-level game state
- ~100 lines

### 2. `scenes/components/GameSceneInitializer.ts`
- Handles initialization of game objects and managers
- Creates player, groups, and other core game elements
- ~80 lines

### 3. `scenes/components/GameSceneEventManager.ts`
- Sets up and manages event listeners for the scene
- Handles event binding and cleanup
- ~50 lines

### 4. `scenes/components/GameSceneCollisionManager.ts`
- Sets up collision detection between game objects
- Delegates to the collision handler
- ~50 lines

### 5. `scenes/components/GameSceneSpawner.ts`
- Handles enemy spawning logic
- Manages spawn timers and patterns
- ~50 lines

### 6. `scenes/types/GameSceneTypes.ts`
- Shared type definitions for the game scene
- ~30 lines

## Implementation Strategy
1. Create the shared types file first
2. Implement each component with clear interfaces
3. Update the main GameScene to use the new components
4. Ensure proper initialization and cleanup in each component
5. Update imports and references