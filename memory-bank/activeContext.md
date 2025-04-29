# Active Context: Math Invasion v2

**Current Focus:** Milestone M2: Podstawowa Rozgrywka - *Enemy Spawning & Basic Collisions Implemented.*

**Recent Changes:**
*   **M2 - Enemy Spawning & Collisions:**
    *   Verified enemy configuration (`config/enemies.yml`) and schema (`EnemySchema`).
    *   Created `EnemyManager` to load configs, manage enemy state (health), handle spawning (`spawnEnemy`), damage (`handleDamage`), and destruction (`destroyEnemy`). Emits `ENEMY_SPAWNED`, `ENEMY_DESTROYED`, `ENEMY_HEALTH_UPDATED`. Listens for `PROJECTILE_HIT_ENEMY`.
    *   Created placeholder `EnemyEntity` extending `Phaser.Physics.Arcade.Sprite` in `src/phaser/entities/`. Stores instance/config IDs, sets collision radius, basic velocity, and includes `takeDamage` (visual only) and `destroySelf` methods.
    *   Updated `GameScene`:
        *   Instantiated `EnemyManager`.
        *   Added `enemyGroup` (Phaser Group) and `enemySprites` (Map).
        *   Loaded placeholder enemy asset (`ENEMY_KEY`).
        *   Subscribed to `ENEMY_SPAWNED`, `ENEMY_DESTROYED`, `ENEMY_HEALTH_UPDATED` events.
        *   Implemented handlers (`handleEnemySpawned`, `handleEnemyDestroyed`, `handleEnemyHealthUpdate`) to manage `EnemyEntity` sprites based on manager events.
        *   Added temporary timer to spawn random enemies (`spawnRandomEnemy`).
        *   Added `physics.overlap` checks for `playerSprite` vs `enemyGroup` and `projectileGroup` vs `enemyGroup`.
        *   Implemented collision handlers (`handlePlayerEnemyCollision`, `handleProjectileEnemyCollision`) using `any` types for parameters and casting inside.
        *   `handleProjectileEnemyCollision` emits `PROJECTILE_HIT_ENEMY` and destroys the projectile sprite immediately.
        *   `handlePlayerEnemyCollision` emits `PLAYER_HIT_ENEMY` and currently destroys the enemy instantly (placeholder).
    *   Updated `ProjectileManager`: Listens for `PROJECTILE_HIT_ENEMY` and removes the projectile state (`removeProjectile`).
    *   Updated `EnemyManager`: Listens for `PROJECTILE_HIT_ENEMY` and applies damage (`handleDamage`).
    *   Updated `EconomyManager`: Listens for `ENEMY_DESTROYED` and grants currency (`addCurrency`).
    *   Updated `PlayerManager`:
        *   Added `health` property.
        *   Listens for `PLAYER_HIT_ENEMY` and applies damage (`handlePlayerHitEnemy`).
        *   Stops player movement upon death (health <= 0).
        *   Includes `health` in `PLAYER_STATE_UPDATED` event payload.
    *   Refactored `Logger` to export class type for annotations.
    *   Corrected various import issues and type errors across managers and scenes.
*   **M2 - Basic Movement & Firing Implemented:**
    *   Created core managers: `PlayerManager`, `InputManager`, `WeaponManager`, `ProjectileManager`, `EconomyManager`.
    *   Implemented horizontal movement logic (A/D, Arrow Keys) via `InputManager` -> `PlayerManager` event flow.
    *   Implemented basic firing logic (Spacebar) via `InputManager` -> `WeaponManager` -> `ProjectileManager` event flow.
    *   Added basic cooldown to `WeaponManager`.
    *   Created `PlayerState` type for event data.
    *   Renamed `HelloWorldScene` to `GameScene`.
    *   Created `UIScene` for UI elements.
    *   Integrated managers into `GameScene`: instantiated managers, added player sprite, handled `PLAYER_STATE_UPDATED`, `PROJECTILE_CREATED`, `PROJECTILE_DESTROYED` events.
    *   Integrated `EconomyManager` into `UIScene` to display currency via `CURRENCY_UPDATED` event.
    *   Updated `main.ts` to load `GameScene` and `UIScene`.
    *   Added placeholder boundary check in `ProjectileManager` to remove off-screen projectiles.
