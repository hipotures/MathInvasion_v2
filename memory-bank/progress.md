# Progress: Math Invasion v2

**Current Status:** Milestone M7 In Progress (Refactoring & Unit Testing).

**What Works:**
*   **Milestone M7: Balans, Testy, Optymalizacja i CI/CD (In Progress)**
    *   **Code Modularity Refactoring:**
        *   Refactored `HtmlDebugUI`, `GameSceneDebugHandler`, `HtmlUI` by extracting element creation/update logic into helper classes (`HtmlDebugElementFactory`, `DebugPanelUpdater`, `HtmlElementFactory`).
        *   Refactored `WeaponManager` to use `WeaponUpgrader` for cost calculation (DRY).
        *   Split large test files (`WeaponManager.test.ts`, `EnemyManager.test.ts`, `PlayerManager.test.ts`, `ProjectileManager.test.ts`) into smaller, focused files based on functionality (e.g., Initialization, Spawning, Damage, Cleanup).
        *   All refactored files are now under the 300-line limit.
    *   **Testing Setup & Unit Tests:**
        *   Installed `vitest` dev dependency.
        *   Added `test` script to `package.json`.
        *   Created and passed unit tests for `EconomyManager`, `PlayerManager`, `WeaponManager`, `ProjectileManager`, `PowerupManager`, `EnemyManager`, `InputManager`, `ConfigLoader`, `WeaponUpgrader`, `WeaponPowerupHandler`, `PlayerPowerupHandler`, `EnemyWaveHandler`.
        *   Fixed various test issues (mocks, imports, types, event names).
        *   Resolved ESLint errors in test files.
    *   **Initial Balancing:**
        *   Reviewed `difficulty.yml`, `enemies.yml`, `weapons.yml`, `powerups.yml`.
        *   Adjusted `difficulty.yml`: Reduced health scaling (`enemyHealthMultiplierPerWave: 1.06`), added `diamond_strafer` (wave 10) and `hexagon_bomber` (wave 12) to unlock schedule.
    *   **Debug Panel Enhancements:**
        *   Added dynamic list of active objects with abbreviated parameters (T, X, Y, H, I, Vx, Vy, A) and legend.
        *   Implemented object age display (A) based on creation timestamps stored in managers.
        *   Adjusted panel layout (ActiveObjects at bottom, fixed height, fixed width 360px).
      *   **Debug Inspection Improvements:**
        *   Enhanced object clickability by adding larger hit areas with 20px padding around sprites and shapes.
        *   Improved visual feedback with yellow highlighting for the currently inspected object.
        *   Fixed issue where objects couldn't be clicked when the game was paused.
        *   Added event listeners to ensure objects remain interactive during pause.
        *   Implemented proper cleanup of event listeners and object interactivity.
        *   Modified `EnemyEntity` to respect game pause state and prevent shooting while paused.
*   **Milestone M6: PWA Setup (Implemented)**
*   `vite-plugin-pwa` configured in `vite.config.ts` for service worker generation (caching assets, configs).
    *   Service worker registration handled in `src/main.ts` using `workbox-window`.
    *   TypeScript types for PWA plugin added to `src/vite-env.d.ts`.
*   **Milestone M6: Distinct Enemy Destruction Effects (Initial Implementation)**
    *   Added `REQUEST_ENEMY_DESTRUCTION_EFFECT` event.
    *   `EnemyEntity.destroySelf` now emits this event instead of applying a generic tween.
    *   `EnemyEventHandler.handleEnemyDestroyed` no longer plays the generic sound.
    *   `GameSceneEventHandler` listens for the new event and applies placeholder visual effects (circle tweens) and sound based on enemy `configId`.
*   **Milestone M6: Difficulty Scaling & Wave Logic (Implemented)**
    *   `EnemyManager` loads `difficulty.yml` configuration.
    *   Enemy health, speed, reward, and wave enemy count are scaled based on the current wave number and multipliers defined in `difficulty.yml`.
    *   Enemy types available per wave are determined by `waveEnemyTypeUnlock` in `difficulty.yml`.
    *   Wave progression is timed based on `timeBetweenWavesSec` from `difficulty.yml`.
    *   Boss waves are triggered based on `bossWaveFrequency` and spawn the configured `bossId`.
    *   Scaled health and speed multiplier are passed via `ENEMY_SPAWNED` event to `EnemyEventHandler` and then to `EnemyEntity`.
    *   `EnemyEntity` uses the scaled speed multiplier for movement calculations.
    *   Scaled reward is passed via `ENEMY_DESTROYED` event.
    *   Scaled max health is passed via `ENEMY_HEALTH_UPDATED` event for UI consistency.
    *   Implemented `standard_grid` spawn pattern in `EnemyManager.spawnWave`.
    *   Implemented wave clearing condition: Waves now advance only after all enemies in the current wave are destroyed (plus the configured delay).
