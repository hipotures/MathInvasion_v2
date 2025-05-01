# Master Refactoring Plan for MathInvasion

## Overview

This document outlines the comprehensive refactoring plan for the MathInvasion project, focusing on splitting large files into smaller, more manageable components. The goal is to improve code maintainability, readability, and testability while preserving functionality.

## Files to Refactor

The following files have been identified as candidates for refactoring based on their size and complexity:

1. `GameSceneDebugHandler.ts` (578 lines)
2. `DebugObjectInspector.ts` (345 lines)
3. `GameScene.ts` (338 lines)
4. `ProjectileManager.ts` (326 lines)
5. `DebugPanelUpdater.ts` (313 lines)
6. `PlayerManager.ts` (294 lines)
7. `EnemyEntity.ts` (290 lines)
8. `EnemyManager.ts` (290 lines)
9. `HtmlDebugPanel.ts` (288 lines)

## Common Refactoring Patterns

Several common patterns emerge across these refactorings:

1. **Core Orchestrator Pattern**: Each large class is refactored into a core orchestrator class that delegates to specialized components.

2. **Single Responsibility Components**: Specialized components are created to handle specific responsibilities.

3. **Shared Types**: Type definitions are extracted into dedicated files to ensure consistency.

4. **Event Handling Delegation**: Event handling is often delegated to specialized handlers.

5. **State Management Separation**: State management is separated from business logic.

## Implementation Strategy

### Phase 1: Preparation
1. Create a directory structure for the new components
2. Create shared type definition files
3. Set up unit tests for existing functionality to ensure refactoring doesn't break anything

### Phase 2: Component Implementation
1. Implement the specialized components for each file
2. Start with the components that have the fewest dependencies
3. Write unit tests for each new component

### Phase 3: Core Class Refactoring
1. Refactor each core class to use the new components
2. Update imports and references
3. Ensure proper initialization and cleanup

### Phase 4: Integration and Testing
1. Run existing tests to ensure functionality is preserved
2. Fix any issues that arise
3. Update documentation

## Directory Structure

The refactoring will result in the following directory structure additions:

```
src/
├── core/
│   ├── managers/
│   │   ├── player/
│   │   ├── enemies/
│   │   ├── projectiles/
│   │   └── types/
│   └── utils/
│       ├── debug/
│       │   ├── collectors/
│       │   ├── formatters/
│       │   ├── inspectors/
│       │   ├── ui/
│       │   └── types/
├── phaser/
│   ├── entities/
│   │   └── enemies/
│   │       └── components/
│   ├── handlers/
│   │   └── debug/
│   │       └── handlers/
│   └── scenes/
│       └── components/
```

## Prioritization

The refactoring should be prioritized as follows:

1. Start with utility classes that have fewer dependencies (HtmlDebugPanel, DebugObjectInspector)
2. Move to manager classes (ProjectileManager, PlayerManager, EnemyManager)
3. Finally, refactor scene and entity classes (GameScene, EnemyEntity, GameSceneDebugHandler)

## Risks and Mitigations

### Risks
1. Breaking existing functionality
2. Introducing circular dependencies
3. Increasing complexity through over-abstraction

### Mitigations
1. Comprehensive test coverage before and after refactoring
2. Careful planning of dependencies
3. Regular code reviews to ensure appropriate abstraction levels

## Conclusion

This refactoring plan aims to significantly improve the codebase structure while maintaining functionality. By breaking down large files into smaller, focused components, we'll create a more maintainable and extensible codebase.