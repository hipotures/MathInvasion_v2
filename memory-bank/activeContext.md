# Active Context: Math Invasion v2

**Current Focus:** Milestone M4: Rozbudowa Broni i UI - *Completing UI and Upgrade Logic.*

**Recent Changes (M4 - Completed):**
*   **M4 - Wave Number Display:**
    *   Added `WAVE_UPDATED` event constant to `src/core/constants/events.ts`.
    *   Updated `EnemyManager.ts`:
        *   Added `currentWave` property, initialized to 0.
        *   Added `advanceWave` method to increment wave and emit `WAVE_UPDATED`. Called initially in constructor.
        *   Added `emitWaveUpdate` helper method.
        *   Added `WaveUpdateData` interface.
    *   Updated `UIScene.ts`:
        *   Added `waveText` game object.
        *   Added `WaveUpdateData` interface definition.
        *   Added `handleWaveUpdate` method to update `waveText`.
        *   Added listener for `WAVE_UPDATED` in `create()` and removal in `shutdown`.
*   **M4 - Apply Weapon Upgrades (Damage & Speed):**
    *   Updated `WeaponManager.ts`:
        *   Added `currentDamage` and `currentProjectileSpeed` state variables.
        *   Initialized these variables in the constructor and `handleWeaponSwitch` based on `baseDamage` and `projectileSpeed` from `WeaponConfig` (using defaults if undefined).
        *   Updated `handleWeaponUpgradeRequest` to calculate and apply damage and speed upgrades based on `damageMultiplier` and `projectileSpeedMultiplier` from the `upgrade` config.
        *   Added `RequestFireWeaponData` interface to include calculated `damage` and `projectileSpeed`.
        *   Updated `attemptFire` to emit `REQUEST_FIRE_WEAPON` with the calculated `damage` and `projectileSpeed`.
    *   Updated `src/core/config/schemas/weaponSchema.ts`:
        *   Added optional `projectileSpeedMultiplier` to `weaponUpgradeSchema`.
    *   Updated `config/weapons.yml`:
        *   Added `projectileSpeedMultiplier: 1.05` to the `bullet` weapon's upgrade section.
    *   Updated `src/phaser/handlers/event/ProjectileEventHandler.ts`:
        *   Updated `handleRequestFireWeapon` method signature to accept `damage` and `projectileSpeed` in the event data.
        *   Updated `handleRequestFireWeapon` implementation to use the `damage` and `projectileSpeed` from the event data when emitting `SPAWN_PROJECTILE`, instead of reading from `weaponConfig`.
*   **M4 - Refactor GameSceneEventHandler (Line Limit):**
    *   Identified `src/phaser/handlers/GameSceneEventHandler.ts` (364 lines) exceeded the 300-line limit.
    *   Created new sub-handlers in `src/phaser/handlers/event/`:
        *   `PlayerEventHandler.ts`: Handles player state, death, and invulnerability events.
        *   `ProjectileEventHandler.ts`: Handles projectile creation/destruction and firing requests.
        *   `EnemyEventHandler.ts`: Handles enemy spawning, destruction, health updates, and death bombs.
    *   Refactored `GameSceneEventHandler.ts` to instantiate and delegate to these sub-handlers.
    *   Removed event listener registration/cleanup from `GameScene.ts` as sub-handlers now manage their own listeners.
