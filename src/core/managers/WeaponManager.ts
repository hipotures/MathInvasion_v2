// Import singleton instances
import eventBus from '../events/EventBus';
import logger from '../utils/Logger';
// Import class type for annotations
import { EventBus as EventBusType } from '../events/EventBus';
// TODO: Import weapon configuration types/interfaces when defined
import { PlayerState } from '../types/PlayerState'; // Assuming a type definition exists or will be created

// Define constants for event names
const FIRE_START = 'FIRE_START';
// const FIRE_STOP = 'FIRE_STOP'; // Likely not needed for basic firing logic
const SPAWN_PROJECTILE = 'SPAWN_PROJECTILE';
const PLAYER_STATE_UPDATED = 'PLAYER_STATE_UPDATED'; // To get player position for firing

/**
 * Manages the player's weapons, including selection, firing, cooldowns,
 * and potentially upgrades or modifications based on game state.
 */
export default class WeaponManager {
  private eventBus: EventBusType;
  private currentWeaponId: string = 'basic_gun'; // TODO: Load from config/player state
  private weaponCooldown: number = 500; // ms - TODO: Load from weapon config
  private cooldownTimer: number = 0; // ms
  private isFiring: boolean = false; // Is the fire button currently held?
  private playerPosition: { x: number; y: number } = { x: 0, y: 0 }; // Track player position

  constructor(eventBusInstance: EventBusType) {
    this.eventBus = eventBusInstance;
    logger.log('WeaponManager initialized');

    // Bind methods
    this.handleFireStart = this.handleFireStart.bind(this);
    this.handlePlayerStateUpdate = this.handlePlayerStateUpdate.bind(this);
    // Note: handleFireStop might not be needed if firing is triggered on press

    // Subscribe to events
    this.eventBus.on(FIRE_START, this.handleFireStart);
    this.eventBus.on(PLAYER_STATE_UPDATED, this.handlePlayerStateUpdate);
    // TODO: Subscribe to weapon switching events

    // TODO: Load weapon configurations
    // TODO: Set initial weapon based on player state or config
  }

  // --- Event Handlers ---

  private handleFireStart(): void {
    logger.debug('Fire input received');
    this.isFiring = true; // Track that the button is pressed
    this.attemptFire(); // Try to fire immediately
  }

  // We need player position to know where projectiles should spawn
  private handlePlayerStateUpdate(state: PlayerState): void {
    this.playerPosition = { x: state.x, y: state.y };
  }

  // --- Core Logic ---

  public update(deltaTime: number): void {
    // Update cooldown timer
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= deltaTime;
      if (this.cooldownTimer < 0) {
        this.cooldownTimer = 0;
      }
    }

    // If firing is active (button held) and cooldown is ready, fire again (for auto-fire)
    // For single shot, we'd only fire in handleFireStart
    // if (this.isFiring && this.cooldownTimer === 0) {
    //    this.attemptFire();
    // }
  }

  private attemptFire(): void {
    if (this.cooldownTimer === 0) {
      logger.debug(`Firing weapon: ${this.currentWeaponId}`);
      // TODO: Get specific weapon config (damage, speed, projectile type)
      const projectileType = 'basic_bullet'; // Placeholder
      const spawnX = this.playerPosition.x; // Adjust based on sprite origin/barrel position
      const spawnY = this.playerPosition.y - 30; // Fire slightly above player center (adjust)
      const velocityX = 0; // Firing straight up for now
      const velocityY = -400; // Projectile speed - TODO: Load from config

      this.eventBus.emit(SPAWN_PROJECTILE, {
        type: projectileType,
        x: spawnX,
        y: spawnY,
        velocityX: velocityX,
        velocityY: velocityY,
        // TODO: Add owner info (player vs enemy) later
      });

      this.cooldownTimer = this.weaponCooldown; // Start cooldown
    } else {
      logger.debug('Weapon on cooldown');
    }
  }

  // TODO: Add method for switching weapons

  /** Clean up event listeners when the manager is destroyed */
  public destroy(): void {
    this.eventBus.off(FIRE_START, this.handleFireStart);
    this.eventBus.off(PLAYER_STATE_UPDATED, this.handlePlayerStateUpdate);
    logger.log('WeaponManager destroyed and listeners removed');
  }
}
