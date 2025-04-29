# Progress: Math Invasion v2

**Current Status:** Milestone M2: Podstawowa Rozgrywka - *Placeholder Assets Replaced.*

**What Works:**
*   **Milestone M2 (Partial): Replace Placeholder Assets**
    *   Created `src/core/constants/assets.ts` with keys for player, bullet, small alien.
    *   `GameScene` now loads and uses actual images (`player_ship.png`, `bullet.png`, `alien_small.png`) via constants.
*   **Milestone M2 (Partial): Load Core Values from Config**
    *   Player health and move speed loaded from `config/player.yml`.
    *   Weapon cooldown and projectile speed loaded from `config/weapons.yml`.
    *   Projectile damage loaded from weapon config and used in `EnemyManager`.
    *   Player collision damage loaded from enemy config and used in `GameScene`.
    *   Enemy health loaded from `config/enemies.yml`.
*   **Milestone M2 (Partial): Enemy Spawning & Collisions** (Basic implementation done)
    *   `EnemyManager` created, loads config, manages state (health from config), spawns/destroys enemies via events. Applies damage based on event payload.
    *   Placeholder `EnemyEntity` created, stores config (made public).
    *   `GameScene` spawns enemies (via timer), handles `ENEMY_SPAWNED`/`ENEMY_DESTROYED` events.
    *   `GameScene` implements `physics.overlap` for Player/Enemy and Projectile/Enemy.
    *   Collision events (`PROJECTILE_HIT_ENEMY`, `PLAYER_HIT_ENEMY`) emitted from `GameScene` with damage from config.
    *   `ProjectileManager` removes projectile state on `PROJECTILE_HIT_ENEMY`. Stores damage from `SPAWN_PROJECTILE` event and provides `getProjectileDamage` method.
    *   `EconomyManager` grants currency (from config) on `ENEMY_DESTROYED`.
    *   `PlayerManager` applies damage based on `PLAYER_HIT_ENEMY` event payload.
*   **Milestone M2 (Partial): Basic Movement & Firing**
    *   Core managers created (`Player`, `Input`, `Weapon`, `Projectile`, `Economy`).
    *   Event-driven horizontal player movement implemented.
    *   Event-driven basic weapon firing (Spacebar) with cooldown implemented.
    *   Projectile spawning and removal (off-screen) handled.
    *   `GameScene` integrates managers for player/projectile visuals and updates.
    *   `UIScene` displays currency updated by `EconomyManager`.
    *   `main.ts` loads `GameScene` and `UIScene`.
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

**What's Left to Build (Current Milestone - M2):**
*   **Enemies:** ~~Config~~, ~~Manager~~, ~~Entity (placeholder)~~, ~~Spawning in `GameScene`~~. (All Done)
*   **Collisions:** ~~Physics checks (`overlap`)~~, ~~Collision events~~, ~~Damage handling (`PlayerManager`, `EnemyManager`)~~, ~~Projectile removal (`ProjectileManager`)~~, ~~Currency gain (`EconomyManager`)~~. (Done - uses config damage)
*   **Assets:** ~~Replace placeholder player/bullet/enemy graphics.~~ (Done)
*   **Refinement:**
    *   ~~Implement actual damage calculation (projectile vs enemy, player vs enemy).~~ (Done)
    *   Refine enemy destruction (visuals, sound). -> *Basic sound effect added.*
    *   Refine player death logic (game over). -> *Basic GAME OVER text added.*
    *   ~~Load values (speeds, health, damage, cooldowns) from config files.~~ (Done)
    *   ~~Refine projectile spawn points.~~ (Done - Handled by `GameScene`)
    *   ~~Implement weapon switching (optional for M2).~~ (Done - Keys 1, 2, 3)
    *   ~~Implement UI buttons for weapons (non-functional).~~ (Done)

**Overall Project Roadmap:**
*   **M0: Szkielet Projektu (Setup)** - **COMPLETE**
*   **M1: Konfiguracja i Zdarzenia** - **COMPLETE**
*   **M2: Podstawowa Rozgrywka (Ruch i Strzelanie)** - *In Progress*
*   **M3: Wrogowie i Kolizje**
*   **M4: Rozbudowa Broni i UI**
*   **M5: Power-upy i Zaawansowani Wrogowie**
*   **M6: Pełny Cykl Gry i PWA**
*   **M7: Balans, Testy, Optymalizacja i CI/CD**

**Known Issues:**
*   ~~Using placeholder graphics (Vite logo) for player, bullets, and enemies.~~ (Fixed)
*   ~~Projectile spawn position is a fixed offset from player center.~~ (Fixed - calculated by `GameScene`)
*   ~~Movement speed, cooldowns, projectile speeds, player health, enemy health, damage values are hardcoded placeholders.~~ (Fixed - loaded from config)
*   Player vs Enemy collision instantly destroys the enemy (placeholder - uses 9999 damage).
*   ~~Enemy sprites in `GameScene` currently default to `ENEMY_SMALL_ALIEN_KEY` regardless of the enemy type spawned by `EnemyManager`. Needs mapping based on config ID.~~ (Fixed - Mapped in `GameScene.handleEnemySpawned`)

**Evolution of Project Decisions:**
*   Established singleton pattern for `EventBus` and `Logger`, requiring specific import handling for types vs. instances.
*   Confirmed separation of concerns: Core managers for logic/state, Phaser scenes for presentation/integration.
*   Moved projectile boundary checks from `GameScene` to `ProjectileManager`.
*   Adopted using `any` type for Phaser physics callback parameters due to type complexity, with casting inside handlers.
