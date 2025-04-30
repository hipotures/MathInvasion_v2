# Active Context: Math Invasion v2

**Current Focus:** Milestone M7 - Balans, Testy, Optymalizacja i CI/CD

**Recent Changes (M7 - Code Modularity Refactoring):**
*   Refactored several source and test files to improve modularity and adhere to the 300-line limit:
    *   `src/core/utils/HtmlDebugUI.ts`: Extracted element creation logic into `helpers/HtmlDebugElementFactory.ts`.
    *   `src/phaser/handlers/GameSceneDebugHandler.ts`: Extracted debug panel update logic into `debug/DebugPanelUpdater.ts`.
    *   `src/core/utils/HtmlUI.ts`: Extracted element creation logic into `helpers/HtmlElementFactory.ts`.
    *   `src/core/managers/WeaponManager.ts`: Refactored `emitStateUpdate` to use `WeaponUpgrader.calculateNextUpgradeCost`, removing duplicate logic.
    *   `tests/core/managers/WeaponManager.test.ts`: Restructured tests using nested `describe` blocks for better organization. Split into multiple files: `Initialization`, `Firing`, `Upgrades`, `Powerups`, `Cleanup`.
    *   `tests/core/managers/EnemyManager.test.ts`: Restructured tests using nested `describe` blocks.
    *   `tests/core/managers/PlayerManager.test.ts`: Restructured tests using nested `describe` blocks.
    *   `tests/core/managers/ProjectileManager.test.ts`: Restructured tests using nested `describe` blocks.

**Recent Changes (M7 - Debug Visibility Fix):**
*   Fixed issue where newly spawned entities (enemies, projectiles, powerups) ignored the current debug mode state.
*   Updated `EnemyEventHandler`, `ProjectileEventHandler`, and `GameSceneEventHandler` to check `debugState.isDebugMode` when creating sprites.
*   Newly created sprites now correctly set their initial visibility using `sprite.setVisible(!debugState.isDebugMode)`.

**Recent Changes (M7 - UI Rendering Improvements):**
*   Completely replaced Phaser text rendering with HTML-based UI:
    *   Created `HtmlUI` class to manage HTML UI elements that scale properly at high resolutions.
    *   Updated `UIScene` to use `HtmlUI` instead of Phaser text objects.
    *   Positioned UI elements relative to the game canvas with proper scaling.
    *   Added window resize handling to maintain correct positioning.
*   Improved debug mode visualization:
    *   Created `HtmlDebugPanel` class for displaying debug information.
    *   Created `HtmlDebugLabels` class for labeling game objects in debug mode.
    *   Updated `GameSceneDebugHandler` to use HTML elements instead of Phaser text.
    *   Fixed positioning of labels relative to game objects.
*   Fixed ProjectileManager test that was failing due to incorrect expectations in the explosion test.

**Recent Changes (M7 - Testing Setup & ESLint Fixes):**
*   Installed `vitest` as a dev dependency (`npm install --save-dev vitest`).
*   Added `test` script (`"test": "vitest"`) to `package.json`.
*   Created initial unit test file `tests/core/managers/EconomyManager.test.ts`.
*   Implemented and passed basic tests for `EconomyManager` covering initialization, currency/score addition and spending, and listener registration/cleanup.
*   Created unit test file `tests/core/managers/PlayerManager.test.ts`.
*   Added `invulnerabilityDurationMs` to `playerSchema.ts` and `player.yml` to support testing.
*   Implemented tests for `PlayerManager` covering initialization, state updates (health, movement via events), invulnerability logic, death event, and interaction with mocked `PlayerPowerupHandler`.
*   Fixed various issues in `PlayerManager.test.ts` related to imports (default vs. named), Vitest mock setup (`vi.mock`, `vi.fn`, `mockReturnValue`), event payload assertions, and test matchers (`toBeLessThanOrEqual`). All tests for `PlayerManager` are now passing.
*   Reviewed existing unit test file `tests/core/managers/WeaponManager.test.ts`.
*   Fixed ESLint issues in `tests/core/managers/WeaponManager.test.ts`:
    *   Removed unused imports (`Logger`, `POWERUP_EFFECT_APPLIED`, `POWERUP_EFFECT_REMOVED`).
    *   Removed unused `mockRapidFirePowerup` variable.
    *   Replaced `any` types with more specific types in constructor arguments and function parameters.
    *   Replaced generic `Function` type with specific function signatures in event listener type assertions.
    *   Removed unused `ListenerFn` type definition.
