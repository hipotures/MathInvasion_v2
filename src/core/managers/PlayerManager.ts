// Import singleton instances
// import eventBus from '../events/EventBus'; // Removed - instance passed in constructor
import logger from '../utils/Logger';
// Import class type for annotations
import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events'; // Import event constants
import { type PlayerConfig } from '../config/schemas/playerSchema'; // Import PlayerConfig type

/** Defines the data expected for the PLAYER_HIT_ENEMY event */
// Note: This interface might be better placed in a shared types file or events.ts
interface PlayerHitEnemyData {
  enemyInstanceId: string;
  damage: number;
}

/** Defines the data expected for the PLAYER_HIT_PROJECTILE event */
// Note: This interface might be better placed in a shared types file or events.ts
interface PlayerHitProjectileData {
  projectileId: string;
  damage: number;
}

// Define constants for invulnerability
const INVULNERABILITY_DURATION_MS = 1000; // 1 second invulnerability

/**
 * Manages the state and behavior of the player character.
 * This includes position, health, movement logic, and interactions.
 */
export default class PlayerManager {
  private eventBus: EventBusType;
  private playerConfig: PlayerConfig; // Store player configuration

  // Player state properties
  private x: number = 0; // TODO: Initialize with starting position from config/scene
  private y: number = 0; // TODO: Initialize with starting position from config/scene
  private velocityX: number = 0;
  private isMovingLeft: boolean = false;
  private isMovingRight: boolean = false;
  private moveSpeed: number; // Initialized from config
  private health: number; // Initialized from config
  private isInvulnerable: boolean = false;
  private invulnerabilityTimer: number = 0;

  constructor(eventBusInstance: EventBusType, playerConfig: PlayerConfig) {
    this.eventBus = eventBusInstance;
    this.playerConfig = playerConfig; // Store config
    logger.log('PlayerManager initialized');

    // Initialize state from config
    this.health = this.playerConfig.initialHealth;
    this.moveSpeed = this.playerConfig.moveSpeed;
    logger.log(`Player initialized with Health: ${this.health}, Speed: ${this.moveSpeed}`);

    // Bind methods
    this.handleMoveLeftStart = this.handleMoveLeftStart.bind(this);
    this.handleMoveLeftStop = this.handleMoveLeftStop.bind(this);
    this.handleMoveRightStart = this.handleMoveRightStart.bind(this);
    this.handleMoveRightStop = this.handleMoveRightStop.bind(this);
    this.handlePlayerHitEnemy = this.handlePlayerHitEnemy.bind(this); // Bind enemy hit handler
    this.handlePlayerHitProjectile = this.handlePlayerHitProjectile.bind(this); // Bind projectile hit handler

    // Subscribe to input events
    this.eventBus.on(Events.MOVE_LEFT_START, this.handleMoveLeftStart);
    this.eventBus.on(Events.MOVE_LEFT_STOP, this.handleMoveLeftStop);
    this.eventBus.on(Events.MOVE_RIGHT_START, this.handleMoveRightStart);
    this.eventBus.on(Events.MOVE_RIGHT_STOP, this.handleMoveRightStop);
    this.eventBus.on(Events.PLAYER_HIT_ENEMY, this.handlePlayerHitEnemy); // Subscribe to enemy hit event
    this.eventBus.on(Events.PLAYER_HIT_PROJECTILE, this.handlePlayerHitProjectile); // Subscribe to projectile hit event

    // Initial state is set from config above
    this.emitStateUpdate(); // Emit initial state including health
  }

  // --- Event Handlers ---

  private handleMoveLeftStart(): void {
    this.isMovingLeft = true;
    this.updateVelocity();
  }

  private handleMoveLeftStop(): void {
    this.isMovingLeft = false;
    this.updateVelocity();
  }

  private handleMoveRightStart(): void {
    this.isMovingRight = true;
    this.updateVelocity();
  }

  private handleMoveRightStop(): void {
    this.isMovingRight = false;
    this.updateVelocity();
  }

  private handlePlayerHitEnemy(data: PlayerHitEnemyData): void {
    if (this.isInvulnerable || this.health <= 0) return; // Already dead or invulnerable

    this.health -= data.damage;
    logger.log(
      `Player took ${data.damage} damage from enemy ${data.enemyInstanceId}. Health: ${this.health}`
    );

    if (this.health <= 0) {
      this.health = 0;
      logger.log('Player has died!');
      this.eventBus.emit(Events.PLAYER_DIED); // Emit player died event
      // Stop movement
      this.velocityX = 0;
      this.isMovingLeft = false;
      this.isMovingRight = false;
    } else {
      // Become invulnerable if not dead
      this.isInvulnerable = true;
      this.invulnerabilityTimer = INVULNERABILITY_DURATION_MS;
      this.eventBus.emit(Events.PLAYER_INVULNERABILITY_START); // Notify scene for visual effect
      logger.debug(`Player invulnerability started (${this.invulnerabilityTimer}ms)`);
    }
    this.emitStateUpdate(); // Emit state update with new health
  }

