// Import singleton instances
// import eventBus from '../events/EventBus'; // Removed - instance passed in constructor
import logger from '../utils/Logger';
// Import class type for annotations
import { EventBus as EventBusType } from '../events/EventBus';

// Define constants for event names (matching InputManager)
const MOVE_LEFT_START = 'MOVE_LEFT_START';
const MOVE_LEFT_STOP = 'MOVE_LEFT_STOP';
const MOVE_RIGHT_START = 'MOVE_RIGHT_START';
const MOVE_RIGHT_STOP = 'MOVE_RIGHT_STOP';
const PLAYER_STATE_UPDATED = 'PLAYER_STATE_UPDATED'; // Event for Phaser layer
const PLAYER_HIT_ENEMY = 'PLAYER_HIT_ENEMY'; // Event from GameScene collision

/** Defines the data expected for the PLAYER_HIT_ENEMY event */
interface PlayerHitEnemyData {
  enemyInstanceId: string;
  damage: number;
}

/**
 * Manages the state and behavior of the player character.
 * This includes position, health, movement logic, and interactions.
 */
export default class PlayerManager {
  private eventBus: EventBusType;

  // Player state properties
  private x: number = 0; // TODO: Initialize with starting position from config/scene
  private y: number = 0; // TODO: Initialize with starting position from config/scene
  private velocityX: number = 0;
  private isMovingLeft: boolean = false;
  private isMovingRight: boolean = false;
  private moveSpeed: number = 200; // TODO: Load from config
  private health: number = 100; // TODO: Load initial health from config

  constructor(eventBusInstance: EventBusType) {
    this.eventBus = eventBusInstance;
    logger.log('PlayerManager initialized');

    // Bind methods
    this.handleMoveLeftStart = this.handleMoveLeftStart.bind(this);
    this.handleMoveLeftStop = this.handleMoveLeftStop.bind(this);
    this.handleMoveRightStart = this.handleMoveRightStart.bind(this);
    this.handleMoveRightStop = this.handleMoveRightStop.bind(this);
    this.handlePlayerHitEnemy = this.handlePlayerHitEnemy.bind(this); // Bind hit handler

    // Subscribe to input events
    this.eventBus.on(MOVE_LEFT_START, this.handleMoveLeftStart);
    this.eventBus.on(MOVE_LEFT_STOP, this.handleMoveLeftStop);
    this.eventBus.on(MOVE_RIGHT_START, this.handleMoveRightStart);
    this.eventBus.on(MOVE_RIGHT_STOP, this.handleMoveRightStop);
    this.eventBus.on(PLAYER_HIT_ENEMY, this.handlePlayerHitEnemy); // Subscribe to hit event

    // TODO: Initialize player state (e.g., load health from config)
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
    if (this.health <= 0) return; // Already dead

    this.health -= data.damage;
    logger.log(`Player took ${data.damage} damage from enemy ${data.enemyInstanceId}. Health: ${this.health}`);

    if (this.health <= 0) {
      this.health = 0;
      logger.log('Player has died!');
      // TODO: Emit PLAYER_DIED event
      // this.eventBus.emit('PLAYER_DIED');
      // TODO: Handle game over logic (e.g., stop movement)
      this.velocityX = 0; // Stop movement on death
      this.isMovingLeft = false;
      this.isMovingRight = false;
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
    this.eventBus.emit(PLAYER_STATE_UPDATED, {
      x: this.x, // Position might not be managed here directly yet
      y: this.y,
      velocityX: this.velocityX,
      velocityY: 0, // Assuming no vertical movement for now
      health: this.health, // Include health in state update
    });
  }

  // TODO: Add methods for taking damage, dying, etc.

  /**
   * Called every frame by the main game loop (or scene).
   * Note: Actual position update might happen in the Phaser layer based on velocity.
   * This manager focuses on *state*, Phaser layer handles *presentation*.
   */
  public update(_deltaTime: number): void { // Prefix with underscore
    // Potential future logic:
    // - Apply status effects
    // - Regenerate health/shields
    // For now, movement state is driven purely by input events.
  }

  /** Clean up event listeners when the manager is destroyed */
  public destroy(): void {
    this.eventBus.off(MOVE_LEFT_START, this.handleMoveLeftStart);
    this.eventBus.off(MOVE_LEFT_STOP, this.handleMoveLeftStop);
    this.eventBus.off(MOVE_RIGHT_START, this.handleMoveRightStart);
    this.eventBus.off(MOVE_RIGHT_STOP, this.handleMoveRightStop);
    this.eventBus.off(PLAYER_HIT_ENEMY, this.handlePlayerHitEnemy); // Unsubscribe from hit event
    logger.log('PlayerManager destroyed and listeners removed');
  }
}