*   **Milestone M6: Visual Polish (Implemented)**
    *   Enhanced death bomb explosion visual effect (`GameSceneAreaEffectHandler`).
    *   Improved player death sequence with sound and visual explosion (`PlayerEventHandler`).
    *   Added scaling tween feedback for weapon switching in UI (`UIScene`).
*   **Milestone M5: Power-upy (Complete)**
    *   Created `PowerupManager` to handle powerup state, timers, and effects.
    *   Added powerup event constants.
    *   Integrated `PowerupManager` into `GameScene`.
    *   Loaded powerup assets and sounds.
    *   Added powerup group and sprite map to `GameScene`.
    *   Updated `EnemyEventHandler` to check drop chances and request powerup spawns.
    *   Updated `GameSceneEventHandler` to handle powerup spawning visuals and sound.
    *   Updated `GameSceneCollisionHandler` to handle player-powerup collisions and emit collection event.
    *   Implemented Shield effect (`temporary_invulnerability`) in `PlayerManager`.
    *   Implemented Rapid Fire effect (`weapon_cooldown_reduction`) in `WeaponManager`.
    *   Implemented Cash Boost effect (`currency_multiplier`) in `EconomyManager`.
    *   Fixed powerup collection using a manual overlap check in `GameScene.update` as a workaround for `physics.overlap` not firing.
    *   Implemented cleanup for powerups falling off-screen (`GameScene.update` check + `POWERUP_OUT_OF_BOUNDS` event + `PowerupManager` handler).
*   **Milestone M4: Rozbudowa Broni i UI (Complete)**
    *   **Wave Number Display:** Wave number is tracked by `EnemyManager`, emitted via `WAVE_UPDATED` event, and displayed in `UIScene`.
    *   **Weapon Upgrades (Cooldown, Damage, Speed):**
        *   UI displays current weapon level and calculated cost for the next upgrade.
        *   Input handling ('U' key) triggers upgrade requests.
        *   `WeaponManager` handles upgrade requests: checks/spends currency, increments level, calculates and applies cooldown, damage, and projectile speed upgrades based on config multipliers.
        *   `WeaponManager` emits updated weapon state (`WEAPON_STATE_UPDATED`).
        *   `WeaponManager` emits calculated damage and speed in `REQUEST_FIRE_WEAPON` event.
        *   `ProjectileEventHandler` uses damage and speed from `REQUEST_FIRE_WEAPON` event when spawning projectiles.
        *   `weaponSchema` and `weapons.yml` updated to support `projectileSpeedMultiplier`.
    *   **Score System:** Score is tracked and displayed. Enemies grant score on destruction.
    *   **UI Display:**
        *   Weapon selection buttons are interactive.
        *   Current weapon name/level/upgrade cost displayed.
        *   Active weapon button highlighted.
        *   Player health displayed and color-coded.
        *   Score displayed.
        *   Wave number displayed.
    *   **Refactor GameSceneEventHandler (Line Limit):** Event logic extracted into sub-handlers (`PlayerEventHandler`, `ProjectileEventHandler`, `EnemyEventHandler`).
    *   **Refactor WeaponManager (Line Limit):** Weapon upgrade logic extracted into helper class `WeaponUpgrader`.