  // Handler for when player is hit by a projectile
  private handlePlayerHitProjectile(data: PlayerHitProjectileData): void {
    if (this.isInvulnerable || this.health <= 0) return; // Already dead or invulnerable

    this.health -= data.damage;
    logger.log(
      `Player took ${data.damage} damage from projectile ${data.projectileId}. Health: ${this.health}`
    );

    if (this.health <= 0) {
      this.health = 0;
      logger.log('Player has died!');
      this.eventBus.emit(Events.PLAYER_DIED); // Emit player died event
      // Stop movement
      this.velocityX = 0;
      this.isMovingLeft = false;
      this.isMovingRight = false;
    } else {
      // Become invulnerable if not dead
      this.isInvulnerable = true;
      this.invulnerabilityTimer = INVULNERABILITY_DURATION_MS;
      this.eventBus.emit(Events.PLAYER_INVULNERABILITY_START); // Notify scene for visual effect
      logger.debug(`Player invulnerability started (${this.invulnerabilityTimer}ms)`);
    }
    this.emitStateUpdate(); // Emit state update with new health
  }

  // --- Core Logic ---

  private updateVelocity(): void {
    // Don't allow movement if dead
    if (this.health <= 0) {
      if (this.velocityX !== 0) {
        this.velocityX = 0;
        this.emitStateUpdate(); // Ensure stopped state is emitted
      }
      return;
    }

    let targetVelocityX = 0;
    if (this.isMovingLeft && !this.isMovingRight) {
      targetVelocityX = -this.moveSpeed;
    } else if (this.isMovingRight && !this.isMovingLeft) {
      targetVelocityX = this.moveSpeed;
    }

    // Only update and emit if velocity actually changes
    if (targetVelocityX !== this.velocityX) {
      this.velocityX = targetVelocityX;
      logger.debug(`Player velocityX set to: ${this.velocityX}`);
      this.emitStateUpdate();
    }
  }

  /** Emits the current player state relevant for the graphics/physics layer. */
  private emitStateUpdate(): void {
    // TODO: Add other relevant state (y, velocityY, health, etc.) later
    this.eventBus.emit(Events.PLAYER_STATE_UPDATED, {
      x: this.x, // Position might not be managed here directly yet
      y: this.y,
      velocityX: this.velocityX,
      velocityY: 0, // Assuming no vertical movement for now
      health: this.health, // Include health in state update
      isInvulnerable: this.isInvulnerable, // Include invulnerability state
    });
  }

  // TODO: Add methods for taking damage, dying, etc.

  /**
   * Called every frame by the main game loop (or scene).
   * Note: Actual position update might happen in the Phaser layer based on velocity.
   * This manager focuses on *state*, Phaser layer handles *presentation*.
   */
  public update(deltaTime: number): void {
    // Handle invulnerability timer
    if (this.isInvulnerable) {
      this.invulnerabilityTimer -= deltaTime;
      if (this.invulnerabilityTimer <= 0) {
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        this.eventBus.emit(Events.PLAYER_INVULNERABILITY_END); // Notify scene
        logger.debug('Player invulnerability ended');
        this.emitStateUpdate(); // Emit state change
      }
    }

    // Potential future logic:
    // - Apply status effects
    // - Regenerate health/shields
    // For now, movement state is driven purely by input events.
  }

  /** Clean up event listeners when the manager is destroyed */
  public destroy(): void {
    this.eventBus.off(Events.MOVE_LEFT_START, this.handleMoveLeftStart);
    this.eventBus.off(Events.MOVE_LEFT_STOP, this.handleMoveLeftStop);
    this.eventBus.off(Events.MOVE_RIGHT_START, this.handleMoveRightStart);
    this.eventBus.off(Events.MOVE_RIGHT_STOP, this.handleMoveRightStop);
    this.eventBus.off(Events.PLAYER_HIT_ENEMY, this.handlePlayerHitEnemy); // Unsubscribe from enemy hit event
    this.eventBus.off(Events.PLAYER_HIT_PROJECTILE, this.handlePlayerHitProjectile); // Unsubscribe from projectile hit event
    logger.log('PlayerManager destroyed and listeners removed');
  }
}
