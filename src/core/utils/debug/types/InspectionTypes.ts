import { PlayerConfig } from '../../../config/schemas/playerSchema';
import { EnemyConfig, EnemyShootConfig } from '../../../config/schemas/enemySchema';
import { PowerupConfig } from '../../../config/schemas/powerupSchema';
import { WeaponConfig } from '../../../config/schemas/weaponSchema';

/**
 * Base interface for all inspected object data
 */
export interface InspectedObjectData {
  id: string;
  type: string;
  configData: any;
  standardProperties: Record<string, any>;
  otherProperties: Record<string, any>;
}

/**
 * Player-specific inspection data
 */
export interface PlayerInspectionData extends InspectedObjectData {
  configData: Partial<PlayerConfig>;
  standardProperties: {
    'Position X'?: string;
    'Position Y'?: string;
    'Velocity X'?: string;
    'Velocity Y'?: string;
    'Health'?: number;
    'Max Health'?: number;
    'Age (s)'?: string;
  };
  otherProperties: {
    'Is Invulnerable'?: boolean;
    'Invulnerability Timer (ms)'?: number;
    'Movement Direction'?: string;
  };
}

/**
 * Enemy-specific inspection data
 */
export interface EnemyInspectionData extends InspectedObjectData {
  configData: Partial<EnemyConfig>;
  standardProperties: {
    'Position X'?: string;
    'Position Y'?: string;
    'Velocity X'?: string;
    'Velocity Y'?: string;
    'Health'?: number;
    'Age (s)'?: string;
  };
  otherProperties: Record<string, any>;
}

/**
 * Projectile-specific inspection data
 */
export interface ProjectileInspectionData extends InspectedObjectData {
  configData: Partial<WeaponConfig | EnemyShootConfig>;
  standardProperties: {
    'Parent'?: string;
    'Position X'?: string;
    'Position Y'?: string;
    'Velocity X'?: string;
    'Velocity Y'?: string;
    'Age (s)'?: string;
    'Damage'?: number;
    'Radius'?: number;
  };
  otherProperties: {
    'Time To Explode (ms)'?: string;
  };
}

/**
 * Powerup-specific inspection data
 */
export interface PowerupInspectionData extends InspectedObjectData {
  configData: Partial<PowerupConfig>;
  standardProperties: {
    'Position X'?: string;
    'Position Y'?: string;
    'Age (s)'?: string;
  };
  otherProperties: Record<string, any>;
}

/**
 * Union type for all inspection data types
 */
export type AnyInspectionData = 
  | PlayerInspectionData 
  | EnemyInspectionData 
  | ProjectileInspectionData 
  | PowerupInspectionData;

/**
 * Format options for the debug data formatter
 */
export interface DebugFormatterOptions {
  includeNullValues?: boolean;
  maxDepth?: number;
  indentSize?: number;
}