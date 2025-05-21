import Phaser from 'phaser';
import LoggerInstance, { Logger as LoggerType } from '../../core/utils/Logger';
import EventBusInstance, { EventBus as EventBusType } from '../../core/events/EventBus';
import * as Events from '../../core/constants/events';
import { EnemyConfig } from '../../core/config/schemas/enemySchema';
import * as Assets from '../../core/constants/assets';
// Import types
import { ApplySlowEffectData } from './types/EnemyEntity.types';
// Import behavior functions
import { handleMovement, handleShooting, checkOffScreen } from './behavior/EnemyEntity.behavior';

export class EnemyEntity extends Phaser.Physics.Arcade.Sprite {
    // Static property to track game pause state
    public static isPaused: boolean = false;

    // Static properties to store bound listener functions
    private static boundOnGamePaused: () => void;
    private static boundOnGameResumed: () => void;

    public instanceId: string;
    public configId: string;
    public enemyConfig: EnemyConfig;
    private shootCooldownTimer: number = 0;
    private maxHealth: number; // Store scaled max health
    private baseSpeedMultiplier: number; // Store the base speed multiplier from difficulty/wave scaling

    // Slow effect properties
    private currentSlowMultiplier: number = 1.0; // 1.0 means no slow
    private slowEffectExpiryTime: number = 0; // Timestamp when the slow effect ends

    // Store injected instances
    private eventBus: EventBusType;
    private logger: LoggerType;

    // Static methods to be used as listeners
    private static onGamePaused(): void {
        EnemyEntity.isPaused = true;
        LoggerInstance.debug('EnemyEntity: Game paused state set to true');
    }

    private static onGameResumed(): void {
        EnemyEntity.isPaused = false;
        LoggerInstance.debug('EnemyEntity: Game paused state set to false');
    }

    // Static method to initialize event listeners for pause/resume
    public static initializeEventListeners(): void {
        // Assuming LoggerInstance is globally available as used in the original code.
        this.boundOnGamePaused = this.onGamePaused.bind(this); // 'this' refers to EnemyEntity class itself
        this.boundOnGameResumed = this.onGameResumed.bind(this);

        EventBusInstance.on(Events.GAME_PAUSED, this.boundOnGamePaused);
        EventBusInstance.on(Events.GAME_RESUMED, this.boundOnGameResumed);
    }

