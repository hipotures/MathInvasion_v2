# Active Context: Math Invasion v2

**Current Focus:** Milestone M7 - Balans, Testy, Optymalizacja i CI/CD

**Recent Changes (M7 - Initial Balancing):**
*   Reviewed `config/difficulty.yml`, `config/enemies.yml`, `config/weapons.yml`, `config/powerups.yml`.
*   Adjusted `config/difficulty.yml`:
    *   Reduced `enemyHealthMultiplierPerWave` from `1.08` to `1.06`.
    *   Added `diamond_strafer` unlock at wave 10.
    *   Added `hexagon_bomber` unlock at wave 12.
    *   Shifted `pentagon_healer` unlock from wave 15 to wave 15 (no change, just reordered).

**Recent Changes (M6 - PWA Setup & Destruction Effects):**
*   **PWA Setup:**
    *   Installed `vite-plugin-pwa` and `workbox-window` dev dependencies.
    *   Created `vite.config.ts` and configured `VitePWA` plugin:
        *   Uses `generateSW` strategy for automatic service worker creation.
        *   Configured Workbox `globPatterns` to cache essential assets (JS, CSS, HTML, images, audio, YAML).
        *   Set `registerType: 'autoUpdate'` and `injectRegister: false`.
        *   Included manifest details from `public/manifest.json`.
    *   Updated `src/main.ts` to import and call `registerSW({ immediate: true })` from `virtual:pwa-register` to handle service worker registration.
    *   Updated `src/vite-env.d.ts` to include `/// <reference types="vite-plugin-pwa/client" />` to resolve TypeScript errors for the virtual module.
    *   Fixed syntax errors in `src/core/managers/EnemyManager.ts` (duplicated config loading, missing constructor brace) that occurred during related file saves.
*   **Distinct Enemy Destruction Effects:**
    *   Added `REQUEST_ENEMY_DESTRUCTION_EFFECT` event constant to `src/core/constants/events.ts`.
    *   Modified `EnemyEntity.destroySelf` (`src/phaser/entities/EnemyEntity.ts`):
        *   Removed the generic tween effect.
        *   Added emission of `REQUEST_ENEMY_DESTRUCTION_EFFECT` with `configId`, `x`, and `y`.
        *   Now destroys the sprite immediately after emitting the event.
    *   Modified `EnemyEventHandler.handleEnemyDestroyed` (`src/phaser/handlers/event/EnemyEventHandler.ts`):
        *   Removed the generic `AUDIO_EXPLOSION_SMALL_KEY` sound playback.
    *   Updated `GameSceneEventHandler` (`src/phaser/handlers/GameSceneEventHandler.ts`):
        *   Added listener for `REQUEST_ENEMY_DESTRUCTION_EFFECT`.
        *   Implemented `handleEnemyDestructionEffect` method:
            *   Plays `AUDIO_EXPLOSION_SMALL_KEY` (placeholder, can be customized later).
            *   Uses a `switch` statement on `configId` to apply different placeholder visual effects (simple circle tweens) for standard enemies and the boss.
        *   Added unregistration for the new listener in the `destroy` method.

**Recent Changes (M6 - Difficulty Scaling & Visual Polish - Previous):**
*   **Difficulty Configuration Loading:**
*   **Difficulty Configuration Loading:**
    *   Verified `ConfigLoader.ts` already loads `config/difficulty.yml` and `difficultySchema.ts`.
