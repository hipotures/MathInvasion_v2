export interface PlayerState {
  velocityX: number;
  velocityY: number;
  health: number; // Current health
  isInvulnerable: boolean; // Whether the player is currently invulnerable
  // TODO: Add other relevant state properties later (e.g., currentWeaponId)
}
