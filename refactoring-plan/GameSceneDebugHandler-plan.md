# GameSceneDebugHandler Refactoring Plan

## Current Issues
- File is 578 lines long
- Handles multiple responsibilities:
  - Debug visualization (drawing rectangles, labels)
  - Object interactivity
  - Inspection state management
  - Event handling

## Proposed Split

### 1. `GameSceneDebugHandler.ts` (Core class)
- Main class that orchestrates debug functionality
- Holds references to game objects and managers
- Initializes and manages the specialized handlers
- Handles high-level event subscriptions
- ~150-200 lines

### 2. `debug/handlers/DebugVisualizationHandler.ts`
- Responsible for drawing debug rectangles and shapes
- Manages HTML debug labels
- Updates visual elements based on debug state
- ~150 lines

### 3. `debug/handlers/DebugInteractionHandler.ts`
- Manages object interactivity (click handlers)
- Sets up interactive areas for game objects
- Handles scene clicks
- ~150 lines

### 4. `debug/handlers/DebugInspectionHandler.ts`
- Manages the inspection state
- Handles object inspection requests
- Coordinates with DebugObjectInspector
- ~100 lines

### 5. `debug/types/DebugTypes.ts`
- Shared type definitions for debug functionality
- ~30 lines

## Implementation Strategy
1. Create the new files with appropriate interfaces
2. Move related methods to each new handler class
3. Update the main GameSceneDebugHandler to use the new handlers
4. Update imports and references