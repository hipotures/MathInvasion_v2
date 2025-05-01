# Plan: Debug Object Inspection Enhancements

This plan details the steps to improve the debug object selection and inspection functionality in the Math Invasion game.

**Goals:**

1.  **Visualize Clickable Area:** Clearly show the actual hit area used for object selection in debug mode.
2.  **Enhance Object Inspection:** Display all relevant properties of a selected object in a standardized format within the debug panel.
3.  **Improve Panel Behavior:** Ensure the debug panel correctly switches between the default overview and detailed inspection view.

**Affected Files:**

*   `src/phaser/handlers/debug/handlers/DebugVisualizationHandler.ts`
*   `src/core/utils/debug/inspectors/PlayerInspector.ts`
*   `src/core/utils/debug/inspectors/EnemyInspector.ts`
*   `src/core/utils/debug/inspectors/ProjectileInspector.ts`
*   `src/core/utils/debug/inspectors/PowerupInspector.ts`
*   `src/core/utils/debug/formatters/DebugDataFormatter.ts`
*   `src/phaser/handlers/debug/DebugPanelUpdater.ts`

**Detailed Steps:**

**1. Visualize Clickable Area (`DebugVisualizationHandler.ts`)**

*   **Modify `drawDebugRectangle`:**
    *   Keep the existing logic drawing the physics `body` rectangle (this remains the green/yellow highlight).
    *   Add new logic to calculate the hit area dimensions using sprite/shape width/height, scale, and `hitAreaPadding` (from `DebugInteractionHandler`).
    *   Draw this hit area using `this.debugGraphics.lineStyle(1, 0xff0000, 1);` (red) and `this.debugGraphics.strokeRect()`.
    *   Ensure the *body* rectangle and HTML label still turn yellow (`0xffff00`) when `isInspected` is true.

**2. Enhance Object Inspection Data (Specialized Inspectors & Formatter)**

*   **Modify Specialized Inspectors (`src/core/utils/debug/inspectors/*.ts`):**
    *   In each `get...Details` method, gather *all* relevant properties (position, state, physics, custom data, parent, etc.) from the `gameObject`.
    *   Return these properties as a simple key-value object.
*   **Modify `DebugDataFormatter.ts`:**
    *   Update `formatDataToHtml` to iterate through *all* key-value pairs in the received data object.
    *   Format each pair as `<div>[${key}: ${value}]</div>`.
    *   Concatenate these into the final HTML string. Handle non-primitive values appropriately.

**3. Update Debug Panel Display (`DebugPanelUpdater.ts`)**

*   **Add Event Listeners (Constructor):**
    *   Listen for `Events.DEBUG_SHOW_INSPECTION_DETAILS`: Store the HTML payload, set `isInspecting = true`.
    *   Listen for `Events.DEBUG_STOP_INSPECTING`: Clear stored HTML, set `isInspecting = false`.
*   **Modify `update()` Method:**
    *   If `isInspecting` is true, update `htmlDebugPanel` with the stored inspection HTML.
    *   If `isInspecting` is false, update `htmlDebugPanel` with the default overview content.
*   **Trigger Update:** Ensure `update()` is called immediately after handling the inspection events.

**4. Pause Compatibility & Destruction Handling**

*   No changes needed. Existing logic in `GameSceneDebugHandler` and `DebugInspectionHandler` already covers these requirements.

**Implementation Flow Diagram:**

```mermaid
graph TD
    A[User Clicks Object] --> B(DebugInteractionHandler: Detects Click);
    B --> C(GameSceneDebugHandler: Receives Click);
    C --> D(DebugInspectionHandler: Handles Click);
    D --> E(DebugObjectInspector: Gets Details);
    E --> F(Specialized Inspector: Gathers ALL Properties);
    F --> G(DebugDataFormatter: Formats ALL Properties as [key: value]);
    G --> H(DebugInspectionHandler: Emits DEBUG_SHOW_INSPECTION_DETAILS with HTML);
    H --> I(DebugPanelUpdater: Listens, Stores HTML, Sets Flag);
    I --> J(DebugPanelUpdater: Updates Panel with Inspection HTML);
    C --> K(GameSceneDebugHandler: Updates Visuals);
    K --> L(DebugVisualizationHandler: Draws Red Hit Area & Yellow Body Highlight);

    M[Object Destroyed / User Clicks Again] --> N(DebugInspectionHandler: Detects Stop Condition);
    N --> O(DebugInspectionHandler: Emits DEBUG_STOP_INSPECTING);
    O --> P(DebugPanelUpdater: Listens, Clears HTML, Clears Flag);
    P --> Q(DebugPanelUpdater: Updates Panel with Default Overview);
    N --> R(GameSceneDebugHandler: Updates Visuals);
    R --> S(DebugVisualizationHandler: Draws Red Hit Area & Green Body Highlight);

    subgraph "Inspection Display"
        J
        Q
    end

    subgraph "Visual Feedback"
        L
        S
    end