*   **M4 - Weapon Upgrades & Score Display (Previous):**
    *   **Weapon Upgrade UI:**
        *   Updated `WeaponManager.ts`:
            *   Modified `WeaponStateUpdateData` interface to include `nextUpgradeCost`.
            *   Updated `emitStateUpdate` to calculate `nextUpgradeCost` based on `baseCost` and `costMultiplier` from `weaponConfig`.
        *   Updated `UIScene.ts`:
            *   Added `weaponUpgradeCostText` game object.
            *   Updated `handleWeaponStateUpdate` to display the `nextUpgradeCost` or "Max Level".
    *   **Weapon Upgrade Input & Logic:**
        *   Added `REQUEST_WEAPON_UPGRADE` event constant to `src/core/constants/events.ts`.
        *   Updated `InputManager.ts` (`handleKeyDown`) to listen for 'U' key and emit `REQUEST_WEAPON_UPGRADE`.
        *   Updated `WeaponManager.ts`:
            *   Added `EconomyManager` dependency to constructor.
            *   Added listener for `REQUEST_WEAPON_UPGRADE`.
            *   Implemented `handleWeaponUpgradeRequest` method:
                *   Calculates upgrade cost.
                *   Checks currency using `economyManager.getCurrentCurrency()`.
                *   Spends currency using `economyManager.spendCurrency()`.
                *   Increments `currentWeaponLevel`.
                *   Applies cooldown upgrade (using `cooldownMultiplier`).
                *   Emits `WEAPON_STATE_UPDATED`.
        *   Updated `GameScene.ts` (`initializeManagers`) to pass `EconomyManager` instance to `WeaponManager` constructor.
    *   **Score System:**
        *   Added `SCORE_UPDATED` event constant to `src/core/constants/events.ts`.
        *   Updated `src/core/config/schemas/enemySchema.ts` to include `scoreValue` field in `enemySchema`.
        *   Updated `config/enemies.yml` to add `scoreValue` to all enemy definitions.
        *   Updated `EconomyManager.ts`:
            *   Added `currentScore` property and `initialScore` constructor parameter.
            *   Added `addScore` and `emitScoreUpdate` methods.
            *   Updated internal `EnemyDestroyedData` interface to include `scoreValue`.
            *   Updated `handleEnemyDestroyed` to call `addScore`.
            *   Added `emitScoreUpdate()` call in constructor.
        *   Updated `EnemyManager.ts`:
            *   Updated internal `EnemyDestroyedData` interface definition.
            *   Modified `destroyEnemy` to retrieve `scoreValue` from config and include it in the `ENEMY_DESTROYED` event payload.
        *   Updated `UIScene.ts`:
            *   Added `scoreText` game object.
            *   Added `handleScoreUpdate` method.
            *   Added listener for `SCORE_UPDATED` event.
            *   Added unsubscription for `SCORE_UPDATED` on shutdown.
*   **M4 - UI Enhancements (Previous):**
    *   Made weapon selection buttons interactive in `UIScene.ts`, emitting `WEAPON_SWITCH` event on click.
    *   Updated `WeaponManager.ts` to emit initial weapon state.
    *   Updated `UIScene.ts` to display weapon name/level and highlight active button via `WEAPON_STATE_UPDATED`.
    *   Updated `UIScene.ts` to display player health and color based on value via `PLAYER_STATE_UPDATED`.

**Recent Changes (End of M3):**
*   **M3 - Add Diamond Strafer Enemy:**
    *   Added `diamond_strafer` configuration to `config/enemies.yml` with `strafe_horizontal` movement pattern and shooting capabilities.
    *   Updated `src/core/config/schemas/enemySchema.ts` to add `strafe_horizontal` to the `movementPattern` enum.
    *   Added `ENEMY_DIAMOND_STRAFER_KEY` to `src/core/constants/assets.ts`.
    *   Updated `src/phaser/scenes/GameScene.ts`:
        *   Added loading for `diamond_strafer.png` (assuming filename) in `preload()`.
        *   Included `diamond_strafer` in the temporary `spawnRandomEnemy()` pool.
    *   Updated `src/phaser/handlers/GameSceneEventHandler.ts` to map `diamond_strafer` ID to `ENEMY_DIAMOND_STRAFER_KEY` in `handleEnemySpawned()`.
    *   Updated `src/phaser/entities/EnemyEntity.ts` to implement `strafe_horizontal` movement logic (fast horizontal, reverse on bounds, slow drift) in `handleMovement()`.
