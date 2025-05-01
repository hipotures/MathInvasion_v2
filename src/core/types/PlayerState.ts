export interface PlayerState {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  health: number; // Current health
  isInvulnerable: boolean; // Whether the player is currently invulnerable
  // TODO: Add other relevant state properties later (e.g., currentWeaponId)
}
