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
*   **Facade (Implicit):** Core managers (`PlayerManager`, `EnemyManager`, `WeaponManager`, `PowerupManager`, etc.) provide simplified interfaces over more complex internal state and logic. Helper classes (`WeaponUpgrader`, `WeaponPowerupHandler`, `PlayerPowerupHandler`) further encapsulate specific logic within managers.
*   **Dependency Injection (Manual):** Dependencies like `EventBus`, `Logger`, `EconomyManager`, and configurations are passed into constructors (e.g., `WeaponManager`, `GameScene` handlers, `PowerupManager`, helper classes). `GameSceneManagerInitializer` centralizes manager instantiation and injection for `GameScene`.

**Component Relationships:**
*   **Powerup Flow:**
    1.  `EnemyEventHandler` (`handleEnemyDestroyed`): Checks `powerups.yml` drop chances upon enemy death.
    2.  If drop check passes, emits `REQUEST_SPAWN_POWERUP` with position.
    3.  `PowerupManager` (`handleRequestSpawnPowerup`): Listens for request, randomly selects a powerup from `powerups.yml`, emits `POWERUP_SPAWNED` with instance ID, config ID, position, and visual key.
    4.  `GameSceneEventHandler` (`handlePowerupSpawned`): Listens for spawn event, creates powerup sprite using visual key, adds to `powerupGroup` and `powerupSprites` map.
    5.  `GameSceneCollisionHandler` (`handlePlayerPowerupCollision`): Detects player/powerup overlap, emits `POWERUP_COLLECTED` with instance ID, destroys sprite.
    6.  `PowerupManager` (`handlePowerupCollected`): Listens for collection, applies effect (emits `POWERUP_EFFECT_APPLIED`), starts internal timer.
    7.  Helper Handlers (`PlayerPowerupHandler`, `WeaponPowerupHandler`) or Managers (`EconomyManager`): Listen for `POWERUP_EFFECT_APPLIED`, modify their internal state (e.g., `isShieldActive`, `rapidFireMultiplier`, `cashBoostMultiplier`).
    8.  `PowerupManager` (`update`): Decrements timer for active effects.
    9.  `PowerupManager` (`removeEffect`): When timer expires, emits `POWERUP_EFFECT_REMOVED`.
    10. Helper Handlers/Managers: Listen for `POWERUP_EFFECT_REMOVED`, revert state modifications.
*   **Death Bomb Flow:**
    1.  `EnemyEventHandler` (`handleEnemyDestroyed`): Checks enemy config for `death_bomb` ability.
    2.  If found, emits `SPAWN_PROJECTILE` with bomb details (type, damage, radius, time).
    3.  `ProjectileEventHandler` (`handleProjectileCreated`): Creates bomb sprite.
    4.  `ProjectileManager` (`update`): Decrements `timeToExplodeMs`.
    5.  `ProjectileManager` (`triggerExplosion`): When timer expires, emits `PROJECTILE_EXPLODE` with details.
    6.  `GameSceneAreaEffectHandler` (`handleProjectileExplode`): Listens for event, creates visual effect, uses `physics.overlapCirc` to find affected enemies/player, emits `PROJECTILE_HIT_ENEMY` or `PLAYER_HIT_PROJECTILE` for each.
    7.  `EnemyManager`/`PlayerManager`: Handle damage events as usual.
*   **Difficulty Scaling & Wave Flow:**
    1.  `EnemyManager` (Constructor): Loads `difficulty.yml` via `ConfigLoader`. Initializes `currentWave` based on `initialWaveNumber`. Calls `advanceWave`.
    2.  `EnemyManager` (`advanceWave`):
        *   Increments `currentWave`.
        *   Updates `availableEnemyTypes` based on `waveEnemyTypeUnlock` config.
        *   Emits `WAVE_UPDATED` event (for `UIScene`).
        *   Uses `setTimeout` to schedule `spawnWave` based on `timeBetweenWavesSec`.
    3.  `EnemyManager` (`spawnWave` - *Timer Callback*):
        *   Calculates scaled enemy count using `getScaledEnemyCount` (applies `enemyCountMultiplierPerWave`).
        *   Checks if it's a boss wave (`currentWave % bossWaveFrequency === 0`).
        *   If boss wave, calls `spawnEnemy` with `bossId`.
        *   If regular wave, loops `scaledEnemyCount` times:
            *   Selects a random enemy type from `availableEnemyTypes`.
            *   Determines spawn position (currently random placeholder, TODO: use `spawnPattern` config).
            *   Calls `spawnEnemy` with selected type and position.
        *   *(TODO: Implement wave clear check before next `advanceWave`)*
    4.  `EnemyManager` (`spawnEnemy`):
        *   Retrieves base `EnemyConfig`.
        *   Calculates scaled health using `getScaledHealth` (applies `enemyHealthMultiplierPerWave`).
        *   Calculates speed multiplier using `getScaledSpeedMultiplier` (applies `enemySpeedMultiplierPerWave`).
        *   Emits `ENEMY_SPAWNED` with scaled `initialHealth`, `maxHealth`, and `speedMultiplier`.
    5.  `EnemyEventHandler` (`handleEnemySpawned`):
        *   Receives `ENEMY_SPAWNED` event data.
        *   Creates `EnemyEntity`, passing scaled `maxHealth` and `speedMultiplier` to its constructor.
    6.  `EnemyEntity` (Constructor): Stores `maxHealth` and `speedMultiplier`. Applies `speedMultiplier` to initial velocity.
    7.  `EnemyEntity` (`handleMovement`): Uses stored `speedMultiplier` when calculating movement velocity based on `baseSpeed`.
    8.  `EnemyManager` (`destroyEnemy`):
        *   Calculates scaled reward using `getScaledReward` (applies `enemyRewardMultiplierPerWave`).
        *   Emits `ENEMY_DESTROYED` with scaled `reward`.
    9.  `EconomyManager` (`handleEnemyDestroyed`): Receives `ENEMY_DESTROYED` event and adds the (scaled) `reward` to currency.
    10. `EnemyManager` (`handleDamage`): When emitting `ENEMY_HEALTH_UPDATED`, calculates and includes scaled `maxHealth` for UI consistency.

**Critical Implementation Paths:**
*   Ensuring accurate physics/graphics synchronization.
*   Managing game state transitions (active, pause, game over).
*   Handling asynchronous operations (timers, API calls).