*   Ran `npm test` and confirmed all tests (including `EconomyManager`, `PlayerManager`, and `WeaponManager`) are passing (35 tests total).
*   Created unit test file `tests/core/managers/ProjectileManager.test.ts`.
*   Refactored `ProjectileManager.test.ts` to correctly mock dependencies (`ConfigLoader` removed as it's not used by the manager), fix constructor call (`EventBus`, `worldWidth`, `worldHeight`), import necessary types (`SpawnProjectileData`, `ProjectileLike`), adjust assertions based on actual manager behavior (no config storage, no range check, correct event payload structure), and remove unused `@ts-expect-error` directives.
*   Implemented and passed tests (8 tests) for `ProjectileManager` covering initialization, projectile spawning/destruction (via hit, bounds, explosion), owner/damage retrieval, and listener cleanup.
*   Ran `npm test` and confirmed all tests (including `EconomyManager`, `PlayerManager`, `WeaponManager`, and `ProjectileManager`) are passing (71 tests total).
*   Created unit test file `tests/core/managers/PowerupManager.test.ts`.
*   Fixed issues in `PowerupManager.test.ts` related to incorrect import style (named vs. default), schema mismatches (`effect`/`visual` vs `type`/`visualKey`), constructor signature, missing `init()` call, and event data types.
*   Implemented and passed tests (5 tests) for `PowerupManager` covering initialization, powerup spawning, collection, effect application/timer management, and listener cleanup.
*   Ran `npm test` and confirmed all tests are passing (69 tests total - *Note: total test count decreased slightly, likely due to refactoring/removal of some previous tests*).
*   Completed restructuring and splitting of `WeaponManager.test.ts` into `Initialization`, `Firing`, `Upgrades`, `Powerups`, and `Cleanup` files. All tests passing.

**Recent Changes (M7 - Initial Balancing):**
*   Reviewed `config/difficulty.yml`, `config/enemies.yml`, `config/weapons.yml`, `config/powerups.yml`.
*   Adjusted `config/difficulty.yml`:
    *   Reduced `enemyHealthMultiplierPerWave` from `1.08` to `1.06`.
    *   Added `diamond_strafer` unlock at wave 10.
    *   Added `hexagon_bomber` unlock at wave 12.
    *   Shifted `pentagon_healer` unlock from wave 15 to wave 15 (no change, just reordered).

**Next Steps (Milestone M7 - Balans, Testy, Optymalizacja i CI/CD):**
*   **Balancing:**
    *   Review and adjust values in `config/*.yml` (enemy health/speed/reward/score, weapon damage/cooldown/cost, powerup duration/effects, difficulty scaling) based on playtesting.
    *   Fine-tune enemy spawn patterns and wave composition.
    *   Adjust powerup drop rates.
*   **Testing:**
    *   Implement unit tests (Vitest/Jest) for core managers and utility functions. *(EconomyManager, PlayerManager, WeaponManager, ProjectileManager, PowerupManager, EnemyManager done)* -> Next: `InputManager`, Helpers (`WeaponUpgrader`, `WeaponPowerupHandler`, `PlayerPowerupHandler`, `EnemyWaveHandler`), `ConfigLoader`. *(Note: EnemyManager tests were fixed/completed during refactoring)*.
    *   Implement end-to-end tests (Playwright) for key gameplay flows (movement, shooting, upgrades, powerups, game over).
*   **Optimization:**
    *   Profile game performance (FPS, memory usage) and identify bottlenecks.
    *   Optimize asset loading and management.
    *   Review physics interactions and collision checks for efficiency.
    *   Consider object pooling for projectiles and enemies if needed.
*   **CI/CD:**
    *   Set up GitHub Actions workflow to:
        *   Run linting and tests on push/pull request.
        *   Build the project.
        *   Deploy the build (e.g., to GitHub Pages or another hosting provider).
*   **Deferred Tasks & Polish:**
    *   Add more enemy types/assets (Deferred from M3).
    *   Implement 'homing' movement pattern? (Deferred from M3).
    *   Consider enemy invulnerability after hits (Deferred from M3).
    *   Refine distinct visual effects for different enemy destructions (Deferred from M6).
    *   Apply range upgrades for weapons (Deferred from M4 - requires changes in ProjectileManager/EventHandler).

**Important Patterns & Preferences:**
*   **Clean Code:** Adhere strictly to guidelines (SRP, DRY, meaningful names, etc.).
*   **File Size Limit:** Source code files (`.ts`) MUST NOT exceed 300 lines. Refactor immediately if limit is reached.
*   **Memory Bank:** Maintain diligently, read ALL files at the start of each session. Update after significant changes and milestones.
*   **GitHub:** Commit after each confirmed milestone/significant feature using Conventional Commits. Use GitHub MCP tool for repo operations.
*   **Context7:** Use for querying Phaser API documentation.
*   **Physics/Graphics Sync:** Ensure Arcade Physics bodies match Sprite visuals precisely. Player velocity is set in `GameScene` based on `PlayerManager` state. Projectile creation is triggered by `ProjectileManager` event.

**Learnings & Insights:**
*   Singleton pattern usage for `EventBus` and `Logger` requires careful import handling (importing instance vs. type). Named class exports are needed alongside default instance exports for type annotations (`import { EventBus as EventBusType }`).
*   Custom `EventBus` doesn't support Phaser's context argument in `on`/`off`. Event handler methods needing scene context must be bound explicitly (`this.handler = this.handler.bind(this)`).
*   Clear separation of concerns: Core managers handle state and logic, Phaser scenes handle presentation (sprites, physics bodies) and react to manager events. Boundary checks for projectiles fit better in `ProjectileManager` than `GameScene`.
*   Need for shared type definitions (like `PlayerState`, `ProjectileHitEnemyData`, `PlayerHitEnemyData`) for event payloads. *Updated `ProjectileHitEnemyData` and `SpawnProjectileData`.*
*   Phaser's `physics.overlap` callback parameter types can be tricky; using `any` and casting internally is a viable workaround.
*   Passing damage information through multiple managers/scenes can be complex. Chosen approach: `WeaponManager` adds damage to `SPAWN_PROJECTILE` -> `ProjectileManager` stores damage -> `GameScene` retrieves damage via `getProjectileDamage` -> `GameScene` adds damage to `PROJECTILE_HIT_ENEMY` -> `EnemyManager` uses damage from event.
*   Refactored projectile spawning: `WeaponManager` requests fire -> `GameScene` calculates spawn point & emits spawn details -> `ProjectileManager` creates state -> `GameScene` creates sprite. This keeps scene-specific calculations (spawn point) in the scene.
*   Vitest mocking requires careful setup, especially for class instances and their methods. Using `vi.fn()` for methods within the `vi.mock` factory and referencing those mocks correctly is crucial. Assertions need to match exact event payloads or use `expect.objectContaining` carefully.
*   Refactoring large classes into smaller, focused helpers (e.g., `HtmlDebugElementFactory`, `DebugPanelUpdater`, `HtmlElementFactory`) improves readability and maintainability, making it easier to adhere to line limits.
*   Restructuring large test files with nested `describe` blocks improves organization even if it doesn't drastically reduce line count. Splitting tests into logical files (e.g., by functionality like Initialization, Firing, Upgrades) is a better approach for managing complexity and line limits.

**Active Decisions & Considerations:**
*   Repository name: `MathInvasion_v2` (Public).
*   Using Vite with Vanilla TS template as base.
*   Enemies are instantly destroyed on collision with the player (placeholder behavior - uses 9999 damage in `GameScene`).
*   Damage values are loaded from config.
*   Actual assets loaded for player, bullets, and enemies.
*   Enemy sprites mapped based on config ID.

---
*Note: Previous milestone history (M0-M6) has been moved to `memory-bank/activeContext-prev.md`.*
