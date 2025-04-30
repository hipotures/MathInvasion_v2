/**
 * Defines constants for asset keys used throughout the game.
 * This helps avoid hardcoding strings and allows for easier asset management.
 */

// Player Assets
export const PLAYER_KEY = 'playerShip';

// Projectile Assets
export const BULLET_KEY = 'bullet'; // Player bullet
export const PROJECTILE_DEATH_BOMB_KEY = 'deathBomb'; // Key for the hexagon bomber's death bomb
export const PROJECTILE_ENEMY_BULLET_KEY = 'enemyBullet'; // Standard enemy bullet (can reuse BULLET_KEY or have distinct)
export const PROJECTILE_ENEMY_BULLET_FAST_KEY = 'enemyBulletFast'; // Faster bullet for strafer
export const PROJECTILE_ENEMY_LASER_KEY = 'enemyLaser'; // Laser for boss

// Enemy Assets
export const ENEMY_SMALL_ALIEN_KEY = 'enemySmallAlien'; // triangle_scout
export const ENEMY_MEDIUM_ALIEN_KEY = 'enemyMediumAlien'; // square_tank
export const ENEMY_LARGE_METEOR_KEY = 'enemyLargeMeteor'; // pentagon_healer (placeholder?)
export const ENEMY_HEXAGON_BOMBER_KEY = 'enemyHexagonBomber'; // hexagon_bomber
export const ENEMY_DIAMOND_STRAFER_KEY = 'enemyDiamondStrafer'; // diamond_strafer
// Add keys for other enemy types as needed (e.g., boss)

// Placeholder/Debug Assets (Consider removing later)
export const VITE_LOGO_KEY = 'viteLogo'; // Assuming this was the previous placeholder

// Powerup Visual Assets
export const POWERUP_SHIELD_KEY = 'powerupShield';
export const POWERUP_RAPID_FIRE_KEY = 'powerupRapidFire';
// Add key for cash boost visual if needed

// Audio Assets
export const AUDIO_EXPLOSION_SMALL_KEY = 'explosionSmall';
export const AUDIO_POWERUP_APPEAR_KEY = 'powerupAppear';
export const AUDIO_POWERUP_GET_KEY = 'powerupGet';

// Add other asset types (audio, UI elements, etc.) as needed
