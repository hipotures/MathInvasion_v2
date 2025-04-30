// Main Event Handler - Delegates to sub-handlers
import Phaser from 'phaser';
import logger from '../../core/utils/Logger';
import { EnemyEntity } from '../entities/EnemyEntity';
import { PlayerEventHandler } from './event/PlayerEventHandler';
import { ProjectileEventHandler } from './event/ProjectileEventHandler';
import { EnemyEventHandler } from './event/EnemyEventHandler';

export class GameSceneEventHandler {
  // Sub-handlers
  private playerEventHandler: PlayerEventHandler;
  private projectileEventHandler: ProjectileEventHandler;
  private enemyEventHandler: EnemyEventHandler;

  // References needed by sub-handlers
  private enemySpawnerTimerRef?: Phaser.Time.TimerEvent;

  constructor(
    scene: Phaser.Scene,
    playerSprite: Phaser.Physics.Arcade.Sprite,
    projectileGroup: Phaser.GameObjects.Group,
    enemyGroup: Phaser.GameObjects.Group,
    enemySprites: Map<string, EnemyEntity>,
    projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite>
  ) {
    // Instantiate sub-handlers
    this.playerEventHandler = new PlayerEventHandler(scene, playerSprite);
    this.projectileEventHandler = new ProjectileEventHandler(
      scene,
      playerSprite,
      projectileGroup,
      projectileSprites
    );
    this.enemyEventHandler = new EnemyEventHandler(scene, enemyGroup, enemySprites);

    logger.log('GameSceneEventHandler initialized with sub-handlers.');
  }

  // Pass references to sub-handlers that need them
  public setEnemySpawnerTimer(timer: Phaser.Time.TimerEvent): void {
    this.enemySpawnerTimerRef = timer;
    // Pass it down to the player handler which uses it on death
    this.playerEventHandler.setEnemySpawnerTimer(timer);
  }

  /** Clean up event listeners by destroying sub-handlers */
  public destroy(): void {
    this.playerEventHandler.destroy();
    this.projectileEventHandler.destroy();
    this.enemyEventHandler.destroy();
    logger.log('GameSceneEventHandler destroyed, called destroy on sub-handlers.');
  }
}
// Removed all individual handle methods as they now reside in sub-handlers
// Removed all direct event listener registrations/unregistrations