*   **M3 - Add Hexagon Bomber Enemy:**
    *   Added `hexagon_bomber` configuration to `config/enemies.yml` with `bomber_dive` movement pattern and `death_bomb` ability.
    *   Updated `src/core/config/schemas/enemySchema.ts`:
        *   Added `bomber_dive` to `movementPattern` enum.
        *   Used `z.discriminatedUnion` to define specific ability schemas (`healAuraAbilitySchema`, `spawnMinionsAbilitySchema`, `deathBombAbilitySchema`).
    *   Added `ENEMY_HEXAGON_BOMBER_KEY` to `src/core/constants/assets.ts`.
    *   Updated `src/phaser/scenes/GameScene.ts`:
        *   Added loading for `hexagon_enemy.png` in `preload()`.
        *   Included `hexagon_bomber` in the temporary `spawnRandomEnemy()` pool.
    *   Updated `src/phaser/handlers/GameSceneEventHandler.ts`:
        *   Mapped `hexagon_bomber` ID to `ENEMY_HEXAGON_BOMBER_KEY` in `handleEnemySpawned()`.
        *   Modified `handleEnemyDestroyed()` to check for `death_bomb` ability in the destroyed enemy's config and emit `SPAWN_PROJECTILE` if found.
    *   Updated `src/phaser/entities/EnemyEntity.ts`:
        *   Implemented `bomber_dive` movement logic in `handleMovement()`.
*   **ESLint Fixes:**
    *   Fixed unused `delta` parameter warnings in `EnemyEntity.ts` (`handleShooting`, `handleMovement`) by prefixing with `_`.
    *   Removed unused `ProjectileManager` import from `GameSceneEventHandler.ts`.
    *   Removed unused `Types`, `WeaponConfig`, `PlayerState`, and event data interfaces from `GameScene.ts`.
    *   Ran `eslint --fix` to correct formatting issues.
*   **Refactor GameScene (Line Limit):**
    *   Identified `src/phaser/scenes/GameScene.ts` exceeded the 300-line limit.
    *   Created `src/phaser/handlers/GameSceneCollisionHandler.ts` and moved collision logic (`handlePlayerEnemyCollision`, `handleProjectileEnemyCollision`, `handlePlayerProjectileCollision`) into it.
    *   Created `src/phaser/handlers/GameSceneEventHandler.ts` and moved event handling logic (e.g., `handlePlayerStateUpdate`, `handleProjectileCreated`, `handleEnemySpawned`, `handlePlayerDied`, etc.) into it.
    *   Updated `GameScene.ts` to instantiate and delegate to these new handler classes.
    *   Reduced `GameScene.ts` line count to 239 lines, complying with the project standard.
*   **M3 - Enemy Aiming:**
    *   Updated `GameScene.handleEnemyRequestFire` to calculate the angle between the enemy and the player sprite.
    *   Used `Phaser.Math.Angle.Between` and `this.physics.velocityFromAngle` to determine the correct `velocityX` and `velocityY` for the projectile.
    *   Projectiles now fire towards the player's current position when the enemy fires.
    *   Includes a fallback to fire straight down if the player sprite is inactive.
*   **M3 - Boss Weaving Pattern:**
    *   Implemented the `boss_weaving` movement pattern in `EnemyEntity.handleMovement`.
    *   Uses `Math.sin(time * frequency)` to calculate horizontal velocity, creating a weaving effect.
    *   Maintains the slower downward movement specific to the boss pattern.
*   **M3 - Enemy Movement & Firing (Basic):**
    *   Implemented basic movement patterns (`invader_standard`, `invader_support`, `boss_weaving` *placeholder initially*) in `EnemyEntity.preUpdate` based on `enemyConfig.movementPattern`. Standard invaders move side-to-side with downward drift.
    *   Added `ENEMY_REQUEST_FIRE` event constant.
    *   Added shooting cooldown logic (`shootCooldownTimer`) to `EnemyEntity`.
    *   Updated `EnemyEntity.preUpdate` to check `canShoot`, manage cooldown, and emit `ENEMY_REQUEST_FIRE` with position and `shootConfig`.
    *   Added `owner: 'player' | 'enemy'` property to `SpawnProjectileData` and `ProjectileLike` interfaces in `ProjectileManager`.
    *   Updated `ProjectileManager.spawnProjectile` to store `owner` and include it in the `PROJECTILE_CREATED` event payload. Added `getProjectileOwner` method.
    *   Added `PLAYER_HIT_PROJECTILE` event constant.
    *   Updated `GameScene`:
        *   Defined `EnemyRequestFireData`, `ProjectileCreatedData` (updated), `PlayerHitProjectileData` interfaces.
        *   Subscribed to `ENEMY_REQUEST_FIRE` event.
        *   Implemented `handleEnemyRequestFire` to listen for enemy fire requests and emit `SPAWN_PROJECTILE` with `owner: 'enemy'`.
        *   Updated `handleProjectileCreated` to use `ProjectileCreatedData` interface and optionally tint enemy projectiles.
        *   Updated `handleRequestFireWeapon` (player firing) to emit `SPAWN_PROJECTILE` with `owner: 'player'`.
        *   Added `physics.overlap` check for `playerSprite` vs `projectileGroup`.
        *   Implemented `handlePlayerProjectileCollision` to handle player being hit by enemy projectiles (checks owner, gets damage, emits `PLAYER_HIT_PROJECTILE`).
        *   Updated `handleProjectileEnemyCollision` to check projectile owner, ensuring only player projectiles damage enemies.
    *   Updated `PlayerManager`:
        *   Defined `PlayerHitProjectileData` interface.
        *   Subscribed to `PLAYER_HIT_PROJECTILE` event.
        *   Implemented `handlePlayerHitProjectile` to apply damage to player health when hit by an enemy projectile.
