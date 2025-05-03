// Payload for PLAYER_HIT_ENEMY event
export interface PlayerHitEnemyData {
  enemyInstanceId: string;
  damage: number;
}

// Payload for PLAYER_HIT_PROJECTILE event
export interface PlayerHitProjectileData {
  projectileId: string;
  damage: number;
}

// Payload for PROJECTILE_HIT_ENEMY event
export interface ProjectileHitEnemyData {
  projectileId: string;
  enemyInstanceId: string;
  damage: number;
}

// Could add other collision-related types here if needed