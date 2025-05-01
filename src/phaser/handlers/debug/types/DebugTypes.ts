import Phaser from 'phaser';
import { EnemyEntity } from '../../../entities/EnemyEntity';
import { ProjectileShape } from '../../event/ProjectileEventHandler';

/**
 * Represents an object that can be inspected in debug mode
 */
export interface InspectableObject {
  id: string;
  type: string;
}

/**
 * Represents the current inspection state
 */
export interface InspectionState {
  id: string | null;
  type: string | null;
}

/**
 * Data for the DEBUG_SHOW_INSPECTION_DETAILS event
 */
export interface InspectionDetailsData {
  html: string;
}

/**
 * Union type for all game objects that can be drawn with debug visuals
 */
export type DebugDrawableObject = Phaser.GameObjects.Sprite | EnemyEntity | ProjectileShape;

/**
 * Configuration for debug visualization
 */
export interface DebugVisualizationConfig {
  strokeColor: number;
  labelColor: string;
  lineWidth?: number;
}

/**
 * Configuration for object interactivity
 */
export interface InteractivityConfig {
  hitAreaPadding?: number;
  useHandCursor?: boolean;
  pixelPerfect?: boolean;
}

/**
 * Data for object destruction events
 */
export interface ObjectDestructionData {
  instanceId: string | number;
  type?: string;
}