*   **Completed M1: Konfiguracja i Zdarzenia**
    *   Implemented `EventBus` (singleton instance export).
    *   Installed `js-yaml`, `zod`, `@types/js-yaml`.
    *   Created initial YAML config files (`weapons`, `enemies`, `powerups`, `difficulty`).
    *   Defined Zod schemas for config validation.
    *   Implemented `ConfigLoader` using Vite `import.meta.glob`.
    *   Implemented basic `Logger` (singleton instance export).
*   **Completed M0: Szkielet Projektu (Setup)**
    *   Initialized Vite project (Vanilla TS template).
    *   Installed dependencies (Phaser, ESLint, Prettier, Husky, lint-staged, typescript-eslint).
*   Created basic folder structure.
*   Initialized local Git repository.
*   Created GitHub repository `hipotures/MathInvasion_v2`.
*   Configured ESLint (`.eslintrc.js`).
*   Configured Prettier (`.prettierrc.js`).
    *   Configured Prettier (`.prettierrc.cjs`).
    *   Configured Husky and lint-staged (`.husky/pre-commit`, `package.json`).
    *   Created initial Memory Bank files (`projectbrief.md`, `productContext.md`, `activeContext.md`, `systemPatterns.md`, `techContext.md`, `progress.md`).
    *   Created simple "Hello World" Phaser scene (`HelloWorldScene.ts`).
    *   Set up basic PWA configuration (`public/manifest.json`, `src/pwa/service-worker.ts`).
    *   Made initial commit and pushed to GitHub.

**Next Steps (M2 - Continued):**
*   **Enemies:**
    *   ~~Define basic enemy configuration (`config/enemies.yml`, `EnemySchema`).~~ (Done)
    *   ~~Create `EnemyManager` to handle spawning and state.~~ (Done)
    *   ~~Create basic `EnemyEntity` (placeholder).~~ (Done)
    *   ~~Update `GameScene` to spawn enemies (e.g., on a timer).~~ (Done - temporary spawner added)
*   **Collisions:**
    *   ~~Implement physics collision checks in `GameScene` (`this.physics.overlap`).~~ (Done)
        *   ~~Player vs Enemy~~ (Done)
        *   ~~Projectile vs Enemy~~ (Done)
    *   ~~Define and handle collision events (e.g., `PLAYER_HIT_ENEMY`, `PROJECTILE_HIT_ENEMY`).~~ (Done)
    *   ~~Update `PlayerManager` to handle taking damage.~~ (Done)
    *   ~~Update `ProjectileManager` to handle hitting enemies (removal).~~ (Done)
    *   ~~Update `EnemyManager` to handle taking damage / destruction.~~ (Done)
    *   ~~Update `EconomyManager` to grant currency on enemy defeat.~~ (Done)
*   **Assets:** Replace placeholder graphics (Vite logo) with actual sprites for player, bullet, and enemies.
*   **Refinement:**
    *   Implement actual damage calculation based on projectile/weapon config hitting enemy config.
    *   Implement actual collision damage calculation for player vs enemy.
    *   Refine enemy destruction logic (e.g., explosion animation, sound).
    *   Refine player death logic (e.g., game over screen, restart).
    *   Load player speed, weapon cooldown, projectile speed from config.
    *   Refine projectile spawn position relative to player sprite.
    *   Implement weapon switching input and logic (if time permits in M2).
    *   Implement UI buttons for weapons (non-functional initially).

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
*   Need for shared type definitions (like `PlayerState`, `ProjectileHitEnemyData`, `PlayerHitEnemyData`) for event payloads.
*   Phaser's `physics.overlap` callback parameter types can be tricky; using `any` and casting internally is a viable workaround.

**Active Decisions & Considerations:**
*   Repository name: `MathInvasion_v2` (Public).
*   Using Vite with Vanilla TS template as base.
*   Enemies are instantly destroyed on collision with the player (placeholder behavior).
*   Damage values are currently hardcoded placeholders (e.g., 10 damage in `EnemyManager`, 10 collision damage in `GameScene`).