*   **EnemyManager Difficulty Integration (`src/core/managers/EnemyManager.ts`):**
    *   Imported `DifficultyConfig`.
    *   Added `difficultyConfig` property and loaded it in the constructor.
    *   Initialized `currentWave` based on `difficultyConfig.initialWaveNumber`.
    *   Added scaling helper methods: `getWaveMultiplier`, `getScaledHealth`, `getScaledSpeedMultiplier`, `getScaledReward`, `getScaledEnemyCount`.
    *   Updated `spawnEnemy` to:
        *   Calculate and store scaled health (`newEnemy.health`).
        *   Calculate speed multiplier.
        *   Emit `ENEMY_SPAWNED` event with scaled `initialHealth`, `maxHealth`, and `speedMultiplier`.
    *   Updated `destroyEnemy` to calculate and emit scaled reward in `ENEMY_DESTROYED` event.
    *   Updated `handleDamage` to emit scaled max health in `ENEMY_HEALTH_UPDATED` event.
    *   Added `waveTimer` property for scheduling wave spawns.
    *   Added `availableEnemyTypes` property and `updateAvailableEnemyTypes` method to manage enemy unlocks based on `difficultyConfig.waveEnemyTypeUnlock`.
    *   Updated `advanceWave` to:
        *   Increment `currentWave`.
        *   Call `updateAvailableEnemyTypes`.
        *   Emit `WAVE_UPDATED`.
        *   Schedule the next `spawnWave` call using `setTimeout` based on `difficultyConfig.timeBetweenWavesSec`.
        *   Clear previous timer if exists.
    *   Added `spawnWave` method (placeholder logic):
        *   Calculates scaled enemy count.
        *   Checks for boss wave based on `difficultyConfig.bossWaveFrequency`.
        *   Spawns boss (`difficultyConfig.bossId`) or regular enemies (randomly chosen from `availableEnemyTypes`) using placeholder positions.
        *   ~~Includes TODOs for implementing actual spawn patterns and wave clear conditions.~~ *(Grid pattern and wave clear implemented)*
    *   Updated `destroy` method to clear the `waveClearTimer`.
    *   Implemented `standard_grid` spawn pattern logic in `spawnWave`, replacing random spawning.
    *   Implemented wave clearing condition:
        *   Added `isWaveActive` flag and `enemiesInCurrentWave` set to track enemies.
        *   Updated `spawnEnemy` to add enemies to the set.
        *   Updated `destroyEnemy` to remove enemies from the set and check if the wave is clear (`enemiesInCurrentWave.size === 0`).
        *   If wave is clear, schedule `advanceWave` after `timeBetweenWavesSec` using `waveClearTimer`.
        *   Modified `advanceWave` to spawn the wave directly and clear any pending `waveClearTimer`.
*   **Refactor EnemyManager (Line Limit):**
    *   Identified `src/core/managers/EnemyManager.ts` exceeded 300 lines after M6 implementations.
    *   Created helper class `src/core/managers/helpers/EnemyWaveHandler.ts`.
    *   Moved wave management logic (wave progression, enemy scaling, spawn patterns, wave clearing) from `EnemyManager` to `EnemyWaveHandler`.
    *   Updated `EnemyManager` to instantiate and delegate wave/scaling tasks to `EnemyWaveHandler`.
*   **EnemyEventHandler Update (`src/phaser/handlers/event/EnemyEventHandler.ts`):**
    *   Defined `EnemySpawnedData` interface matching the event payload (including `maxHealth`, `speedMultiplier`).
    *   Updated `handleEnemySpawned` to accept `EnemySpawnedData` and pass `maxHealth` and `speedMultiplier` to the `EnemyEntity` constructor.
    *   Updated `handleEnemyHealthUpdate` signature to expect `maxHealth` in the payload and pass it to `enemyEntity.takeDamage`.
*   **EnemyEntity Update (`src/phaser/entities/EnemyEntity.ts`):**
    *   Added `maxHealth` and `speedMultiplier` properties.
    *   Updated constructor to accept and store `maxHealth` and `speedMultiplier`.
    *   Applied `speedMultiplier` to initial velocity calculation in constructor.
    *   Updated `takeDamage` method to accept optional `maxHealth` parameter for UI updates.
    *   Updated `handleMovement` method to apply the stored `speedMultiplier` to the `baseSpeed` for all movement pattern calculations.

