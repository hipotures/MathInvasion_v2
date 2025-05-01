# DebugObjectInspector Refactoring Plan

## Current Issues
- File is 345 lines long
- Handles multiple responsibilities:
  - Object identification
  - Data collection for different entity types
  - Data formatting and HTML generation

## Proposed Split

### 1. `DebugObjectInspector.ts` (Core class)
- Main class that orchestrates inspection functionality
- Identifies object types and delegates to specialized inspectors
- Coordinates data collection and formatting
- ~100 lines

### 2. `debug/inspectors/PlayerInspector.ts`
- Specialized inspector for player entities
- Extracts player-specific data
- ~50 lines

### 3. `debug/inspectors/EnemyInspector.ts`
- Specialized inspector for enemy entities
- Extracts enemy-specific data
- ~50 lines

### 4. `debug/inspectors/ProjectileInspector.ts`
- Specialized inspector for projectile entities
- Extracts projectile-specific data
- ~50 lines

### 5. `debug/inspectors/PowerupInspector.ts`
- Specialized inspector for powerup entities
- Extracts powerup-specific data
- ~50 lines

### 6. `debug/formatters/DebugDataFormatter.ts`
- Handles formatting of inspection data to HTML
- Provides consistent styling and layout
- ~80 lines

### 7. `debug/types/InspectionTypes.ts`
- Shared type definitions for inspection functionality
- ~30 lines

## Implementation Strategy
1. Create the shared types file first
2. Implement the specialized inspectors
3. Create the formatter class
4. Update the main DebugObjectInspector to use the new components
5. Update imports and references