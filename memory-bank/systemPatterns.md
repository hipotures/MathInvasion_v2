# System Patterns: Math Invasion v2

*(To be filled in as patterns emerge)*

**Key Technical Decisions:**
*   Phaser 3 with Arcade Physics.
*   TypeScript for static typing.
*   Vite for build tooling.
*   Modular architecture separating core logic (`src/core`) from Phaser integration (`src/phaser`).
*   Configuration driven by YAML files (`config/`).
*   Event-driven communication via `EventBus`.
*   Strict 300-line limit per `.ts` file, enforced via refactoring (e.g., `GameScene` -> Handlers).

**Design Patterns:**
*   **Singleton:** Used for `EventBus` and `Logger` to provide global access points.
*   **Observer (via EventBus):** Core managers and Phaser scenes subscribe to events on the `EventBus` to react to state changes without direct coupling.
*   **Strategy (Implicit):** Enemy movement patterns (`EnemyEntity.handleMovement`) and weapon firing logic (`WeaponManager` / `ProjectileEventHandler`) select behavior based on configuration.
*   **Facade (Implicit):** Core managers (`PlayerManager`, `EnemyManager`, `WeaponManager`, etc.) provide simplified interfaces over more complex internal state and logic.
*   **Dependency Injection (Manual):** Dependencies like `EventBus`, `Logger`, and `EconomyManager` are passed into constructors (e.g., `WeaponManager`, `GameScene` handlers).

**Component Relationships:**
*   *(To be documented, potentially with diagrams)*

**Critical Implementation Paths:**
*   Ensuring accurate physics/graphics synchronization.
*   Managing game state transitions (active, pause, game over).
*   Handling asynchronous operations (timers, API calls).