**Recent Changes (M5 - Power-ups):**
*   **Powerup System Core:**
    *   Added powerup event constants (`REQUEST_SPAWN_POWERUP`, `POWERUP_SPAWNED`, `POWERUP_COLLECTED`, `POWERUP_EXPIRED`, `POWERUP_EFFECT_APPLIED`, `POWERUP_EFFECT_REMOVED`) to `src/core/constants/events.ts`.
    *   Created `src/core/managers/PowerupManager.ts`:
        *   Loads powerup configurations (`config/powerups.yml`).
        *   Listens for `REQUEST_SPAWN_POWERUP`.
        *   Randomly selects a powerup to spawn from the available configurations.
        *   Emits `POWERUP_SPAWNED` with instance ID, config details, position, and visual key.
        *   Listens for `POWERUP_COLLECTED`.
        *   Manages active powerup effects and their timers (`activeEffects` map).
        *   Emits `POWERUP_EFFECT_APPLIED` when a powerup is collected.
        *   Emits `POWERUP_EFFECT_REMOVED` and `POWERUP_EXPIRED` when a timer runs out.
    *   Integrated `PowerupManager` into `src/phaser/scenes/GameScene.ts`:
        *   Instantiated `PowerupManager`.
        *   Added `powerupGroup` (Phaser Group) and `powerupSprites` (Map).
        *   Loaded powerup assets (`powerup_shield.png`, `powerup_rapid.png`) and sounds (`powerup_appear.ogg`, `powerup_get.ogg`) in `preload()`. Added corresponding constants to `src/core/constants/assets.ts`.
        *   Passed `powerupGroup` and `powerupSprites` to `GameSceneCollisionHandler` and `GameSceneEventHandler` constructors.
        *   Added `powerupManager.update()` call to `GameScene.update()`.
        *   Added `powerupManager.destroy()` call to `GameScene` shutdown cleanup.
*   **Powerup Spawning & Visuals:**
    *   Updated `src/phaser/handlers/event/EnemyEventHandler.ts`:
        *   Imported powerup configs and `REQUEST_SPAWN_POWERUP` event data type.
        *   Added `trySpawnPowerup` helper method called in `handleEnemyDestroyed`.
        *   `trySpawnPowerup` iterates through `powerups.yml`, checks `dropChance` against `Math.random()`, and emits `REQUEST_SPAWN_POWERUP` if successful (limits to one drop per enemy).
    *   Updated `src/phaser/handlers/GameSceneEventHandler.ts`:
        *   Updated constructor to accept `powerupGroup` and `powerupSprites`.
        *   Added listener for `POWERUP_SPAWNED`.
        *   Implemented `handlePowerupSpawned` method:
            *   Maps powerup visual key (`shield_icon`, `rapid_fire_icon`) to asset key (`POWERUP_SHIELD_KEY`, `POWERUP_RAPID_FIRE_KEY`).
            *   Creates the powerup sprite using `physics.add.sprite`.
            *   Adds sprite to `powerupGroup` and `powerupSprites` map.
            *   Gives sprite downward velocity and a rotation tween.
            *   Plays `AUDIO_POWERUP_APPEAR_KEY` sound.
        *   Updated `destroy` method to unregister listener.
*   **Powerup Collection:**
    *   Updated `src/phaser/handlers/GameSceneCollisionHandler.ts`:
        *   Updated constructor to accept `powerupGroup` and `powerupSprites`.
        *   Added `handlePlayerPowerupCollision` method.
        *   Added `physics.overlap` check between `playerSprite` and `powerupGroup` in `GameScene.setupCollisions`.
        *   `handlePlayerPowerupCollision` identifies the collected powerup sprite, finds its instance ID from the map, emits `POWERUP_COLLECTED`, destroys the sprite, removes it from the map, and plays `AUDIO_POWERUP_GET_KEY` sound.