*   **Milestone M3: Wrogowie i Kolizje (Complete)**
    *   **Enemy Variety (Hexagon Bomber, Diamond Strafer):**
        *   Added `hexagon_bomber` config, schema update (discriminated union for abilities), asset key, asset loading, enemy-to-asset mapping (`GameSceneEventHandler`), and included in random spawner.
        *   Added `diamond_strafer` config, schema update (`strafe_horizontal` pattern), asset key, asset loading, enemy-to-asset mapping (`GameSceneEventHandler`), and included in random spawner.
    *   **Enemy Movement (Refined):** Implemented sine-wave `boss_weaving`, `bomber_dive`, and `strafe_horizontal` patterns in `EnemyEntity.handleMovement`. Basic side-to-side movement (`invader_standard`, `invader_support`) remains functional.
    *   **Enemy Abilities (Death Bomb):** Implemented full `death_bomb` logic:
        *   `EnemyManager` includes full config in `ENEMY_DESTROYED` event.
        *   `GameSceneEventHandler` spawns bomb projectile on `ENEMY_DESTROYED` using config data (type, damage, radius, time).
        *   `GameSceneEventHandler` uses correct texture for bomb projectile on `PROJECTILE_CREATED`.
        *   `GameScene` preloads bomb asset.
        *   `ProjectileManager` handles timed explosion (`timeToExplodeMs`) and emits `PROJECTILE_EXPLODE` event.
        *   `GameSceneCollisionHandler` listens for `PROJECTILE_EXPLODE`, applies area damage to enemies/player, and displays a simple visual effect (tweening circle).
    *   **Enemy Projectile Graphics:** Added constants, loaded assets (placeholders), and updated `GameSceneEventHandler` to map `enemy_bullet`, `enemy_bullet_fast`, and `enemy_laser` types to distinct graphics.
    *   **Player Invulnerability:** Added brief invulnerability period (1s) after player takes damage, with blinking visual effect. Implemented in `PlayerManager` and `GameSceneEventHandler`.
    *   **Enemy Aiming:** Enemies now fire projectiles towards the player's current position (`GameSceneEventHandler.handleEnemyRequestFire` updated).
    *   **Enemy Firing (Basic):** Enemies with `canShoot: true` and `shootConfig` in `enemies.yml` fire projectiles periodically (now aimed).
        *   Added `ENEMY_REQUEST_FIRE` event emitted by `EnemyEntity`.
        *   Added `owner` property to projectiles (`ProjectileManager`, `SpawnProjectileData`, `ProjectileLike`).
        *   `GameScene` handles `ENEMY_REQUEST_FIRE`, emits `SPAWN_PROJECTILE` with `owner: 'enemy'`.
        *   `GameScene` handles `PROJECTILE_CREATED`, tints enemy projectiles.
        *   Added `PLAYER_HIT_PROJECTILE` event.
        *   `GameScene` collision checks (`handleProjectileEnemyCollision`, `handlePlayerProjectileCollision`) now verify projectile `owner` to prevent friendly fire.
        *   `PlayerManager` listens for `PLAYER_HIT_PROJECTILE` and applies damage.
*   **Milestone M2: Podstawowa Rozgrywka (Ruch i Strzelanie) - COMPLETE**
    *   **Replace Placeholder Assets:** Created `assets.ts`, loaded actual images (`player_ship.png`, `bullet.png`, `alien_small.png`, `alien_medium.png`, `meteor_large.png`) and sound (`explosion_small.ogg`) via constants in `GameScene`. Mapped enemy config IDs to asset keys.
    *   **Load Core Values from Config:** Player health/speed (`player.yml`), weapon cooldown/projectile speed/damage (`weapons.yml`), enemy health/collision damage (`enemies.yml`) loaded via `ConfigLoader` and used by respective managers/scenes.
    *   Weapon cooldown and projectile speed loaded from `config/weapons.yml`.
    *   Projectile damage loaded from weapon config and used in `EnemyManager`.
    *   Player collision damage loaded from enemy config and used in `GameScene`.
    *   Enemy health loaded from `config/enemies.yml`.
    *   **Enemy Spawning & Collisions:** `EnemyManager` handles state/spawning/destruction. `EnemyEntity` created. `GameScene` spawns enemies (timer), handles events, implements `physics.overlap` (Player/Enemy, Projectile/Enemy). Collision events emitted with config damage. `ProjectileManager` removes projectiles. `EconomyManager` grants currency. `PlayerManager` applies damage.
    *   **Basic Movement & Firing:** Core managers created. Event-driven horizontal movement and basic firing (Spacebar) with cooldown implemented. Projectile spawning/removal handled. `GameScene` integrates managers. `UIScene` displays currency.
    *   **Refactor Projectile Spawning:** `WeaponManager` emits `REQUEST_FIRE_WEAPON` -> `GameScene` calculates spawn point & emits `SPAWN_PROJECTILE`.
    *   **Implement Weapon Switching:** Keys '1', '2', '3' trigger `WEAPON_SWITCH` event handled by `WeaponManager`.
    *   **Add Non-functional UI Buttons:** Placeholder text buttons added to `UIScene`.
    *   **Refine Destruction & Death:** Added tween effects for enemy destruction (`EnemyEntity.destroySelf`) and player death (`GameScene.handlePlayerDied`).
