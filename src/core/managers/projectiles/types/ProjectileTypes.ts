import { WeaponConfig } from '../../../config/schemas/weaponSchema';
import { EnemyShootConfig } from '../../../config/schemas/enemySchema';

export interface SpawnProjectileData {
  type: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  damage?: number;
  owner: 'player' | 'enemy';
  radius?: number;
  timeToExplodeMs?: number;
  weaponConfig?: WeaponConfig;
  enemyShootConfig?: NonNullable<EnemyShootConfig>;
}

export interface ProjectileHitEnemyData {
  projectileId: string;
  enemyInstanceId: string;
}

export interface ProjectileExplodeData {
  id: string;
  x: number;
  y: number;
  radius: number;
  damage: number;
  owner: 'player' | 'enemy';
  type: string;
}

export interface ProjectileCreatedEventData {
  id: string;
  type: string;
  x: number;
  y: number;
  owner: 'player' | 'enemy';
  velocityX: number;
  velocityY: number;
  visualShape: 'rectangle' | 'ellipse';
  visualWidth: number;
  visualHeight: number;
  visualColor: string;
}

export interface ProjectileLike {
  id: string;
  type: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  damage?: number;
  owner: 'player' | 'enemy';
  radius?: number;
  timeToExplodeMs?: number;
  creationTime: number;
  update: (dt: number) => void;
}

export interface ProjectileVisualProperties {
  shape: 'rectangle' | 'ellipse';
  width: number;
  height: number;
  color: string;
}

export interface ProjectilePhysicsProperties {
  velocityX: number;
  velocityY: number;
  radius?: number;
}

export interface ProjectileExplosionProperties {
  isExplosive: boolean;
  timeToExplodeMs?: number;
  radius?: number;
  damage?: number;
}

export const DEFAULT_VISUAL_PROPERTIES: ProjectileVisualProperties = {
  shape: 'rectangle',
  width: 5,
  height: 5,
  color: '0xffffff'
};