*   **Powerup Effects Implementation:**
    *   **Shield (Temporary Invulnerability):**
        *   Updated `src/core/managers/PlayerManager.ts`:
            *   Added `isShieldPowerupActive` state variable.
            *   Added listeners for `POWERUP_EFFECT_APPLIED` and `POWERUP_EFFECT_REMOVED`.
            *   Implemented handlers (`handlePowerupEffectApplied`, `handlePowerupEffectRemoved`) to set/unset `isShieldPowerupActive` based on `temporary_invulnerability` effect.
            *   Modified damage handlers (`handlePlayerHitEnemy`, `handlePlayerHitProjectile`) to check `isShieldPowerupActive` in addition to post-hit `isInvulnerable`.
            *   Modified `emitStateUpdate` to emit `isEffectivelyInvulnerable` (combined state).
            *   Updated `destroy` to unregister listeners.
    *   **Rapid Fire (Cooldown Reduction):**
        *   Updated `src/core/managers/WeaponManager.ts`:
            *   Added `isRapidFireActive` and `rapidFireMultiplier` state variables.
            *   Added listeners for `POWERUP_EFFECT_APPLIED` and `POWERUP_EFFECT_REMOVED`.
            *   Implemented handlers (`handlePowerupEffectApplied`, `handlePowerupEffectRemoved`) to set/unset `isRapidFireActive` and `rapidFireMultiplier` based on `weapon_cooldown_reduction` effect.
            *   Modified `attemptFire` to multiply `weaponCooldown` by `rapidFireMultiplier` when setting `cooldownTimer`.
            *   Updated `destroy` to unregister listeners.
    *   **Cash Boost (Currency Multiplier):**
        *   Updated `src/core/managers/EconomyManager.ts`:
            *   Added `isCashBoostActive` and `cashBoostMultiplier` state variables.
            *   Added listeners for `POWERUP_EFFECT_APPLIED` and `POWERUP_EFFECT_REMOVED`.
            *   Implemented handlers (`handlePowerupEffectApplied`, `handlePowerupEffectRemoved`) to set/unset `isCashBoostActive` and `cashBoostMultiplier` based on `currency_multiplier` effect.
            *   Modified `handleEnemyDestroyed` to multiply the base `reward` by `cashBoostMultiplier` before calling `addCurrency`.
            *   Updated `destroy` to unregister listeners.

**Recent Changes (Refactoring - Previous):**
*   **Refactor WeaponManager (Line Limit):**
    *   Identified `src/core/managers/WeaponManager.ts` (297 lines) was approaching the 300-line limit.
    *   Created helper class `src/core/managers/helpers/WeaponUpgrader.ts`.
    *   Moved weapon upgrade calculation and application logic from `WeaponManager.handleWeaponUpgradeRequest` to `WeaponUpgrader.attemptUpgrade`.
    *   Updated `WeaponManager` to instantiate and delegate to `WeaponUpgrader`.
*   **Refactor GameSceneCollisionHandler (Line Limit):**
    *   Identified `src/phaser/handlers/GameSceneCollisionHandler.ts` exceeded 300 lines after M5 powerup implementation.
    *   Created `src/phaser/handlers/GameSceneAreaEffectHandler.ts`.
    *   Moved projectile explosion logic (`handleProjectileExplode`) from `GameSceneCollisionHandler` to `GameSceneAreaEffectHandler`.
    *   Updated `GameScene.ts` to instantiate and manage `GameSceneAreaEffectHandler`.
*   **Refactor WeaponManager (Powerups):**
    *   Created `src/core/managers/helpers/WeaponPowerupHandler.ts`.
    *   Moved rapid fire powerup logic from `WeaponManager` to `WeaponPowerupHandler`.
    *   Updated `WeaponManager` to instantiate and delegate to `WeaponPowerupHandler`.
