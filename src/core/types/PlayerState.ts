/**
 * Represents the state of the player relevant for communication
 * between managers and potentially the graphics layer.
 */
export interface PlayerState {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  // TODO: Add other relevant state properties later (e.g., health, currentWeaponId)
}
