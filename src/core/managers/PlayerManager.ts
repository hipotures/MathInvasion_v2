import logger from '../utils/Logger';
import { EventBus as EventBusType } from '../events/EventBus';
import * as Events from '../constants/events';
import { type PlayerConfig } from '../config/schemas/playerSchema';
import { PlayerPowerupHandler } from './helpers/PlayerPowerupHandler';
// Import types
import {
    type PlayerHitEnemyData,
    type PlayerHitProjectileData,
    type PlayerStateUpdateData,
    type PlayerState,
} from './types/PlayerManager.types';
// Import action functions
import {
    handleMoveLeftStart,
    handleMoveLeftStop,
    handleMoveRightStart,
    handleMoveRightStop,
    handlePlayerHitEnemy,
    handlePlayerHitProjectile,
} from './actions/PlayerManager.actions';

// --- Constants ---
const INVULNERABILITY_DURATION_MS = 1000; // Keep constant here or move to types/config

export default class PlayerManager {
    private eventBus: EventBusType;
    private playerConfig: PlayerConfig;
    private playerPowerupHandler: PlayerPowerupHandler;

    // --- Player State ---
    // Using individual properties for now, could be grouped into a state object
    private x: number = 0; // Position - consider if this should be managed here or solely by Phaser sprite
    private y: number = 0;
    private velocityX: number = 0;
    private isMovingLeft: boolean = false;
    private isMovingRight: boolean = false;
    private health: number;
    private isInvulnerable: boolean = false; // Post-hit invulnerability
    private invulnerabilityTimer: number = 0;
    // Movement properties from config
    private speed: number;
    private acceleration: number;
    private deceleration: number;

    private creationTime: number;

    constructor(eventBusInstance: EventBusType, playerConfig: PlayerConfig) {
        this.eventBus = eventBusInstance;
        this.playerConfig = playerConfig;
        this.playerPowerupHandler = new PlayerPowerupHandler(this.eventBus, logger);
        this.creationTime = Date.now();
        logger.log('PlayerManager initialized');

        // Initialize state from config
        this.health = this.playerConfig.initialHealth;
        this.speed = this.playerConfig.speed;
        this.acceleration = this.playerConfig.acceleration;
        this.deceleration = this.playerConfig.deceleration;
        logger.log(
            `Player initialized with Health: ${this.health}, Speed: ${this.speed}, Accel: ${this.acceleration}, Decel: ${this.deceleration}`
        );

        // Bind methods that remain part of the class (update, getters, emit, destroy)
        this.update = this.update.bind(this);
        this.emitStateUpdate = this.emitStateUpdate.bind(this);
        this.getPlayerState = this.getPlayerState.bind(this);
        this.destroy = this.destroy.bind(this);

        // Register event listeners - Call wrapper methods that use action functions
        this.eventBus.on(Events.MOVE_LEFT_START, this.onMoveLeftStart.bind(this));
        this.eventBus.on(Events.MOVE_LEFT_STOP, this.onMoveLeftStop.bind(this));
        this.eventBus.on(Events.MOVE_RIGHT_START, this.onMoveRightStart.bind(this));
        this.eventBus.on(Events.MOVE_RIGHT_STOP, this.onMoveRightStop.bind(this));
        this.eventBus.on(Events.PLAYER_HIT_ENEMY, this.onPlayerHitEnemy.bind(this));
        this.eventBus.on(Events.PLAYER_HIT_PROJECTILE, this.onPlayerHitProjectile.bind(this));

        this.emitStateUpdate(); // Emit initial state
    }

    // --- Event Handler Wrappers (calling action functions) ---

    // Create a state reference object for action functions
    private getStateRef() {
        return {
            isMovingLeft: this.isMovingLeft,
            isMovingRight: this.isMovingRight,
            health: this.health,
            isInvulnerable: this.isInvulnerable,
            invulnerabilityTimer: this.invulnerabilityTimer,
            velocityX: this.velocityX,
        };
    }

    // Update local state from the reference object after action function modifies it
    private updateStateFromRef(stateRef: ReturnType<typeof this.getStateRef>) {
        this.isMovingLeft = stateRef.isMovingLeft;
        this.isMovingRight = stateRef.isMovingRight;
        this.health = stateRef.health;
        this.isInvulnerable = stateRef.isInvulnerable;
        this.invulnerabilityTimer = stateRef.invulnerabilityTimer;
        this.velocityX = stateRef.velocityX;
    }

    private onMoveLeftStart(): void {
        const stateRef = this.getStateRef();
        handleMoveLeftStart({ stateRef });
        this.updateStateFromRef(stateRef);
        // No state update emission needed here, handled by update loop
    }

    private onMoveLeftStop(): void {
        const stateRef = this.getStateRef();
        handleMoveLeftStop({ stateRef });
        this.updateStateFromRef(stateRef);
        // No state update emission needed here, handled by update loop
    }

    private onMoveRightStart(): void {
        const stateRef = this.getStateRef();
        handleMoveRightStart({ stateRef });
        this.updateStateFromRef(stateRef);
        // No state update emission needed here, handled by update loop
    }

    private onMoveRightStop(): void {
        const stateRef = this.getStateRef();
        handleMoveRightStop({ stateRef });
        this.updateStateFromRef(stateRef);
        // No state update emission needed here, handled by update loop
    }