    // Static method to clean up event listeners for pause/resume
    public static cleanupEventListeners(): void {
        if (this.boundOnGamePaused) {
            EventBusInstance.off(Events.GAME_PAUSED, this.boundOnGamePaused);
        }
        if (this.boundOnGameResumed) {
            EventBusInstance.off(Events.GAME_RESUMED, this.boundOnGameResumed);
        }
        // Optionally nullify them after removing:
        // this.boundOnGamePaused = null;
        // this.boundOnGameResumed = null;
    }

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string,
        instanceId: string,
        config: EnemyConfig,
        maxHealth: number,
        speedMultiplier: number,
        eventBusInstance: EventBusType = EventBusInstance,
        loggerInstance: LoggerType = LoggerInstance
    ) {
        super(scene, x, y, texture);
        this.instanceId = instanceId;
        this.configId = config.id;
        this.enemyConfig = config;
        this.maxHealth = maxHealth;
        this.baseSpeedMultiplier = speedMultiplier;
        this.eventBus = eventBusInstance;
        this.logger = loggerInstance;

        if (this.enemyConfig.canShoot && this.enemyConfig.shootConfig) {
            this.shootCooldownTimer = Math.random() * this.enemyConfig.shootConfig.cooldownMs;
        }

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.05);

        if (config.movementPattern === 'bomber_dive' || config.id === 'hexagon_bomber') {
            this.setCollideWorldBounds(false);
        } else {
            this.setCollideWorldBounds(true);
        }
        this.setCircle(
            config.collisionRadius,
            -config.collisionRadius + this.width / 2,
            -config.collisionRadius + this.height / 2
        );
        const initialSpeed = config.baseSpeed * this.baseSpeedMultiplier;
        this.setVelocityX(initialSpeed * (Math.random() < 0.5 ? -1 : 1));
        this.setVelocityY(0);

        this.setData('instanceId', this.instanceId);
        this.setData('objectType', 'enemy');
        this.setData('configId', this.configId);

        this.handleApplySlowRequest = this.handleApplySlowRequest.bind(this);
        this.eventBus.on(Events.APPLY_SLOW_EFFECT, this.handleApplySlowRequest);

        this.logger.debug(`EnemyEntity created: ${this.configId} (Instance: ${this.instanceId})`);
    }

    public takeDamage(amount: number, maxHealth?: number): void {
        const currentMaxHealth = maxHealth ?? this.maxHealth;
        this.logger.debug(
            `Enemy ${this.instanceId} took ${amount} damage (visual placeholder). Max Health: ${currentMaxHealth}`
        );
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            if (this.tintTopLeft === 0xff0000) {
                this.clearTint();
            }
        });
    }

    // --- Getters for State ---
    public isSlowed(): boolean {
        return this.currentSlowMultiplier < 1.0;
    }

    public getSlowFactor(): number { // Renamed from getCurrentSlowMultiplier for consistency
        return this.currentSlowMultiplier;
    }

    public getSlowExpiryTime(): number {
        return this.currentSlowMultiplier < 1.0 ? this.slowEffectExpiryTime : 0;
    }

    // --- Public Accessors for Behavior Functions ---
    public getBaseSpeedMultiplier(): number {
        return this.baseSpeedMultiplier;
    }

    public getCurrentSlowMultiplier(): number { // Keep this specific getter for behavior
        return this.currentSlowMultiplier;
    }

    public getShootCooldownTimer(): number {
        return this.shootCooldownTimer;
    }

    public setShootCooldownTimer(value: number): void {
        this.shootCooldownTimer = value;
    }
    // --- End Accessors ---

    public destroySelf(): void {
        this.logger.debug(`Destroying EnemyEntity: ${this.instanceId}`);
        this.eventBus.off(Events.APPLY_SLOW_EFFECT, this.handleApplySlowRequest);
        this.disableBody(true, false);
        this.eventBus.emit(Events.REQUEST_ENEMY_DESTRUCTION_EFFECT, {
            configId: this.configId,
            x: this.x,
            y: this.y,
        });
        this.destroy();
    }

    // Pre-update loop delegates to behavior functions
    protected preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);

        if (!this.body || !this.active) {
            return;
        }

        if (!EnemyEntity.isPaused) {
            const behaviorContext = {
                entity: this,
                time: time,
                delta: delta,
                logger: this.logger,
                eventBus: this.eventBus,
            };
            handleMovement(behaviorContext);
            handleShooting(behaviorContext);
            checkOffScreen(behaviorContext);
            this.updateSlowEffect(time); // Keep slow effect update internal
        }
    }

    // --- Slow Effect Logic (Remains internal) ---
    private handleApplySlowRequest(data: ApplySlowEffectData): void {
        if (data.enemyInstanceIds.includes(this.instanceId)) {
            this.applySlow(data.slowFactor, data.durationMs);
        }
    }

    public applySlow(factor: number, durationMs: number): void {
        this.currentSlowMultiplier = factor;
        this.slowEffectExpiryTime = this.scene.time.now + durationMs;
        this.logger.debug(`Applied slow (Factor: ${factor}, Duration: ${durationMs}ms) to Enemy ${this.instanceId}. Expires at: ${this.slowEffectExpiryTime}`);
    }

    private updateSlowEffect(currentTime: number): void {
        if (this.currentSlowMultiplier < 1.0 && this.scene.time.now >= this.slowEffectExpiryTime) {
            this.logger.debug(`Slow effect expired for Enemy ${this.instanceId}.`);
            this.currentSlowMultiplier = 1.0;
            this.slowEffectExpiryTime = 0;
            if (this.tintTopLeft === 0xadd8e6) {
                this.clearTint();
            }
        }
    }
}