*   **M2 - Refine Destruction & Death:**
    *   Updated `EnemyEntity.destroySelf()` to add a tween effect (flash red, shrink, rotate) before destroying the sprite.
    *   Updated `GameScene.handlePlayerDied()` to add a tween effect (fade out, shrink, rotate, tint red) to the player sprite before displaying the "GAME OVER" text (with a slight delay).
*   **M2 - Replace Placeholder Assets:**
    *   Created `src/core/constants/assets.ts` to define keys for player (`PLAYER_KEY`), bullet (`BULLET_KEY`), and small alien (`ENEMY_SMALL_ALIEN_KEY`).
    *   Updated `GameScene.ts`:
        *   Imported asset constants from `src/core/constants/assets.ts`.
        *   Removed old local asset key constants.
        *   Updated `preload()` to load actual images (`player_ship.png`, `bullet.png`, `alien_small.png`) using the imported constants.
        *   Updated player sprite creation in `create()` to use `PLAYER_KEY`.
        *   Updated projectile sprite creation in `handleProjectileCreated()` to use `BULLET_KEY`.
        *   Updated enemy entity creation in `handleEnemySpawned()` to use `ENEMY_SMALL_ALIEN_KEY` (with a TODO for proper mapping based on config ID).
*   **M2 - Map Enemy Sprites & Add Destruction Sound:**
    *   Added `ENEMY_MEDIUM_ALIEN_KEY`, `ENEMY_LARGE_METEOR_KEY`, `AUDIO_EXPLOSION_SMALL_KEY` to `src/core/constants/assets.ts`.
    *   Updated `GameScene.preload()` to load corresponding images (`alien_medium.png`, `meteor_large.png`) and audio (`explosion_small.ogg`).
    *   Updated `GameScene.handleEnemySpawned()` to map enemy config IDs (`triangle_scout`, `square_tank`, `pentagon_healer`, `circle_boss`) to the correct asset keys (`ENEMY_SMALL_ALIEN_KEY`, `ENEMY_MEDIUM_ALIEN_KEY`, `ENEMY_LARGE_METEOR_KEY`).
    *   Updated `GameScene.handleEnemyDestroyed()` to play `AUDIO_EXPLOSION_SMALL_KEY` sound effect.
