import { describe, it, expect, beforeEach, vi, Mocked } from 'vitest';
import { InputManager } from '../../../src/core/managers/InputManager';
import { EventBus } from '../../../src/core/events/EventBus';
import { Logger } from '../../../src/core/utils/Logger';
import * as Events from '../../../src/core/constants/events';

// Mocks
vi.mock('../../../src/core/events/EventBus');
vi.mock('../../../src/core/utils/Logger');

// Mock the browser KeyboardEvent if needed (Vitest might handle this with jsdom)
// We'll simulate events manually for now

const mockEventBus = new EventBus() as Mocked<EventBus>;
const mockLogger = new Logger() as Mocked<Logger>;

describe('InputManager', () => {
  let inputManager: InputManager;
  let mockTargetElement: HTMLElement; // Simulate the event target

  // Helper to simulate keydown event
  const simulateKeyDown = (key: string) => {
    const event = new KeyboardEvent('keydown', { key: key });
    mockTargetElement.dispatchEvent(event);
  };

  // Helper to simulate keyup event
  const simulateKeyUp = (key: string) => {
    const event = new KeyboardEvent('keyup', { key: key });
    mockTargetElement.dispatchEvent(event);
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock target element for event listeners
    mockTargetElement = document.createElement('div'); // Or use window/document if appropriate
    document.body.appendChild(mockTargetElement); // Add to DOM for events to bubble if needed

    // Pass the mock target element to the constructor
    inputManager = new InputManager(mockEventBus, mockLogger, mockTargetElement);
    inputManager.init(); // Call init to attach listeners
  });

  afterEach(() => {
    inputManager.destroy(); // Clean up listeners
    document.body.removeChild(mockTargetElement); // Clean up mock element
  });

  it('should initialize and attach listeners', () => {
    expect(inputManager).toBeDefined();
    // Check if listeners were attached (Vitest doesn't easily track addEventListener mocks on elements)
    // We'll verify functionality through event simulation instead
  });

  // --- KeyDown Tests ---

  it('should emit MOVE_LEFT_START on ArrowLeft keydown', () => {
    simulateKeyDown('ArrowLeft');
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.MOVE_LEFT_START);
  });

  it('should emit MOVE_LEFT_START on "a" keydown', () => {
    simulateKeyDown('a');
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.MOVE_LEFT_START);
  });

  it('should emit MOVE_RIGHT_START on ArrowRight keydown', () => {
    simulateKeyDown('ArrowRight');
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.MOVE_RIGHT_START);
  });

  it('should emit MOVE_RIGHT_START on "d" keydown', () => {
    simulateKeyDown('d');
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.MOVE_RIGHT_START);
  });

  it('should emit FIRE_START on Space keydown', () => {
    simulateKeyDown(' '); // Space key
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.FIRE_START);
  });

  it('should emit WEAPON_SWITCH with "bullet" on "1" keydown', () => {
    simulateKeyDown('1');
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.WEAPON_SWITCH, { weaponId: 'bullet' });
  });

  it('should emit WEAPON_SWITCH with "laser" on "2" keydown', () => {
    simulateKeyDown('2');
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.WEAPON_SWITCH, { weaponId: 'laser' });
  });

  it('should emit WEAPON_SWITCH with "slow_field" on "3" keydown', () => {
    simulateKeyDown('3');
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.WEAPON_SWITCH, {
      weaponId: 'slow_field',
    });
  });

  it('should emit REQUEST_WEAPON_UPGRADE on "u" keydown', () => {
    simulateKeyDown('u');
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.REQUEST_WEAPON_UPGRADE);
  });

  it('should emit TOGGLE_DEBUG_MODE on "p" keydown', () => {
    simulateKeyDown('p');
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.TOGGLE_DEBUG_MODE);
  });

  // --- KeyUp Tests ---

  it('should emit MOVE_LEFT_STOP on ArrowLeft keyup', () => {
    simulateKeyDown('ArrowLeft'); // Start moving first
    simulateKeyUp('ArrowLeft');
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.MOVE_LEFT_STOP);
  });

  it('should emit MOVE_LEFT_STOP on "a" keyup', () => {
    simulateKeyDown('a');
    simulateKeyUp('a');
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.MOVE_LEFT_STOP);
  });

  it('should emit MOVE_RIGHT_STOP on ArrowRight keyup', () => {
    simulateKeyDown('ArrowRight');
    simulateKeyUp('ArrowRight');
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.MOVE_RIGHT_STOP);
  });

  it('should emit MOVE_RIGHT_STOP on "d" keyup', () => {
    simulateKeyDown('d');
    simulateKeyUp('d');
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.MOVE_RIGHT_STOP);
  });

  it('should emit FIRE_STOP on Space keyup', () => {
    simulateKeyDown(' ');
    simulateKeyUp(' ');
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.FIRE_STOP);
  });

  it('should not emit stop events if the corresponding key was not pressed', () => {
    simulateKeyUp('ArrowLeft'); // Keyup without keydown
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(Events.MOVE_LEFT_STOP);
    simulateKeyUp(' ');
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(Events.FIRE_STOP);
  });

  it('should handle multiple keys pressed and released correctly', () => {
    simulateKeyDown('a');
    simulateKeyDown('d'); // Press both left and right
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.MOVE_LEFT_START);
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.MOVE_RIGHT_START);

    simulateKeyUp('a'); // Release left
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.MOVE_LEFT_STOP);
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(Events.MOVE_RIGHT_STOP); // Right should still be active

    simulateKeyUp('d'); // Release right
    expect(mockEventBus.emit).toHaveBeenCalledWith(Events.MOVE_RIGHT_STOP);
  });

  it('should remove listeners on destroy', () => {
    // Spy on removeEventListener
    const removeSpy = vi.spyOn(mockTargetElement, 'removeEventListener');
    inputManager.destroy();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
    removeSpy.mockRestore(); // Clean up spy
  });
});
