/** Centralized definitions for event names used throughout the application */

// Player Events
export const PLAYER_STATE_UPDATED = 'PLAYER_STATE_UPDATED';
export const PLAYER_HIT_ENEMY = 'PLAYER_HIT_ENEMY';
export const PLAYER_HIT_PROJECTILE = 'PLAYER_HIT_PROJECTILE'; // Player hit by enemy projectile
export const PLAYER_DIED = 'PLAYER_DIED'; // Player health reached zero

// Input Events
export const MOVE_LEFT_START = 'MOVE_LEFT_START';
export const MOVE_LEFT_STOP = 'MOVE_LEFT_STOP';
export const MOVE_RIGHT_START = 'MOVE_RIGHT_START';
export const MOVE_RIGHT_STOP = 'MOVE_RIGHT_STOP';
export const FIRE_START = 'FIRE_START';
export const FIRE_STOP = 'FIRE_STOP';
export const WEAPON_SWITCH = 'WEAPON_SWITCH'; // Request to switch active weapon

// Projectile Events
export const SPAWN_PROJECTILE = 'SPAWN_PROJECTILE'; // Request from WeaponManager
export const PROJECTILE_CREATED = 'PROJECTILE_CREATED'; // Emitted by ProjectileManager for Scene
export const PROJECTILE_DESTROYED = 'PROJECTILE_DESTROYED'; // Emitted by ProjectileManager for Scene
export const PROJECTILE_HIT_ENEMY = 'PROJECTILE_HIT_ENEMY'; // Emitted by Scene collision handler

// Enemy Events
export const ENEMY_SPAWNED = 'ENEMY_SPAWNED'; // Emitted by EnemyManager for Scene
export const ENEMY_DESTROYED = 'ENEMY_DESTROYED'; // Emitted by EnemyManager for Scene/EconomyManager
export const ENEMY_HEALTH_UPDATED = 'ENEMY_HEALTH_UPDATED'; // Emitted by EnemyManager for Scene
export const ENEMY_REQUEST_FIRE = 'ENEMY_REQUEST_FIRE'; // Emitted by EnemyEntity for Scene to handle spawn

// Economy Events
export const CURRENCY_UPDATED = 'CURRENCY_UPDATED'; // Emitted by EconomyManager for UI
// export const INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS'; // Future event

// Weapon Events
export const REQUEST_FIRE_WEAPON = 'REQUEST_FIRE_WEAPON'; // Emitted by WeaponManager for Scene to handle spawn location
// export const WEAPON_COOLDOWN_START = 'WEAPON_COOLDOWN_START'; // Future event
// export const WEAPON_COOLDOWN_FINISH = 'WEAPON_COOLDOWN_FINISH'; // Future event
// export const WEAPON_READY = 'WEAPON_READY'; // Future event
