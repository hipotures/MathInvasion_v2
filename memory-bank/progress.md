# Progress: Math Invasion v2

**Current Status:** Milestone M3: Wrogowie i Kolizje - **IN PROGRESS** (Enemy behavior refinement ongoing).

**What Works:**
*   **Milestone M3: Wrogowie i Kolizje (Partial)**
    *   **Enemy Aiming:** Enemies now fire projectiles towards the player's current position (`GameScene.handleEnemyRequestFire` updated).
    *   **Enemy Movement (Refined):** Implemented sine-wave `boss_weaving` pattern. Basic side-to-side movement with downward drift (`invader_standard`, `invader_support`) remains functional.
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

**What's Left to Build (Milestone M3):**
*   **Enemy Variety & Behavior (Refinement):** ~~Refine movement patterns (implement `boss_weaving`)~~ *(Done)*, add `homing`? ~~Implement aiming logic~~ *(Done)*. Add more enemy types/assets, add distinct enemy projectiles.
*   **Difficulty Scaling:** Implement logic based on `difficulty.yml` (spawn rates, multipliers).
*   **Collision Refinement:** Review layers/groups, consider invulnerability periods.
*   **Visual Polish:** Improve destruction/death effects, add UI feedback for weapon switching.

**Overall Project Roadmap:**
*   **M0: Szkielet Projektu (Setup)** - **COMPLETE**
*   **M1: Konfiguracja i Zdarzenia** - **COMPLETE**
*   **M2: Podstawowa Rozgrywka (Ruch i Strzelanie)** - **COMPLETE**
*   **M3: Wrogowie i Kolizje** - **IN PROGRESS**
*   **M4: Rozbudowa Broni i UI**
*   **M5: Power-upy i Zaawansowani Wrogowie**
*   **M6: Pełny Cykl Gry i PWA**
*   **M7: Balans, Testy, Optymalizacja i CI/CD**

**Known Issues:**
*   ~~Using placeholder graphics (Vite logo) for player, bullets, and enemies.~~ (Fixed)
*   ~~Projectile spawn position is a fixed offset from player center.~~ (Fixed - calculated by `GameScene`)
*   ~~Movement speed, cooldowns, projectile speeds, player health, enemy health, damage values are hardcoded placeholders.~~ (Fixed - loaded from config)
*   Player vs Enemy collision instantly destroys the enemy (placeholder - uses 9999 damage in `GameScene`).

**Evolution of Project Decisions:**
*   Established singleton pattern for `EventBus` and `Logger`, requiring specific import handling for types vs. instances.
*   Confirmed separation of concerns: Core managers for logic/state, Phaser scenes for presentation/integration.
*   Moved projectile boundary checks from `GameScene` to `ProjectileManager`.
*   Adopted using `any` type for Phaser physics callback parameters due to type complexity, with casting inside handlers.
