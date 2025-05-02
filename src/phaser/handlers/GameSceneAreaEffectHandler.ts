import Phaser from 'phaser';
import eventBus from '../../core/events/EventBus';
import logger from '../../core/utils/Logger';
import { EnemyEntity } from '../entities/EnemyEntity';
import * as Events from '../../core/constants/events';

// Define the structure for the PROJECTILE_EXPLODE event data
// TODO: Centralize this interface if used elsewhere
interface ProjectileExplodeData {
  id: string;
  x: number;
  y: number;
  radius: number;
  damage: number;
  owner: 'player' | 'enemy';
}

// Define payload for the new AoE event (ideally move to a shared types file)
interface RequestAreaEffectData {
  weaponId: string;
  x: number;
  y: number;
  range: number;
  durationMs: number;
  slowFactor?: number;
  // Add other potential AoE effects here (e.g., damageOverTime)
}

// Define payload for applying the slow effect (ideally move to a shared types file)
interface ApplySlowEffectData {
    enemyInstanceIds: string[];
    slowFactor: number;
    durationMs: number;
}


// Re-define necessary interfaces or import them if shared
// TODO: Centralize these interfaces
interface PlayerHitProjectileData {
  projectileId: string;
  damage: number;
}
interface ProjectileHitEnemyData {
  projectileId: string;
  enemyInstanceId: string;
  damage: number;
}

/**
 * Handles area effects within the game scene, specifically projectile explosions and slow fields.
 */
export class GameSceneAreaEffectHandler {
  private scene: Phaser.Scene;
  private playerSprite: Phaser.Physics.Arcade.Sprite;

  constructor(scene: Phaser.Scene, playerSprite: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene;
    this.playerSprite = playerSprite;

    this.handleProjectileExplode = this.handleProjectileExplode.bind(this);
    this.handleRequestAreaEffect = this.handleRequestAreaEffect.bind(this); // Bind new handler

    eventBus.on(Events.PROJECTILE_EXPLODE, this.handleProjectileExplode);
    eventBus.on(Events.REQUEST_AREA_EFFECT, this.handleRequestAreaEffect); // Listen for new event

    logger.log('GameSceneAreaEffectHandler initialized.');
  }

  private handleProjectileExplode(data: ProjectileExplodeData): void {
    logger.debug(
      `Handling explosion for projectile ${data.id} at (${data.x}, ${data.y}) with radius ${data.radius}`
    );

    // --- Explosion Visuals ---
    const explosionCore = this.scene.add.circle(data.x, data.y, data.radius * 0.1, 0xffffff, 1);
    const explosionRing = this.scene.add.circle(data.x, data.y, data.radius * 0.15, 0xff8800, 0.8);

    this.scene.tweens.add({
      targets: explosionCore,
      radius: data.radius * 0.3,
      alpha: 0,
      duration: 100,
      ease: 'Quad.easeOut',
      onComplete: () => {
        explosionCore.destroy();
      },
    });

    this.scene.tweens.add({
      targets: explosionRing,
      radius: data.radius,
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => {
        explosionRing.destroy();
      },
    });

    // --- Explosion Damage Logic ---
    this.scene.physics
      .overlapCirc(
        data.x,
        data.y,
        data.radius,
        true, // Check bodies
        false // Don't check static bodies
      )
      .forEach((body) => {
        const gameObject = body.gameObject;
        // Damage Enemies
        if (gameObject instanceof EnemyEntity && gameObject.active && gameObject.instanceId) {
          // TODO: Add check for bomb owner if friendly fire needs prevention
          logger.debug(
            `Explosion ${data.id} hit enemy ${gameObject.instanceId} within radius ${data.radius}`
          );
          const hitData: ProjectileHitEnemyData = {
            projectileId: data.id, // Use explosion ID as projectile ID for damage source
            enemyInstanceId: gameObject.instanceId,
            damage: data.damage,
          };
          eventBus.emit(Events.PROJECTILE_HIT_ENEMY, hitData);
        }
      });

    // Damage Player (if enemy explosion)
    if (data.owner === 'enemy' && this.playerSprite.active) {
      const distanceToPlayer = Phaser.Math.Distance.Between(
        data.x,
        data.y,
        this.playerSprite.x,
        this.playerSprite.y
      );
      // Check collision with player's body radius if available, otherwise just distance check
      const playerRadius = (this.playerSprite.body as Phaser.Physics.Arcade.Body)?.radius ?? this.playerSprite.width / 2;
      if (distanceToPlayer <= data.radius + playerRadius) {
        logger.debug(`Explosion ${data.id} hit player within radius ${data.radius}`);
        const hitData: PlayerHitProjectileData = {
          projectileId: data.id, // Use explosion ID as projectile ID for damage source
          damage: data.damage,
        };
        eventBus.emit(Events.PLAYER_HIT_PROJECTILE, hitData);
      }
    }
  }

