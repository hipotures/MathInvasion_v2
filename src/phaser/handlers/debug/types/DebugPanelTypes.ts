import Phaser from 'phaser';
import { EnemyEntity } from '../../../entities/EnemyEntity';
import { ProjectileShape } from '../../event/ProjectileEventHandler';

/**
 * Represents a game entity in the debug panel
 * Uses abbreviated property names to save space (T=Type, H=Health, etc.)
 */
export interface ActiveObjectData {
  ID: string | number;
  T: string;
  X: number;
  Y: number;
  H?: number;
  I?: boolean;
  Vx?: number;
  Vy?: number;
  A?: number;
}

/**
 * Structure for the legend
 */
export interface LegendData {
  [key: string]: string;
}

/**
 * Structure for active objects section
 */
export interface ActiveObjectsData {
  legend: LegendData;
  objects: ActiveObjectData[];
}

/**
 * Structure for weapon section
 */
export interface WeaponData {
  currentWeapon: string;
  level: number;
  cooldown: string;
}

/**
 * Structure for game section
 */
export interface GameData {
  enemyCount: number;
  projectileCount: number;
  powerupCount: number;
  currentWave: number;
  score: number;
  currency: number;
}

/**
 * Main data structure for the debug panel
 * Organizes information into logical sections for display
 */
export interface DebugPanelData {
  ActiveObjects: ActiveObjectsData;
  Weapon: WeaponData;
  Game: GameData;
}

/**
 * Configuration for data collectors
 */
export interface DataCollectorConfig {
  playerSprite?: Phaser.Physics.Arcade.Sprite;
  enemySprites?: Map<string, EnemyEntity>;
  projectileShapes?: Map<string, ProjectileShape>;
  powerupSprites?: Map<number, Phaser.Physics.Arcade.Sprite>;
}

/**
 * Contract for all data collector classes
 * Ensures consistent API across different entity collectors
 */
export interface DataCollector<T> {
  collectData(): T;
}