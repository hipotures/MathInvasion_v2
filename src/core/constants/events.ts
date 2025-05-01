export const PLAYER_STATE_UPDATED = 'PLAYER_STATE_UPDATED';
export const PLAYER_HIT_ENEMY = 'PLAYER_HIT_ENEMY';
export const PLAYER_HIT_PROJECTILE = 'PLAYER_HIT_PROJECTILE'; // Player hit by enemy projectile
export const PLAYER_DIED = 'PLAYER_DIED'; // Player health reached zero
export const PLAYER_INVULNERABILITY_START = 'PLAYER_INVULNERABILITY_START'; // Player becomes invulnerable
export const PLAYER_INVULNERABILITY_END = 'PLAYER_INVULNERABILITY_END'; // Player invulnerability ends

export const MOVE_LEFT_START = 'MOVE_LEFT_START';
export const MOVE_LEFT_STOP = 'MOVE_LEFT_STOP';
export const MOVE_RIGHT_START = 'MOVE_RIGHT_START';
export const MOVE_RIGHT_STOP = 'MOVE_RIGHT_STOP';
export const FIRE_START = 'FIRE_START';
export const FIRE_STOP = 'FIRE_STOP';
export const WEAPON_SWITCH = 'WEAPON_SWITCH'; // Request to switch active weapon
export const DEBUG_TOGGLE = 'DEBUG_TOGGLE'; // Toggle debug mode
export const DEBUG_MODE_CHANGED = 'DEBUG_MODE_CHANGED'; // Notify that debug mode has changed
export const DEBUG_INSPECT_OBJECT = 'DEBUG_INSPECT_OBJECT'; // Request to inspect a specific object (payload: { gameObject, id, type }) - DEPRECATED?
export const DEBUG_STOP_INSPECTING = 'DEBUG_STOP_INSPECTING'; // Request to stop inspecting and return to default view
export const DEBUG_SHOW_INSPECTION_DETAILS = 'DEBUG_SHOW_INSPECTION_DETAILS'; // Provides formatted HTML details for the panel (payload: { html: string })

export const SPAWN_PROJECTILE = 'SPAWN_PROJECTILE'; // Request from WeaponManager
export const PROJECTILE_CREATED = 'PROJECTILE_CREATED'; // Emitted by ProjectileManager for Scene
export const PROJECTILE_DESTROYED = 'PROJECTILE_DESTROYED'; // Emitted by ProjectileManager for Scene
export const PROJECTILE_HIT_ENEMY = 'PROJECTILE_HIT_ENEMY'; // Emitted by Scene collision handler
export const PROJECTILE_EXPLODE = 'PROJECTILE_EXPLODE'; // Emitted by ProjectileManager for area damage (e.g., bombs)

export const ENEMY_SPAWNED = 'ENEMY_SPAWNED'; // Emitted by EnemyManager for Scene
export const ENEMY_DESTROYED = 'ENEMY_DESTROYED'; // Emitted by EnemyManager for Scene/EconomyManager
export const ENEMY_HEALTH_UPDATED = 'ENEMY_HEALTH_UPDATED'; // Emitted by EnemyManager for Scene
export const ENEMY_REQUEST_FIRE = 'ENEMY_REQUEST_FIRE'; // Emitted by EnemyEntity for Scene to handle spawn
export const REQUEST_ENEMY_DESTRUCTION_EFFECT = 'REQUEST_ENEMY_DESTRUCTION_EFFECT'; // Emitted by EnemyEntity for Scene to handle visuals

export const CURRENCY_UPDATED = 'CURRENCY_UPDATED'; // Emitted by EconomyManager for UI
export const SCORE_UPDATED = 'SCORE_UPDATED'; // Emitted by EconomyManager for UI
export const WAVE_UPDATED = 'WAVE_UPDATED'; // Emitted when the wave number changes
// export const INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS'; // Future event

export const REQUEST_FIRE_WEAPON = 'REQUEST_FIRE_WEAPON'; // Emitted by WeaponManager for Scene to handle spawn location
export const WEAPON_STATE_UPDATED = 'WEAPON_STATE_UPDATED'; // Emitted by WeaponManager for UI updates (current weapon, level, cost)
export const REQUEST_WEAPON_UPGRADE = 'REQUEST_WEAPON_UPGRADE'; // Emitted by InputManager to request upgrading the current weapon
// export const WEAPON_UPGRADED = 'WEAPON_UPGRADED'; // Future event from WeaponManager after successful upgrade
// export const WEAPON_COOLDOWN_START = 'WEAPON_COOLDOWN_START'; // Future event
// export const WEAPON_COOLDOWN_FINISH = 'WEAPON_COOLDOWN_FINISH'; // Future event
// export const WEAPON_READY = 'WEAPON_READY'; // Future event

export const REQUEST_SPAWN_POWERUP = 'REQUEST_SPAWN_POWERUP'; // Emitted by EnemyManager when a powerup should drop
export const POWERUP_SPAWNED = 'POWERUP_SPAWNED'; // Emitted by PowerupManager for Scene to create sprite
export const POWERUP_COLLECTED = 'POWERUP_COLLECTED'; // Emitted by Scene collision handler
export const POWERUP_EXPIRED = 'POWERUP_EXPIRED'; // Emitted by PowerupManager when effect duration ends
export const POWERUP_EFFECT_APPLIED = 'POWERUP_EFFECT_APPLIED'; // Emitted by PowerupManager when effect starts
export const POWERUP_EFFECT_REMOVED = 'POWERUP_EFFECT_REMOVED'; // Emitted by PowerupManager when effect ends

export const TOGGLE_PAUSE = 'TOGGLE_PAUSE'; // Request to toggle pause state
export const GAME_PAUSED = 'GAME_PAUSED'; // Emitted when the game is paused
export const GAME_RESUMED = 'GAME_RESUMED'; // Emitted when the game is resumed

// Debugging Events
export const DEBUG_PERFORM_HIT_TEST = 'DEBUG_PERFORM_HIT_TEST'; // { x: number, y: number }

export const DEBUG_LABEL_CLICKED = 'DEBUG_LABEL_CLICKED'; // { gameObject: Phaser.GameObjects.GameObject }
