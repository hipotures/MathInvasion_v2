# HtmlDebugPanel Refactoring Plan

## Current Issues
- File is 288 lines long
- Handles multiple responsibilities:
  - HTML DOM manipulation
  - Debug panel UI creation
  - Data formatting and display
  - Inspection mode management
  - Event handling

## Proposed Split

### 1. `HtmlDebugPanel.ts` (Core class)
- Main class that orchestrates the debug panel
- Manages panel visibility and container
- Delegates to specialized components
- Handles high-level event subscriptions
- ~100 lines

### 2. `debug/ui/DebugPanelDOM.ts`
- Handles DOM creation and manipulation
- Creates container and base elements
- Manages styles and layout
- ~70 lines

### 3. `debug/ui/DebugPanelRenderer.ts`
- Renders data to the panel
- Creates and updates section content
- Formats data for display
- ~70 lines

### 4. `debug/ui/InspectionModeManager.ts`
- Handles inspection mode state
- Toggles between normal and inspection views
- Displays inspection details
- ~70 lines

### 5. `debug/ui/types/DebugPanelUITypes.ts`
- Shared type definitions for debug panel UI
- ~30 lines

## Implementation Strategy
1. Create the shared types file first
2. Implement each specialized component
3. Update the main HtmlDebugPanel to use the new components
4. Ensure proper initialization and cleanup in each component
5. Update imports and references

## Notes
- Consider using a more component-based approach for UI elements
- The DOM manipulation could be further abstracted if more complex UI is needed