*   **Milestone M1: Konfiguracja i Zdarzenia - COMPLETE**
    *   Implemented `EventBus` (singleton).
    *   Installed `js-yaml`, `zod`, `@types/js-yaml`.
    *   Created initial YAML config files.
    *   Defined Zod schemas for config validation.
    *   Implemented `ConfigLoader`.
    *   Implemented basic `Logger` (singleton).
*   **Milestone M0: Szkielet Projektu (Setup) - COMPLETE**
    *   Project structure initialized.
    *   Dependencies installed (Vite, TS, Phaser, ESLint, Prettier, Husky, etc.).
    *   Git repository created locally and on GitHub (`hipotures/MathInvasion_v2`).
    *   Code quality tools (ESLint, Prettier, Husky) configured and working via pre-commit hook.
    *   Initial Memory Bank files created.
    *   Basic Phaser "Hello World" scene implemented.
    *   Basic PWA configuration (`manifest.json`, placeholder `service-worker.ts`).
    *   Initial commit pushed to GitHub.
*   **Fix Config Loading Order:** (Runtime Fix)
    *   Modified `src/main.ts` to use `async/await` to ensure `configLoader.loadAllConfigs()` completes before `new Phaser.Game()` is called.
*   **Fix Config Loading/Validation Errors:** Fixed EnemyManager singleton instantiation and optional projectileSpeed in weapon schema.

**What's Left to Build (M7 & Deferred):**
*   **M7 - Balancing:** Adjust config values, spawn patterns, drop rates based on playtesting.
*   **M7 - Testing:**
    *   Unit tests for core managers and helpers **COMPLETE**.
    *   Implement end-to-end tests (Playwright).
*   **M7 - Optimization:** Profile performance, optimize assets/physics, consider object pooling.
*   **M7 - CI/CD:** Set up GitHub Actions workflow.
*   **Deferred Tasks:** Add more enemy types/assets, 'homing' pattern, enemy invulnerability, refine destruction effects, implement weapon range upgrades.

**Overall Project Roadmap:**
*   **M0: Szkielet Projektu (Setup)** - **COMPLETE**
*   **M1: Konfiguracja i Zdarzenia** - **COMPLETE**
*   **M2: Podstawowa Rozgrywka (Ruch i Strzelanie)** - **COMPLETE**
*   **M3: Wrogowie i Kolizje** - **COMPLETE**
*   **M4: Rozbudowa Broni i UI** - **COMPLETE**
*   **M5: Power-upy i Zaawansowani Wrogowie** - **COMPLETE**
*   **M6: Pełny Cykl Gry i PWA** - **COMPLETE**
*   **M7: Balans, Testy, Optymalizacja i CI/CD** - **IN PROGRESS**

**Known Issues:**
*   Player vs Enemy collision instantly destroys the enemy (placeholder - uses 9999 damage in `GameScene`).

**Evolution of Project Decisions:**
*   Established singleton pattern for `EventBus` and `Logger`, requiring specific import handling for types vs. instances.
*   Confirmed separation of concerns: Core managers for logic/state, Phaser scenes for presentation/integration.
*   Moved projectile boundary checks from `GameScene` to `ProjectileManager`.
*   Adopted using `any` type for Phaser physics callback parameters due to type complexity, with casting inside handlers.
*   Vitest mocking requires careful setup, especially for class instances and their methods. Using `vi.fn()` for methods within the `vi.mock` factory and referencing those mocks correctly is crucial. Assertions need to match exact event payloads or use `expect.objectContaining` carefully.
*   Refactored large classes (`HtmlDebugUI`, `GameSceneDebugHandler`, `HtmlUI`) into smaller, focused helpers to improve modularity and adhere to line limits.
*   Restructured large test files using nested `describe` blocks for better organization.
