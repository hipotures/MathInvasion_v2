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
*   **Facade (Implicit):** Core managers (`PlayerManager`, `EnemyManager`, `WeaponManager`, `PowerupManager`, etc.) provide simplified interfaces over more complex internal state and logic.
*   **Dependency Injection (Manual):** Dependencies like `EventBus`, `Logger`, `EconomyManager`, and configurations are passed into constructors (e.g., `WeaponManager`, `GameScene` handlers, `PowerupManager`).

**Component Relationships:**
*   **Powerup Flow:**
    1.  `EnemyEventHandler` (`handleEnemyDestroyed`): Checks `powerups.yml` drop chances upon enemy death.
    2.  If drop check passes, emits `REQUEST_SPAWN_POWERUP` with position.
    3.  `PowerupManager` (`handleRequestSpawnPowerup`): Listens for request, randomly selects a powerup from `powerups.yml`, emits `POWERUP_SPAWNED` with instance ID, config ID, position, and visual key.
    4.  `GameSceneEventHandler` (`handlePowerupSpawned`): Listens for spawn event, creates powerup sprite using visual key, adds to `powerupGroup` and `powerupSprites` map.
    5.  `GameSceneCollisionHandler` (`handlePlayerPowerupCollision`): Detects player/powerup overlap, emits `POWERUP_COLLECTED` with instance ID, destroys sprite.
    6.  `PowerupManager` (`handlePowerupCollected`): Listens for collection, applies effect (emits `POWERUP_EFFECT_APPLIED`), starts internal timer.
    7.  Relevant Managers (`PlayerManager`, `WeaponManager`, `EconomyManager`): Listen for `POWERUP_EFFECT_APPLIED`, modify their state (e.g., `isShieldPowerupActive`, `rapidFireMultiplier`, `cashBoostMultiplier`).
    8.  `PowerupManager` (`update`): Decrements timer for active effects.
    9.  `PowerupManager` (`removeEffect`): When timer expires, emits `POWERUP_EFFECT_REMOVED`.
    10. Relevant Managers: Listen for `POWERUP_EFFECT_REMOVED`, revert state modifications.
*   *(To be documented, potentially with diagrams)*

**Critical Implementation Paths:**
*   Ensuring accurate physics/graphics synchronization.
*   Managing game state transitions (active, pause, game over).
*   Handling asynchronous operations (timers, API calls).
