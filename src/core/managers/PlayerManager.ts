import logger from '../utils/Logger';
import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events';
import { type PlayerConfig } from '../config/schemas/playerSchema';
import { PlayerPowerupHandler } from './helpers/PlayerPowerupHandler';

// TODO: Consider moving these interfaces to a shared types file
interface PlayerHitEnemyData {
  enemyInstanceId: string;
  damage: number;
}

interface PlayerHitProjectileData {
  projectileId: string;
  damage: number;
}

const INVULNERABILITY_DURATION_MS = 1000; // 1 second invulnerability

export default class PlayerManager {
  private eventBus: EventBusType;
  private playerConfig: PlayerConfig;

  private x: number = 0; // TODO: Initialize with starting position from config/scene
  private y: number = 0; // TODO: Initialize with starting position from config/scene
  private velocityX: number = 0;
  private isMovingLeft: boolean = false;
  private isMovingRight: boolean = false;
  private speed: number; // Renamed from moveSpeed
  private health: number;
  private isInvulnerable: boolean = false;
  private invulnerabilityTimer: number = 0;
  private playerPowerupHandler: PlayerPowerupHandler;

  private creationTime: number;
  constructor(eventBusInstance: EventBusType, playerConfig: PlayerConfig) {
    this.eventBus = eventBusInstance;
    this.playerConfig = playerConfig;
    this.playerPowerupHandler = new PlayerPowerupHandler(this.eventBus, logger);
    this.creationTime = Date.now();
    logger.log('PlayerManager initialized');

    this.health = this.playerConfig.initialHealth;
    this.speed = this.playerConfig.speed; // Renamed from moveSpeed
    logger.log(`Player initialized with Health: ${this.health}, Speed: ${this.speed}`); // Use this.speed

    this.handleMoveLeftStart = this.handleMoveLeftStart.bind(this);
    this.handleMoveLeftStop = this.handleMoveLeftStop.bind(this);
    this.handleMoveRightStart = this.handleMoveRightStart.bind(this);
    this.handleMoveRightStop = this.handleMoveRightStop.bind(this);
    this.handlePlayerHitEnemy = this.handlePlayerHitEnemy.bind(this);
    this.handlePlayerHitProjectile = this.handlePlayerHitProjectile.bind(this);

    this.eventBus.on(Events.MOVE_LEFT_START, this.handleMoveLeftStart);
    this.eventBus.on(Events.MOVE_LEFT_STOP, this.handleMoveLeftStop);
    this.eventBus.on(Events.MOVE_RIGHT_START, this.handleMoveRightStart);
    this.eventBus.on(Events.MOVE_RIGHT_STOP, this.handleMoveRightStop);
    this.eventBus.on(Events.PLAYER_HIT_ENEMY, this.handlePlayerHitEnemy);
    this.eventBus.on(Events.PLAYER_HIT_PROJECTILE, this.handlePlayerHitProjectile);

    this.emitStateUpdate();
  }

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
    // Check both post-hit invulnerability and shield powerup (via helper)
    if (
      this.isInvulnerable ||
      this.playerPowerupHandler.isShieldPowerupActive() ||
      this.health <= 0
    ) {
      logger.debug(`Player hit enemy ${data.enemyInstanceId}, but is invulnerable.`);
      return;
    }

    this.health -= data.damage;
    logger.log(
      `Player took ${data.damage} damage from enemy ${data.enemyInstanceId}. Health: ${this.health}`
    );