*   **M2 - Load Core Values from Config:**
    *   Created `playerSchema.ts` and `config/player.yml`.
    *   Updated `ConfigLoader.ts` to load and validate `player.yml`.
    *   Updated `PlayerManager.ts` to accept `PlayerConfig` and initialize `health` and `moveSpeed` from it.
    *   Updated `GameScene.ts` to pass `PlayerConfig` to `PlayerManager`.
    *   Updated `weaponSchema.ts` to include `projectileSpeed`.
    *   Updated `config/weapons.yml` to include `projectileSpeed` for the `bullet` weapon.
    *   Updated `WeaponManager.ts` to load `WeaponsConfig`, find the initial weapon config (`bullet`), and use `baseCooldownMs` and `projectileSpeed` from it. Added `baseDamage` to `SPAWN_PROJECTILE` event.
    *   Updated `ProjectileManager.ts` interfaces (`SpawnProjectileData`, `ProjectileLike`) and `spawnProjectile` method to handle optional `damage`. Added `getProjectileDamage` method.
    *   Updated `GameScene.ts` (`handleProjectileEnemyCollision`) to get damage via `projectileManager.getProjectileDamage` and include it in the `PROJECTILE_HIT_ENEMY` event.
    *   Updated `EnemyManager.ts` (`ProjectileHitEnemyData` interface and `handleProjectileHitEnemy` method) to use damage from the event payload.
    *   Updated `enemySchema.ts` to include `collisionDamage`.
    *   Updated `config/enemies.yml` to include `collisionDamage` for all enemy types.
    *   Made `EnemyEntity.enemyConfig` public to allow access from `GameScene`.
    *   Updated `GameScene.ts` (`handlePlayerEnemyCollision`) to use `enemyEntity.enemyConfig.collisionDamage` for the `PLAYER_HIT_ENEMY` event.
*   **M2 - Refactor Projectile Spawning:**
    *   Added `REQUEST_FIRE_WEAPON` event constant.
    *   Removed player position tracking from `WeaponManager`.
    *   Updated `WeaponManager` (`attemptFire`) to emit `REQUEST_FIRE_WEAPON` with `weaponConfig` instead of `SPAWN_PROJECTILE`.
    *   Added `handleRequestFireWeapon` method to `GameScene` to listen for `REQUEST_FIRE_WEAPON`.
    *   Updated `GameScene` (`handleRequestFireWeapon`) to calculate spawn position using `playerSprite.getTopCenter()` and emit `SPAWN_PROJECTILE` with full details (including damage).
*   **M2 - Implement Weapon Switching:**
    *   Added `WEAPON_SWITCH` event constant.
    *   Updated `InputManager` (`handleKeyDown`) to emit `WEAPON_SWITCH` with weapon IDs ('bullet', 'laser', 'slow_field') for keys '1', '2', '3'.
    *   Updated `WeaponManager` to listen for `WEAPON_SWITCH`, find the new weapon config, update `currentWeaponId`, `currentWeaponConfig`, `weaponCooldown`, and reset `cooldownTimer`.
*   **M2 - Add Non-functional UI Buttons:**
    *   Added placeholder Text objects for weapon buttons ([1], [2], [3]) in `UIScene.ts`.
*   **M2 - Enemy Spawning & Collisions:** (Previous changes)
    *   Verified enemy configuration (`config/enemies.yml`) and schema (`EnemySchema`).
    *   Created `EnemyManager` to load configs, manage enemy state (health - *now loaded from config*), handle spawning (`spawnEnemy`), damage (`handleDamage` - *now uses damage from event*), and destruction (`destroyEnemy`). Emits `ENEMY_SPAWNED`, `ENEMY_DESTROYED`, `ENEMY_HEALTH_UPDATED`. Listens for `PROJECTILE_HIT_ENEMY`.
    *   Created placeholder `EnemyEntity` extending `Phaser.Physics.Arcade.Sprite` in `src/phaser/entities/`. Stores instance/config IDs, sets collision radius, basic velocity, and includes `takeDamage` (visual only) and `destroySelf` methods. *Made `enemyConfig` public.*
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
*   **Fix Config Loading Order:**
    *   Modified `src/main.ts` to wrap game initialization in an `async` function.
    *   Added `await configLoader.loadAllConfigs()` before `new Phaser.Game(config)` to ensure configurations are loaded before scenes and managers are created.
    *   Added basic error handling in `main.ts` if config loading fails.
