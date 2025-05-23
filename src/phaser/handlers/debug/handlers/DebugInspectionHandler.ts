import Phaser from 'phaser';
import eventBus from '../../../../core/events/EventBus';
import logger from '../../../../core/utils/Logger';
import * as Events from '../../../../core/constants/events';
import { DebugObjectInspector } from '../../../../core/utils/debug/DebugObjectInspector';
import { InspectionState, InspectionDetailsData } from '../types/DebugTypes';
import { EnemyEntity } from '../../../entities/EnemyEntity';

/**
 * Handles debug inspection for game objects
 * Responsible for managing inspection state and coordinating with DebugObjectInspector
 */
export class DebugInspectionHandler {
  private debugObjectInspector: DebugObjectInspector;
  // Store the actual GameObject along with ID and type
  private inspectedObject: {
    id: string | null;
    type: string | null;
    gameObject: Phaser.GameObjects.GameObject | null;
  } = { id: null, type: null, gameObject: null };

  constructor(debugObjectInspector: DebugObjectInspector) {
    this.debugObjectInspector = debugObjectInspector;

    // Bind methods
    this.handleObjectDestroyed = this.handleObjectDestroyed.bind(this);
    
    // Listen for object destruction to stop inspecting if needed
    eventBus.on(Events.ENEMY_DESTROYED, (eventData: { instanceId: string }) =>
      this.handleObjectDestroyed(eventData.instanceId, 'enemy'));
    eventBus.on(Events.PROJECTILE_DESTROYED, (eventData: { id: string }) =>
      this.handleObjectDestroyed(eventData.id, 'projectile'));
    // Listen for powerup collection and out-of-bounds events
    eventBus.on(Events.POWERUP_COLLECTED, (eventData: { instanceId: number }) =>
      this.handleObjectDestroyed(String(eventData.instanceId), 'powerup'));
    eventBus.on(Events.POWERUP_OUT_OF_BOUNDS, (eventData: { instanceId: number }) =>
      this.handleObjectDestroyed(String(eventData.instanceId), 'powerup'));
    // Fix POWERUP_EXPIRED listener (data structure mismatch and logic)
    eventBus.on(Events.POWERUP_EXPIRED, (eventData: { configId: string }) => {
      // If we're inspecting a powerup, stop inspection when any powerup effect expires
      // This is a fallback and may not be exact, but better than showing errors
      if (this.inspectedObject.type === 'powerup') {
        logger.debug(`Powerup effect expired (Config ID: ${eventData.configId}). Stopping inspection if a powerup was selected.`);
        this.stopInspecting();
      }
    });
    eventBus.on(Events.PLAYER_DIED, () =>
      this.handleObjectDestroyed('player', 'player'));
  }

  /**
   * Handles a click on a game object
   * @param gameObject The game object that was clicked
   * @returns Whether the inspection state changed
   */
  public handleObjectClick(gameObject: Phaser.GameObjects.GameObject): boolean {
    // Determine objectId and objectType from the gameObject
    let objectId: string | null = null;
    let objectType: string | null = null;
    let specificData: any = {}; // Declare variable to hold extra data for inspector

    if (gameObject.name === 'player') {
      objectId = 'player';
      objectType = 'player';
      logger.debug("Player clicked!");
    } else if (gameObject instanceof EnemyEntity) {
      objectId = gameObject.instanceId;
      objectType = 'enemy';
      logger.debug("Enemy clicked:", objectId);
    // Check if the gameObject has projectile data set using getData
    } else if (gameObject.getData('objectType') === 'projectile' && gameObject.getData('instanceId') !== undefined) {
      objectId = gameObject.getData('instanceId');
      objectType = 'projectile';
      // Store projectile type if needed by inspector
      specificData = { projectileType: gameObject.getData('projectileType') || 'unknown' };
      logger.debug("Projectile clicked:", objectId);
    // Check if the gameObject has powerup data set using getData
    } else if (gameObject.getData('objectType') === 'powerup' && gameObject.getData('instanceId') !== undefined) {
      objectId = String(gameObject.getData('instanceId')); // Ensure string ID
      objectType = 'powerup';
      // Store configId if needed by inspector
      specificData = { configId: gameObject.getData('configId') };
      logger.debug("Powerup clicked:", objectId);
    }

    if (!objectId || !objectType) {
      logger.warn('Clicked on an unknown debug object:', gameObject);
      logger.debug("Unknown object clicked!");
      return false;
    }

    logger.debug(`Debug inspect requested for ${objectType} ID: ${objectId}`);

    // If clicking the same object again, stop inspecting
    if (this.inspectedObject.id === objectId && this.inspectedObject.type === objectType) {
      this.stopInspecting();
      return true;
    }

    // Stop inspecting previous object if any
    if (this.inspectedObject.id) {
      this.stopInspecting(false); // Don't emit stop event yet, just clear state
    }

    // Set new inspected object (for highlighting and re-fetching data)
    this.inspectedObject = { id: objectId, type: objectType, gameObject: gameObject };

    // Get raw details object from the inspector
    // Pass the gameObject directly and the current time (Date.now())
    const rawData = this.debugObjectInspector.getObjectDetails(gameObject, Date.now());

    // Emit event with the raw data object for the panel
    if (rawData) {
      // Use the updated InspectionDetailsData structure
      const detailsData: InspectionDetailsData = { data: rawData };
      eventBus.emit(Events.DEBUG_SHOW_INSPECTION_DETAILS, detailsData);
    } else {
      // Handle case where details couldn't be fetched
      // Emit null data to signal the panel to show an error or revert
      const errorEventData: InspectionDetailsData = { data: null };
      eventBus.emit(Events.DEBUG_SHOW_INSPECTION_DETAILS, errorEventData);
      // Optionally, log a more specific error message here if needed
      logger.warn(`Could not get details for ${objectType} ${objectId}. Emitting null data.`);
      // Clear inspection state if data fetch failed
      this.inspectedObject = { id: null, type: null, gameObject: null };
    }

    return true;
  }

