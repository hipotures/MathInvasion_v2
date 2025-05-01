# DebugPanelUpdater Refactoring Plan

## Current Issues
- File is 313 lines long
- Handles multiple responsibilities:
  - Data collection from multiple managers
  - Data formatting for different entity types
  - HTML panel updates
  - Active object tracking

## Proposed Split

### 1. `DebugPanelUpdater.ts` (Core class)
- Main class that orchestrates debug panel updates
- Coordinates data collection from specialized collectors
- Updates the HTML debug panel
- ~80 lines

### 2. `debug/collectors/PlayerDataCollector.ts`
- Collects debug data specific to the player
- Extracts relevant information from PlayerManager
- ~50 lines

### 3. `debug/collectors/EnemyDataCollector.ts`
- Collects debug data for enemy entities
- Extracts relevant information from EnemyManager and sprites
- ~50 lines

### 4. `debug/collectors/ProjectileDataCollector.ts`
- Collects debug data for projectile entities
- Extracts relevant information from ProjectileManager and shapes
- ~50 lines

### 5. `debug/collectors/PowerupDataCollector.ts`
- Collects debug data for powerup entities
- Extracts relevant information from PowerupManager and sprites
- ~50 lines

### 6. `debug/collectors/GameStateDataCollector.ts`
- Collects general game state information
- Extracts data from various managers (economy, weapon, etc.)
- ~50 lines

### 7. `debug/formatters/DebugPanelFormatter.ts`
- Formats collected data for display in the debug panel
- Handles data structure organization
- ~50 lines

### 8. `debug/types/DebugPanelTypes.ts`
- Shared type definitions for debug panel data
- ~30 lines

## Implementation Strategy
1. Create the shared types file first
2. Implement each specialized data collector
3. Create the formatter class
4. Update the main DebugPanelUpdater to use the new components
5. Update imports and references