*   **M3 - Implement Death Bomb Ability:**
    *   Added `PROJECTILE_DEATH_BOMB_KEY` constant to `src/core/constants/assets.ts`.
    *   Updated `EnemyManager` to include the full `EnemyConfig` in the `ENEMY_DESTROYED` event payload (`EnemyDestroyedData` interface added).
    *   Updated `GameSceneEventHandler.handleEnemyDestroyed` to use the config from the event, check for `death_bomb` ability, and emit `SPAWN_PROJECTILE` with bomb details (type, damage, radius, timeToExplodeMs). Added default values for radius and time.
    *   Updated `GameSceneEventHandler.handleProjectileCreated` to map the `enemy_bomb` projectile type to the `PROJECTILE_DEATH_BOMB_KEY` texture.
    *   Updated `GameScene.preload` to load the `death_bomb.png` asset (using `PROJECTILE_DEATH_BOMB_KEY`).
    *   Added `PROJECTILE_EXPLODE` event constant to `src/core/constants/events.ts`.
    *   Updated `ProjectileManager`:
        *   Added `ProjectileExplodeData` interface.
        *   Added optional `radius` and `timeToExplodeMs` to `SpawnProjectileData` and `ProjectileLike` interfaces.
        *   Updated `spawnProjectile` to store these optional properties.
        *   Updated `update` loop to check for and decrement `timeToExplodeMs`.
        *   Added `triggerExplosion` method to emit `PROJECTILE_EXPLODE` event and remove the projectile state.
    *   Updated `src/core/config/schemas/enemySchema.ts`: Added optional `timeToExplodeMs` to `deathBombAbilitySchema` (removed `.default()` to fix TS error).
    *   Updated `GameSceneCollisionHandler`:
        *   Added `ProjectileExplodeData` interface definition.
        *   Added listener for `PROJECTILE_EXPLODE` event.
        *   Implemented `handleProjectileExplode` method to find overlapping enemies and player within the explosion radius using `physics.overlapCirc` and emit `PROJECTILE_HIT_ENEMY` or `PLAYER_HIT_PROJECTILE` events respectively. Added a simple tweening circle visual effect for the explosion.
        *   Added `destroy` method to clean up listener.
*   **M3 - Add Distinct Enemy Projectile Graphics:**
    *   Added constants for `PROJECTILE_ENEMY_BULLET_KEY`, `PROJECTILE_ENEMY_BULLET_FAST_KEY`, `PROJECTILE_ENEMY_LASER_KEY` to `src/core/constants/assets.ts`.
    *   Updated `GameScene.preload` to load corresponding placeholder assets (`enemy_bullet.png`, `enemy_bullet_fast.png`, `enemy_laser.png`).
    *   Updated `GameSceneEventHandler.handleProjectileCreated` to use the correct asset key based on the projectile type (`enemy_bullet`, `enemy_bullet_fast`, `enemy_laser`) specified in the `SPAWN_PROJECTILE` event data. Removed default tinting for enemy projectiles.
    *   Fixed syntax error in `GameSceneEventHandler.ts` caused by misplaced closing brace.
*   **Fix Config Loading/Validation Errors:**
    *   Changed `EnemyManager` to export class instead of singleton instance. Updated imports and instantiation in `GameScene` and `GameSceneCollisionHandler`.
    *   Made `projectileSpeed` optional in `weaponSchema` and handled `undefined` case in `GameSceneEventHandler` to fix validation error for `weapons.yml`.
*   **M3 - Add Player Invulnerability:**
    *   Added `isInvulnerable` state and `invulnerabilityTimer` to `PlayerManager`.
    *   Added `PLAYER_INVULNERABILITY_START` and `PLAYER_INVULNERABILITY_END` event constants.
    *   Updated `PlayerManager` hit handlers to check/set invulnerability and emit start event.
    *   Updated `PlayerManager.update` to handle timer countdown and emit end event.
    *   Updated `PlayerManager.emitStateUpdate` to include `isInvulnerable` state.
    *   Updated `GameSceneEventHandler` to listen for invulnerability events and apply/remove a blinking tween effect on the player sprite. Added `playerInvulnerabilityTween` property and updated `destroy` method.