*   **Refactor PlayerManager (Powerups):**
    *   Created `src/core/managers/helpers/PlayerPowerupHandler.ts`.
    *   Moved shield powerup logic from `PlayerManager` to `PlayerPowerupHandler`.
    *   Updated `PlayerManager` to instantiate and delegate to `PlayerPowerupHandler`.
*   **Refactor GameScene (Initialization):**
    *   Created `src/phaser/initializers/GameSceneManagerInitializer.ts`.
    *   Moved core manager instantiation logic from `GameScene.initializeManagers` to `initializeGameManagers` function.
    *   Updated `GameScene.ts` to import and use the initializer function.

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

**Next Steps (Milestone M7 - Balans, Testy, Optymalizacja i CI/CD):**
*   **Balancing:**
    *   Review and adjust values in `config/*.yml` (enemy health/speed/reward/score, weapon damage/cooldown/cost, powerup duration/effects, difficulty scaling) based on playtesting.
    *   Fine-tune enemy spawn patterns and wave composition.
    *   Adjust powerup drop rates.
*   **Testing:**
    *   Implement unit tests (Vitest/Jest) for core managers and utility functions.
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

**Recent Changes (M6 - Visual Polish):**
*   **Death Bomb Explosion:** Enhanced visual effect in `GameSceneAreaEffectHandler.handleProjectileExplode` using expanding/fading core (white) and ring (orange) tweens.
*   **Player Death Sequence:** Improved in `PlayerEventHandler.handlePlayerDied` by adding `AUDIO_EXPLOSION_SMALL_KEY` sound and a visual explosion effect (yellow ring, white core) centered on the player.
*   **Weapon Switch Feedback:** Added a brief scaling tween animation to the newly selected weapon button in `UIScene.handleWeaponStateUpdate` for better visual indication.

**Important Patterns & Preferences:**
    *   ~~Refine movement patterns: Implement actual `boss_weaving` (e.g., sine wave)~~ *(Done)*, ~~implement `bomber_dive`~~ *(Done)*, potentially add `'homing'` or other patterns from config. Update `EnemyEntity.preUpdate`.
    *   ~~Implement enemy aiming logic (e.g., fire towards player) in `GameScene.handleEnemyRequestFire`~~ *(Done)*.
    *   ~~Add `hexagon_bomber` enemy type~~ *(Done)*. Add *more* enemy types to `config/enemies.yml` and corresponding assets (`assets/images`, `constants/assets.ts`). Update `GameSceneEventHandler.handleEnemySpawned` mapping.
    *   ~~Implement `death_bomb` projectile logic (visuals, collision)~~ *(Done - Core logic implemented)*.
    *   ~~Add distinct projectile graphics/types for enemies (e.g., `enemy_laser`, `enemy_bullet_fast`)~~ *(Done - Graphics loaded and mapped)*.
*   **Difficulty Scaling:** *(Core logic implemented in EnemyManager)*
    *   ~~Implement actual spawn pattern logic (e.g., `standard_grid`) in `EnemyManager.spawnWave` or a dedicated spawner, replacing placeholder random spawning.~~ *(Done - Basic grid implemented)*
    *   ~~Implement wave clearing condition (e.g., check `this.enemiesInCurrentWave.size === 0` before calling `advanceWave` again, instead of relying solely on timer).~~ *(Done)*
*   **Collision Refinement:**
    *   Review and refine collision layers/groups if needed.
    *   ~~Consider adding brief invulnerability periods after hits (player and/or enemies). Update `PlayerManager` / `EnemyManager`.~~ *(Done for Player)*. Consider for enemies?
*   **Visual Polish:**
    *   Add more distinct visual effects for different enemy destructions.
    *   ~~Add visual effect for death bomb explosion in `GameSceneAreaEffectHandler.handleProjectileExplode`.~~ *(Done - Enhanced existing effect)*
    *   ~~Improve player death sequence (e.g., explosion animation).~~ *(Done - Added sound and visual)*
    *   ~~Add visual feedback for weapon switching in the UI.~~ *(Done - Added tween)*

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