  /**
   * Stops inspecting the current object
   * @param emitEvent Whether to emit the stop inspecting event
   */
  public stopInspecting(emitEvent = true): void {
    if (!this.inspectedObject.id) return; // Nothing to stop

    logger.debug(`Stopping debug inspection for ${this.inspectedObject.type} ID: ${this.inspectedObject.id}`);
    const previouslyInspected = { ...this.inspectedObject }; // Clone before clearing
    this.inspectedObject = { id: null, type: null, gameObject: null }; // Clear state

    if (emitEvent) {
      eventBus.emit(Events.DEBUG_STOP_INSPECTING);
    }
  }

  /**
   * Handles the destruction of an object that might be inspected
   * @param objectId The ID of the destroyed object
   * @param objectType The type of the destroyed object
   */
  private handleObjectDestroyed(objectId: string, objectType: string): void {
    if (this.inspectedObject.id === objectId && this.inspectedObject.type === objectType) {
      logger.debug(`Inspected object ${objectType} ID: ${objectId} was destroyed. Stopping inspection.`);
      this.stopInspecting(); // Stop inspecting and emit event
    }
  }

  /**
   * Gets the current inspection state
   * @returns The current inspection state (ID and Type only)
   */
  public getInspectionState(): InspectionState {
    // Return only ID and Type for compatibility with visualization handler
    return { id: this.inspectedObject.id, type: this.inspectedObject.type };
  }

  /**
   * Gets the currently inspected GameObject
   * @returns The GameObject or null if none is inspected
   */
  public getInspectedGameObject(): Phaser.GameObjects.GameObject | null {
    return this.inspectedObject.gameObject;
  }

  /**
   * Cleans up resources used by this handler
   */
  public destroy(): void {
    // Remove object destruction listeners
    eventBus.off(Events.ENEMY_DESTROYED, (eventData: { instanceId: string }) => 
      this.handleObjectDestroyed(eventData.instanceId, 'enemy'));
    eventBus.off(Events.PROJECTILE_DESTROYED, (eventData: { id: string }) =>
      this.handleObjectDestroyed(eventData.id, 'projectile'));
    // Remove new listeners
    eventBus.off(Events.POWERUP_COLLECTED, (eventData: { instanceId: number }) =>
      this.handleObjectDestroyed(String(eventData.instanceId), 'powerup'));
    eventBus.off(Events.POWERUP_OUT_OF_BOUNDS, (eventData: { instanceId: number }) =>
      this.handleObjectDestroyed(String(eventData.instanceId), 'powerup'));
    // Remove fixed POWERUP_EXPIRED listener
    eventBus.off(Events.POWERUP_EXPIRED, (eventData: { configId: string }) => {
      if (this.inspectedObject.type === 'powerup') {
        this.stopInspecting();
      }
    });
    eventBus.off(Events.PLAYER_DIED, () =>
      this.handleObjectDestroyed('player', 'player'));
    
    // Ensure inspection is stopped
    this.stopInspecting(false); // Stop without emitting event
  }
}