**Next Steps (Milestone M4 - Rozbudowa Broni i UI):**
*   **Weapon Upgrades:**
    *   ~~Implement UI elements for displaying current weapon level and upgrade cost.~~ *(Done)*
    *   ~~Add input handling (e.g., key press or UI button click) to trigger weapon upgrades.~~ *(Done - 'U' key)*
    *   ~~Update `WeaponManager` to handle upgrade requests:~~ *(Done)*
        *   ~~Check if player has enough currency (via `EconomyManager`).~~ *(Done)*
        *   ~~If affordable, deduct cost and apply upgrades based on `weaponConfig.upgrade` properties (damage, cooldown, range, etc.).~~ *(Done - Cooldown applied, TODO: Apply other stats)*
        *   ~~Emit events to update UI (e.g., `WEAPON_UPGRADED`, `CURRENCY_UPDATED`).~~ *(Done - `WEAPON_STATE_UPDATED` emitted)*
*   **UI Enhancements:**
    *   ~~Make weapon selection buttons functional (emit `WEAPON_SWITCH` event).~~ *(Done)*
    *   ~~Display current weapon name/level.~~ *(Done)*
    *   ~~Display player health (e.g., health bar).~~ *(Done)*
    *   ~~Display current wave number/score.~~ *(Done - Score & Wave implemented)*
    *   ~~Display current wave number.~~ *(Done)*
    *   ~~Apply other weapon upgrades (damage, range, etc.) in `WeaponManager.handleWeaponUpgradeRequest`.~~ *(Done - Damage & Speed)*

*(Deferred M3 Tasks: Add more enemy types/assets, implement difficulty scaling, consider enemy invulnerability)*
*(Deferred M4 Tasks: Apply range upgrades - requires changes in ProjectileManager/EventHandler)*

**Important Patterns & Preferences:**
    *   ~~Refine movement patterns: Implement actual `boss_weaving` (e.g., sine wave)~~ *(Done)*, ~~implement `bomber_dive`~~ *(Done)*, potentially add `'homing'` or other patterns from config. Update `EnemyEntity.preUpdate`.
    *   ~~Implement enemy aiming logic (e.g., fire towards player) in `GameScene.handleEnemyRequestFire`~~ *(Done)*.
    *   ~~Add `hexagon_bomber` enemy type~~ *(Done)*. Add *more* enemy types to `config/enemies.yml` and corresponding assets (`assets/images`, `constants/assets.ts`). Update `GameSceneEventHandler.handleEnemySpawned` mapping.
    *   ~~Implement `death_bomb` projectile logic (visuals, collision)~~ *(Done - Core logic implemented)*.
    *   ~~Add distinct projectile graphics/types for enemies (e.g., `enemy_laser`, `enemy_bullet_fast`)~~ *(Done - Graphics loaded and mapped)*.
*   **Difficulty Scaling:**
    *   Implement logic based on `config/difficulty.yml` to control enemy spawn rates, health multipliers, speed multipliers, etc., possibly based on score or time. Update `EnemyManager` and potentially `GameScene` spawner.
*   **Collision Refinement:**
    *   Review and refine collision layers/groups if needed for more complex interactions (e.g., different projectile types vs. enemy types).
    *   ~~Consider adding brief invulnerability periods after hits (player and/or enemies). Update `PlayerManager` / `EnemyManager`.~~ *(Done for Player)*. Consider for enemies?
*   **Visual Polish:**
    *   Add more distinct visual effects for different enemy destructions.
    *   Add visual effect for death bomb explosion in `GameSceneCollisionHandler.handleProjectileExplode`.
    *   Improve player death sequence (e.g., explosion animation).
    *   Add visual feedback for weapon switching in the UI.

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

**Active Decisions & Considerations:**
*   Repository name: `MathInvasion_v2` (Public).
*   Using Vite with Vanilla TS template as base.
*   Enemies are instantly destroyed on collision with the player (placeholder behavior - uses 9999 damage in `GameScene`).
*   ~~Damage values are currently hardcoded placeholders (e.g., 10 damage in `EnemyManager`, 10 collision damage in `GameScene`).~~ (Fixed - loaded from config)
*   ~~Using placeholder graphics (Vite logo) for player, bullets, and enemies.~~ (Fixed - actual assets loaded)
*   ~~Enemy sprites in `GameScene` currently default to `ENEMY_SMALL_ALIEN_KEY` regardless of the enemy type spawned by `EnemyManager`. Needs mapping based on config ID.~~ (Fixed - Mapped in `handleEnemySpawned`)
