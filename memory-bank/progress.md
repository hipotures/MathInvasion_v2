# Progress: Math Invasion v2

**Current Status:** Milestone M3: Wrogowie i Kolizje - **IN PROGRESS** (Enemy behavior refinement ongoing).

**What Works:**
*   **Refactor GameScene (Line Limit):** Extracted collision logic to `GameSceneCollisionHandler` and event logic to `GameSceneEventHandler`, bringing `GameScene.ts` under the 300-line limit.
*   **Milestone M3: Wrogowie i Kolizje (Partial)**
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

**What's Left to Build (Milestone M3):**
*   **Enemy Variety & Behavior (Refinement):** ~~Refine movement patterns (implement `boss_weaving`, `bomber_dive`)~~ *(Done)*, add `homing`? ~~Implement aiming logic~~ *(Done)*. ~~Add `hexagon_bomber`~~ *(Done)*. Add *more* enemy types/assets. ~~Implement `death_bomb` projectile logic (visuals, collision)~~ *(Core logic Done)*. ~~Add distinct enemy projectiles (graphics, types)~~ *(Done - Mapped)*.
*   **Difficulty Scaling:** Implement logic based on `difficulty.yml` (spawn rates, multipliers).
*   **Collision Refinement:** Consider adding invulnerability for enemies?
*   **Visual Polish:** ~~Add visual effect for death bomb explosion~~ *(Done - Basic effect)*.

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
