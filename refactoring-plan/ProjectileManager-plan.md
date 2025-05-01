# ProjectileManager Refactoring Plan

## Current Issues
- File is 326 lines long
- Handles multiple responsibilities:
  - Projectile creation and management
  - Projectile movement and physics
  - Projectile collision detection
  - Projectile visual properties
  - Explosion handling

## Proposed Split

### 1. `ProjectileManager.ts` (Core class)
- Main manager class that orchestrates projectile functionality
- Maintains the collection of active projectiles
- Handles high-level event subscriptions
- Delegates to specialized handlers
- ~100 lines

### 2. `projectiles/ProjectileFactory.ts`
- Responsible for creating new projectiles
- Determines visual properties based on config
- Creates projectile instances with appropriate properties
- ~70 lines

### 3. `projectiles/ProjectilePhysicsHandler.ts`
- Handles projectile movement and physics updates
- Manages world bounds checking
- Updates projectile positions
- ~60 lines

### 4. `projectiles/ProjectileExplosionHandler.ts`
- Handles explosion logic for explosive projectiles
- Manages explosion timers
- Triggers explosion events
- ~50 lines

### 5. `projectiles/ProjectileStateManager.ts`
- Provides access to projectile state
- Handles state queries (damage, owner, etc.)
- ~50 lines

### 6. `projectiles/types/ProjectileTypes.ts`
- Shared type definitions for projectiles
- Includes event payload interfaces
- ~50 lines

## Implementation Strategy
1. Create the shared types file first
2. Implement each specialized handler
3. Update the main ProjectileManager to use the new components
4. Ensure proper initialization and cleanup in each component
5. Update imports and references