    if (this.health <= 0) {
      this.health = 0;
      logger.log('Player has died!');
      this.eventBus.emit(Events.PLAYER_DIED);
      this.velocityX = 0;
      this.isMovingLeft = false;
      this.isMovingRight = false;
    } else {
      this.isInvulnerable = true;
      this.invulnerabilityTimer = INVULNERABILITY_DURATION_MS;
      this.eventBus.emit(Events.PLAYER_INVULNERABILITY_START);
      logger.debug(`Player invulnerability started (${this.invulnerabilityTimer}ms)`);
    }
    this.emitStateUpdate();
  }

  private handlePlayerHitProjectile(data: PlayerHitProjectileData): void {
    // Check both post-hit invulnerability and shield powerup (via helper)
    if (
      this.isInvulnerable ||
      this.playerPowerupHandler.isShieldPowerupActive() ||
      this.health <= 0
    ) {
      logger.debug(`Player hit projectile ${data.projectileId}, but is invulnerable.`);
      return;
    }

    this.health -= data.damage;
    logger.log(
      `Player took ${data.damage} damage from projectile ${data.projectileId}. Health: ${this.health}`
    );

    if (this.health <= 0) {
      this.health = 0;
      logger.log('Player has died!');
      this.eventBus.emit(Events.PLAYER_DIED);
      this.velocityX = 0;
      this.isMovingLeft = false;
      this.isMovingRight = false;
    } else {
      this.isInvulnerable = true;
      this.invulnerabilityTimer = INVULNERABILITY_DURATION_MS;
      this.eventBus.emit(Events.PLAYER_INVULNERABILITY_START);
      logger.debug(`Player invulnerability started (${this.invulnerabilityTimer}ms)`);
    }
    this.emitStateUpdate();
  }

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
    // Prioritize Right: If Right is pressed, move right.
    if (this.isMovingRight) {
      targetVelocityX = this.speed;
      // Else if only Left is pressed, move left.
    } else if (this.isMovingLeft) {
      targetVelocityX = -this.speed;
    }
    // Otherwise (neither pressed), targetVelocityX remains 0.

    // Only update and emit if velocity actually changes
    if (targetVelocityX !== this.velocityX) {
      this.velocityX = targetVelocityX;
      logger.debug(`Player velocityX set to: ${this.velocityX}`);
      this.emitStateUpdate();
    }
  }

  private emitStateUpdate(): void {
    // TODO: Add other relevant state (y, velocityY, health, etc.) later
    this.eventBus.emit(Events.PLAYER_STATE_UPDATED, {
      x: this.x, // Position might not be managed here directly yet
      y: this.y,
      velocityX: this.velocityX,
      velocityY: 0, // Assuming no vertical movement for now
      health: this.health,
      // Combine both invulnerability states for the scene/visuals
      isEffectivelyInvulnerable:
        this.isInvulnerable || this.playerPowerupHandler.isShieldPowerupActive(),
    });
  }

  // TODO: Add methods for taking damage, dying, etc.

  public update(deltaTime: number): void {
    if (this.isInvulnerable) {
      this.invulnerabilityTimer -= deltaTime;
      if (this.invulnerabilityTimer <= 0) {
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        // Only emit END event if the shield isn't also active (check via helper)
        if (!this.playerPowerupHandler.isShieldPowerupActive()) {
          this.eventBus.emit(Events.PLAYER_INVULNERABILITY_END);
        }
        logger.debug('Player post-hit invulnerability ended');
        this.emitStateUpdate();
      }
    }

    // Potential future logic:
    // - Apply status effects
    // - Regenerate health/shields
    // For now, movement state is driven purely by input events.
  }

  public getPlayerState(): {
    x: number;
    y: number;
    velocityX: number;
    health: number;
    maxHealth: number;
    isInvulnerable: boolean;
    invulnerabilityTimer: number;
    isShieldActive: boolean;
    movementDirection: 'left' | 'right' | 'none';
  } {
    return {
      x: this.x,
      y: this.y,
      velocityX: this.velocityX,
      health: this.health,
      maxHealth: this.playerConfig.initialHealth, // Assuming max health doesn't change
      isInvulnerable: this.isInvulnerable,
      invulnerabilityTimer: this.invulnerabilityTimer,
      isShieldActive: this.playerPowerupHandler.isShieldPowerupActive(),
      movementDirection: this.isMovingLeft ? 'left' : this.isMovingRight ? 'right' : 'none',
    };
  }

  public getCreationTime(): number {
    return this.creationTime;
  }

  public destroy(): void {
    this.eventBus.off(Events.MOVE_LEFT_START, this.handleMoveLeftStart);
    this.eventBus.off(Events.MOVE_LEFT_STOP, this.handleMoveLeftStop);
    this.eventBus.off(Events.MOVE_RIGHT_START, this.handleMoveRightStart);
    this.eventBus.off(Events.MOVE_RIGHT_STOP, this.handleMoveRightStop);
    this.eventBus.off(Events.PLAYER_HIT_ENEMY, this.handlePlayerHitEnemy);
    this.eventBus.off(Events.PLAYER_HIT_PROJECTILE, this.handlePlayerHitProjectile);
    this.playerPowerupHandler.destroy();
    logger.log('PlayerManager destroyed and listeners removed');
  }
}
