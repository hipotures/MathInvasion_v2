# Logical Division Plan for MathInvasion Game Files

After analyzing the provided files, I'm presenting a comprehensive plan for logically dividing them into more focused, maintainable components. This division will help improve code organization, readability, and reduce file sizes where needed.

## 1. src/core/managers/WeaponManager.ts

This file can be divided into four parts:

### WeaponManager.types.ts
- Move all interfaces (WeaponRuntimeState, AllWeaponStatesUpdateData, RequestFireWeaponData)
- Export types for use by other components
- Define weapon state and event data structures

### WeaponManager.state.ts
- Functions for state calculation and management:
  - `calculateWeaponStateForLevel`
  - `initializeAllWeaponStates`
  - State initialization logic

### WeaponManager.actions.ts
- Weapon action-related functions:
  - `attemptFire`
  - `emitFireRequest`
  - `handleFireStart/End`
  - `handleWeaponSwitch`
  - `handleWeaponUpgradeRequest`

### WeaponManager.ts (core)
- Main class with constructor, update cycle, and coordination
- Imports and combines functionality from the other modules
- Event subscription and cleanup
- Core update logic

## 2. src/phaser/handlers/GameSceneDebugHandler.ts

This file can be divided into three components:

### GameSceneDebugVisualization.ts
- Functions related to debug visualization:
  - `updateDebugVisuals`
  - Graphics and visual representation of debug state
  - Debug panel toggling

### GameSceneDebugInteraction.ts
- Object inspection and interaction functionality:
  - `handleObjectClick`
  - `handleDebugHitTestRequest`
  - Interaction state management

### GameSceneDebugHandler.ts (core)
- Orchestration and initialization
- Constructor and event subscription management
- Integration of visualization and interaction components
- Debug mode toggling and coordination

## 3. src/core/utils/HtmlUI.ts

This file can be divided into three parts:

### HtmlUIFactory.ts
- Element creation logic:
  - `createUIElement`
  - Layout and styling calculations
  - Factory pattern implementation

### HtmlUIComponents.ts
- Component-specific update methods:
  - `updateCurrency`, `updateHealth`, `updateScore`
  - `updateWeaponStatus`, `updateWeaponButtons`
  - `updateWeaponCooldown`
  - `showPauseIndicator`, `hidePauseIndicator`

### HtmlUI.ts (core)
- Main orchestration class
- Constructor and initialization
- Component registration and coordination
- Lifecycle management (resize handling, cleanup)

## 4. src/phaser/scenes/GameScene.ts

This file is already well-structured with components, but can be further divided:

### GameSceneInitialization.ts
- Initialization logic:
  - `createHandlers`
  - `createComponents`
  - `setupComponents`
  - Asset loading

### GameSceneUpdate.ts
- Update cycle functionality:
  - Main update method
  - `triggerManualPowerupOverlap`
  - `checkPowerupsOutOfBounds`
  - Time-based effects

### GameScene.ts (core)
- Main scene class
- Component orchestration
- Scene lifecycle management
- Integration of initialization and update logic

## 5. src/phaser/entities/EnemyEntity.ts

This file can be divided into three parts:

### EnemyEntity.types.ts
- Types and interfaces:
  - `ApplySlowEffectData`
  - Enemy configuration types
  - Event data structures

### EnemyEntity.behavior.ts
- Enemy behavior logic:
  - `handleMovement`
  - `handleShooting`
  - `checkOffScreen`
  - Movement patterns
  - AI behavior

### EnemyEntity.ts (core)
- Main entity class
- State management
- Event handling
- Effect system (slow, damage)
- Constructor and initialization

## 6. src/phaser/handlers/GameSceneCollisionHandler.ts

This file can be divided into four parts:

### CollisionTypes.ts
- Collision-related interfaces:
  - `PlayerHitEnemyData`
  - `PlayerHitProjectileData`
  - `ProjectileHitEnemyData`

### PlayerCollisionHandlers.ts
- Player-specific collision handlers:
  - `handlePlayerEnemyCollision`
  - `handlePlayerProjectileCollision`
  - `handlePlayerPowerupCollision`

### ProjectileCollisionHandlers.ts
- Projectile-specific collision handlers:
  - `handleProjectileEnemyCollision`

### GameSceneCollisionHandler.ts (core)
- Main handler class
- Collision registration
- Coordination of specific handlers
- Initialization and cleanup

## 7. src/core/managers/PlayerManager.ts

This file can be divided into three parts:

### PlayerManager.types.ts
- Player-related types and interfaces:
  - `PlayerHitEnemyData`
  - `PlayerHitProjectileData`
  - Player state interfaces

### PlayerManager.actions.ts
- Player action handlers:
  - Movement handlers (`handleMoveLeftStart`, etc.)
  - Damage handlers (`handlePlayerHitEnemy`, `handlePlayerHitProjectile`)
  - Invulnerability management

### PlayerManager.ts (core)
- Main manager class
- State management and updates
- Event subscription
- Update cycle
- State emission

## Implementation Approach

For each file:
1. Extract the shared types and interfaces to the `.types.ts` files
2. Move related functionality to their specialized files
3. Ensure proper imports/exports between files
4. Update the core files to use the extracted components
5. Update imports in other files that depend on these components

This division plan focuses on separating concerns, improving code maintainability, and providing better organization without changing the overall functionality of the game.