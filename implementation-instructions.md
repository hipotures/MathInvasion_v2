# Implementation Instructions

This document provides step-by-step instructions for implementing the UI and debug functionality fixes outlined in `ui-debug-repair-implementation.md`.

## Step 1: Switch to Code Mode

Since Architect mode is restricted to editing only markdown files, you'll need to switch to Code mode to implement the actual code changes:

1. Use the mode switcher in Cline to switch from Architect mode to Code mode
2. In Code mode, you'll have full access to edit all code files in the project

## Step 2: Implementation Sequence

Follow this sequence to implement the changes:

1. First, fix the UI element positioning in `src/core/utils/factory/HtmlUIFactory.ts`
2. Then fix the debug visualization in `src/phaser/handlers/debug/handlers/DebugVisualizationHandler.ts`
3. Finally fix the debug panel integration in `src/phaser/handlers/GameSceneDebugHandler.ts`

## Step 3: Check for Additional Files

During implementation in Code mode, you may need to check these additional files:

1. `src/phaser/handlers/debug/handlers/DebugInteractionHandler.ts` - Handles interaction with debug objects
2. `src/phaser/handlers/debug/handlers/DebugInspectionHandler.ts` - Manages object selection state
3. `src/phaser/handlers/debug/DebugPanelUpdater.ts` - Updates the debug panel content

## Step 4: Testing

After implementing each set of changes:

1. Test the UI layout by running the game and verifying button and stat positions
2. Test debug mode functionality by enabling debug mode and checking:
   - All game objects remain visible
   - Collision boundaries appear correctly
   - Object selection highlighting works
   - Debug panel shows properties for selected objects

## Step 5: Iterative Refinement

If any issues persist after the initial implementation:

1. Use debug logging to identify which parts of the code are not working as expected
2. Check for any implementation errors in the code changes
3. Make additional targeted fixes as needed

## Ready to Implement

To begin implementation, switch to Code mode and refer to the detailed changes in `ui-debug-repair-implementation.md`.