    private onPlayerHitEnemy(data: PlayerHitEnemyData): void {
        const stateRef = this.getStateRef();
        const damageArgs = {
            stateRef,
            playerPowerupHandler: this.playerPowerupHandler,
            eventBus: this.eventBus,
            emitStateUpdateFn: this.emitStateUpdate, // Pass bound emit function
        };
        handlePlayerHitEnemy(data, damageArgs);
        this.updateStateFromRef(stateRef); // Update state after action potentially modified it
    }

    private onPlayerHitProjectile(data: PlayerHitProjectileData): void {
        const stateRef = this.getStateRef();
        const damageArgs = {
            stateRef,
            playerPowerupHandler: this.playerPowerupHandler,
            eventBus: this.eventBus,
            emitStateUpdateFn: this.emitStateUpdate, // Pass bound emit function
        };
        handlePlayerHitProjectile(data, damageArgs);
        this.updateStateFromRef(stateRef); // Update state after action potentially modified it
    }

    // --- Core Update Logic ---

    public update(deltaTimeMs: number): void {
        const deltaTime = deltaTimeMs / 1000; // Convert ms to seconds
        let stateChanged = false; // Track if relevant state changed

        // --- Invulnerability Timer ---
        if (this.isInvulnerable) {
            const previousTimer = this.invulnerabilityTimer;
            this.invulnerabilityTimer -= deltaTimeMs;
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                this.invulnerabilityTimer = 0;
                if (!this.playerPowerupHandler.isShieldPowerupActive()) {
                    this.eventBus.emit(Events.PLAYER_INVULNERABILITY_END);
                }
                logger.debug('Player post-hit invulnerability ended');
                stateChanged = true; // Invulnerability state changed
            } else if (this.invulnerabilityTimer !== previousTimer) {
                 // Timer changed, might affect visuals even if still invulnerable
                 stateChanged = true;
            }
        }

        // --- Movement Logic ---
        const previousVelocityX = this.velocityX;
        if (this.health > 0) {
            let targetVelocityX = 0;
            if (this.isMovingRight) {
                targetVelocityX = this.speed;
            } else if (this.isMovingLeft) {
                targetVelocityX = -this.speed;
            }

            if (targetVelocityX !== 0) { // Accelerating
                if (Math.sign(this.velocityX) !== Math.sign(targetVelocityX) && this.velocityX !== 0) {
                     // Changing direction, apply deceleration first then acceleration
                     const decelAmount = this.deceleration * deltaTime;
                     this.velocityX = Math.sign(this.velocityX) * Math.max(0, Math.abs(this.velocityX) - decelAmount);
                } else {
                    // Accelerating or continuing in the same direction
                    const accelAmount = this.acceleration * deltaTime;
                    if (this.velocityX < targetVelocityX) { // Moving right or starting right
                        this.velocityX = Math.min(this.velocityX + accelAmount, targetVelocityX);
                    } else if (this.velocityX > targetVelocityX) { // Moving left or starting left
                        this.velocityX = Math.max(this.velocityX - accelAmount, targetVelocityX);
                    }
                }
            } else { // Decelerating
                const decelAmount = this.deceleration * deltaTime;
                if (this.velocityX > 0) {
                    this.velocityX = Math.max(this.velocityX - decelAmount, 0);
                } else if (this.velocityX < 0) {
                    this.velocityX = Math.min(this.velocityX + decelAmount, 0);
                }
            }
        } else { // Ensure velocity is zero if dead
            this.velocityX = 0;
        }

        if (this.velocityX !== previousVelocityX) {
            stateChanged = true; // Velocity changed
        }

        // --- Emit State Update ---
        if (stateChanged) {
            this.emitStateUpdate();
        }
    }

    // --- State Emission ---

    private emitStateUpdate(): void {
        const stateData: PlayerStateUpdateData = {
            x: this.x, // Position might not be managed here directly yet
            y: this.y,
            velocityX: this.velocityX,
            velocityY: 0, // Assuming no vertical movement for now
            health: this.health,
            isEffectivelyInvulnerable:
                this.isInvulnerable || this.playerPowerupHandler.isShieldPowerupActive(),
        };
        this.eventBus.emit(Events.PLAYER_STATE_UPDATED, stateData);
    }

    // --- Getters ---

    public getPlayerState(): PlayerState {
        return {
            x: this.x,
            y: this.y,
            velocityX: this.velocityX,
            health: this.health,
            maxHealth: this.playerConfig.initialHealth,
            isInvulnerable: this.isInvulnerable,
            invulnerabilityTimer: this.invulnerabilityTimer,
            isShieldActive: this.playerPowerupHandler.isShieldPowerupActive(),
            movementDirection: this.isMovingLeft ? 'left' : this.isMovingRight ? 'right' : 'none',
        };
    }

    public getCreationTime(): number {
        return this.creationTime;
    }

    // --- Cleanup ---

    public destroy(): void {
        // Unregister event listeners using the bound methods
        this.eventBus.off(Events.MOVE_LEFT_START, this.onMoveLeftStart.bind(this));
        this.eventBus.off(Events.MOVE_LEFT_STOP, this.onMoveLeftStop.bind(this));
        this.eventBus.off(Events.MOVE_RIGHT_START, this.onMoveRightStart.bind(this));
        this.eventBus.off(Events.MOVE_RIGHT_STOP, this.onMoveRightStop.bind(this));
        this.eventBus.off(Events.PLAYER_HIT_ENEMY, this.onPlayerHitEnemy.bind(this));
        this.eventBus.off(Events.PLAYER_HIT_PROJECTILE, this.onPlayerHitProjectile.bind(this));

        this.playerPowerupHandler.destroy();
        logger.log('PlayerManager destroyed and listeners removed');
    }
}
