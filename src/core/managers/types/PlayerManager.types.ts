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

// State structure emitted by PLAYER_STATE_UPDATED event
export interface PlayerStateUpdateData {
  velocityX: number;
  velocityY: number; // Assuming 0 for now, but keep for future
  health: number;
  isEffectivelyInvulnerable: boolean; // Combined state for visuals
}

// Internal state representation (can be expanded)
export interface PlayerState {
    velocityX: number;
    health: number;
    maxHealth: number;
    isInvulnerable: boolean; // Post-hit invulnerability
    invulnerabilityTimer: number;
    isShieldActive: boolean; // From powerup
    movementDirection: 'left' | 'right' | 'none';
}