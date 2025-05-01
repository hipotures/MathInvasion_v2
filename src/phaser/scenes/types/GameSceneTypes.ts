import Phaser from 'phaser';
import PlayerManager from '../../../core/managers/PlayerManager';
import InputManager from '../../../core/managers/InputManager';
import WeaponManager from '../../../core/managers/WeaponManager';
import ProjectileManager from '../../../core/managers/ProjectileManager';
import EconomyManager from '../../../core/managers/EconomyManager';
import { EnemyManager } from '../../../core/managers/EnemyManager';
import { PowerupManager } from '../../../core/managers/PowerupManager';
import DebugManager from '../../../core/managers/DebugManager';
import { EnemyEntity } from '../../entities/EnemyEntity';
import { ProjectileShape } from '../../handlers/event/ProjectileEventHandler';

/**
 * Interface for all game managers
 */
export interface GameManagers {
  playerManager: PlayerManager;
  inputManager: InputManager;
  weaponManager: WeaponManager;
  projectileManager: ProjectileManager;
  economyManager: EconomyManager;
  enemyManager: EnemyManager;
  powerupManager: PowerupManager;
  debugManager: DebugManager;
}

/**
 * Interface for game objects
 */
export interface GameObjects {
  playerSprite: Phaser.Physics.Arcade.Sprite;
  enemyGroup: Phaser.GameObjects.Group;
  projectileGroup: Phaser.GameObjects.Group;
  powerupGroup: Phaser.GameObjects.Group;
  enemySprites: Map<string, EnemyEntity>;
  projectileShapes: Map<string, ProjectileShape>;
  powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>;
}

/**
 * Interface for enemy spawn configuration
 */
export interface EnemySpawnConfig {
  type: string;
  position: { x: number; y: number };
}

/**
 * Interface for collision configuration
 */
export interface CollisionConfig {
  scene: Phaser.Scene;
  playerSprite: Phaser.Physics.Arcade.Sprite;
  enemyGroup: Phaser.GameObjects.Group;
  projectileGroup: Phaser.GameObjects.Group;
  powerupGroup: Phaser.GameObjects.Group;
}

/**
 * Interface for event handler configuration
 */
export interface EventHandlerConfig {
  scene: Phaser.Scene;
  playerSprite: Phaser.Physics.Arcade.Sprite;
  enemyGroup: Phaser.GameObjects.Group;
  projectileGroup: Phaser.GameObjects.Group;
  powerupGroup: Phaser.GameObjects.Group;
  enemySprites: Map<string, EnemyEntity>;
  projectileShapes: Map<string, ProjectileShape>;
  powerupSprites: Map<number, Phaser.Physics.Arcade.Sprite>;
}

/**
 * Interface for spawner configuration
 */
export interface SpawnerConfig {
  scene: Phaser.Scene;
  enemyManager: EnemyManager;
  worldBounds: {
    width: number;
    height: number;
  };
}