  // --- Handler for the new Area Effect Request ---
  private handleRequestAreaEffect(data: RequestAreaEffectData): void {
    logger.debug(`Handling Area Effect Request: ${data.weaponId} at (${data.x}, ${data.y})`);

    if (data.weaponId === 'slow_field' && data.slowFactor !== undefined) {
      this.createSlowFieldEffect(data.x, data.y, data.range, data.durationMs, data.slowFactor);
    } else {
      logger.warn(`Unhandled area effect request for weapon: ${data.weaponId}`);
    }
  }

  // --- Specific Effect Implementation: Slow Field ---
  private createSlowFieldEffect(x: number, y: number, range: number, durationMs: number, slowFactor: number): void {
    logger.log(`Creating slow field: Range=${range}, Duration=${durationMs}ms, Factor=${slowFactor}`);

    // 1. Visual Representation (Optional, but helpful)
    const visualEffect = this.scene.add.circle(x, y, range, 0x0000ff, 0.2); // Semi-transparent blue circle
    visualEffect.setDepth(-1); // Render behind other entities
    this.scene.tweens.add({
      targets: visualEffect,
      alpha: { from: 0.3, to: 0.1 },
      scale: { from: 0.5, to: 1.0 },
      duration: 300, // Quick fade-in/expand effect
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Fade out the visual effect after a short delay.
        this.scene.tweens.add({
          targets: visualEffect,
          alpha: 0,
          duration: 500,
          delay: 200,
          onComplete: () => visualEffect.destroy()
        });
      }
    });

    // 2. Find Overlapping Enemies
    const affectedEnemies = new Set<string>(); // Track enemies hit to apply duration correctly
    this.scene.physics.overlapCirc(x, y, range, true, false)
      .forEach((body) => {
        const gameObject = body.gameObject;
        // Check if it's an active EnemyEntity
        if (gameObject instanceof EnemyEntity && gameObject.active && gameObject.instanceId) {
          affectedEnemies.add(gameObject.instanceId);
        }
      });

    // 3. Apply Slow Effect (Emit event for EnemyManager/EnemyEntity)
    if (affectedEnemies.size > 0) {
       logger.debug(`Slow field affecting enemies: ${Array.from(affectedEnemies).join(', ')}`);
       // Emit a single event with all affected IDs, duration, and factor
       const slowData: ApplySlowEffectData = {
          enemyInstanceIds: Array.from(affectedEnemies),
          slowFactor: slowFactor,
          durationMs: durationMs
       };
       eventBus.emit(Events.APPLY_SLOW_EFFECT, slowData);
    }
  }

  /** Clean up event listeners */
  public destroy(): void {
    eventBus.off(Events.PROJECTILE_EXPLODE, this.handleProjectileExplode);
    eventBus.off(Events.REQUEST_AREA_EFFECT, this.handleRequestAreaEffect); // Unregister new listener
    logger.log('GameSceneAreaEffectHandler destroyed and listeners removed');
  }
}
