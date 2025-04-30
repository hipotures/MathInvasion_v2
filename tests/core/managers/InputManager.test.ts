import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import InputManager from '../../../src/core/managers/InputManager'; // Default import
import { EventBus } from '../../../src/core/events/EventBus';
// Import Logger type if needed for type annotations, but use the mock instance for checks
// import { Logger } from '../../../src/core/utils/Logger';
import * as Events from '../../../src/core/constants/events';

// Mock dependencies
vi.mock('../../../src/core/events/EventBus');
// Mock the default export of Logger
vi.mock('../../../src/core/utils/Logger', () => ({
    default: { // Mock the default export object
        log: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }
}));
// Import the mocked default export for checks
import mockLoggerInstance from '../../../src/core/utils/Logger';

// Helper to create KeyboardEvent objects
const createKeyEvent = (key: string, type: 'keydown' | 'keyup', repeat = false): KeyboardEvent => {
    return new KeyboardEvent(type, { key: key, bubbles: true, cancelable: true, repeat: repeat });
};

describe('InputManager', () => {
    // Declare variables in the describe scope
    let inputManager: InputManager;
    let mockEventBus: EventBus;
    let emitSpy: ReturnType<typeof vi.spyOn>;
    let addListenerSpy: ReturnType<typeof vi.spyOn>;
    let removeListenerSpy: ReturnType<typeof vi.spyOn>;
    // Variables to capture listener functions
    let keyDownListener: (event: KeyboardEvent) => void;
    let keyUpListener: (event: KeyboardEvent) => void;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset the direct mock functions
        vi.mocked(mockLoggerInstance.log).mockClear();
        vi.mocked(mockLoggerInstance.debug).mockClear();
        vi.mocked(mockLoggerInstance.warn).mockClear();
        vi.mocked(mockLoggerInstance.error).mockClear();

        mockEventBus = new EventBus();

        emitSpy = vi.spyOn(mockEventBus, 'emit');

        // Mock window event listeners and capture handlers
        addListenerSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type: string, listener: EventListenerOrEventListenerObject | null) => {
            if (type === 'keydown' && typeof listener === 'function') {
                keyDownListener = listener as (event: KeyboardEvent) => void;
            } else if (type === 'keyup' && typeof listener === 'function') {
                keyUpListener = listener as (event: KeyboardEvent) => void;
            }
        });
        removeListenerSpy = vi.spyOn(window, 'removeEventListener');

        // Instantiate the manager (this will call addEventListener)
        inputManager = new InputManager(mockEventBus);

        // Ensure listeners were captured after instantiation
        expect(keyDownListener).toBeDefined();
        expect(keyUpListener).toBeDefined();
    });

    afterEach(() => {
        // Destroy might be called in tests, ensure it exists before calling again
        if (inputManager) {
            inputManager.destroy();
        }
        // Restore mocks related to window to avoid interference between tests
        addListenerSpy.mockRestore();
        removeListenerSpy.mockRestore();
    });

    it('should initialize and add keyboard listeners', () => {
        expect(inputManager).toBeDefined();
        // Use the mocked instance directly for checks
        expect(mockLoggerInstance.log).toHaveBeenCalledWith('InputManager initialized');
        expect(addListenerSpy).toHaveBeenCalledWith('keydown', keyDownListener); // Check with captured listener
        expect(addListenerSpy).toHaveBeenCalledWith('keyup', keyUpListener); // Check with captured listener
    });

    it('should emit MOVE_LEFT_START on "a" keydown', () => {
        const event = createKeyEvent('a', 'keydown');
        keyDownListener(event);
        expect(emitSpy).toHaveBeenCalledWith(Events.MOVE_LEFT_START);
        expect(emitSpy).toHaveBeenCalledTimes(1); // Ensure no duplicate emits on hold
        // Simulate hold - should not emit again
        const holdEvent = createKeyEvent('a', 'keydown', true);
        keyDownListener(holdEvent);
        expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit MOVE_LEFT_STOP on "a" keyup', () => {
        // Need to activate first
        keyDownListener(createKeyEvent('a', 'keydown'));
        emitSpy.mockClear(); // Clear emit from keydown

        const event = createKeyEvent('a', 'keyup');
        keyUpListener(event);
        expect(emitSpy).toHaveBeenCalledWith(Events.MOVE_LEFT_STOP);
    });

    it('should emit MOVE_RIGHT_START on "ArrowRight" keydown', () => {
        const event = createKeyEvent('ArrowRight', 'keydown');
        keyDownListener(event);
        expect(emitSpy).toHaveBeenCalledWith(Events.MOVE_RIGHT_START);
    });

    it('should emit MOVE_RIGHT_STOP on "ArrowRight" keyup', () => {
        keyDownListener(createKeyEvent('ArrowRight', 'keydown'));
        emitSpy.mockClear();
        const event = createKeyEvent('ArrowRight', 'keyup');
        keyUpListener(event);
        expect(emitSpy).toHaveBeenCalledWith(Events.MOVE_RIGHT_STOP);
    });

     it('should emit FIRE_START on " " (Space) keydown', () => {
        const event = createKeyEvent(' ', 'keydown');
        keyDownListener(event);
        expect(emitSpy).toHaveBeenCalledWith(Events.FIRE_START);
    });

    it('should emit FIRE_STOP on " " (Space) keyup', () => {
        keyDownListener(createKeyEvent(' ', 'keydown'));
        emitSpy.mockClear();
        const event = createKeyEvent(' ', 'keyup');
        keyUpListener(event);
        expect(emitSpy).toHaveBeenCalledWith(Events.FIRE_STOP);
    });

    it('should emit WEAPON_SWITCH with correct payload on "1" keydown', () => {
        const event = createKeyEvent('1', 'keydown');
        keyDownListener(event);
        expect(emitSpy).toHaveBeenCalledWith(Events.WEAPON_SWITCH, 'bullet');
    });

    it('should emit WEAPON_SWITCH with correct payload on "2" keydown', () => {
        const event = createKeyEvent('2', 'keydown');
        keyDownListener(event);
        expect(emitSpy).toHaveBeenCalledWith(Events.WEAPON_SWITCH, 'laser');
    });

    it('should emit WEAPON_SWITCH with correct payload on "3" keydown', () => {
        const event = createKeyEvent('3', 'keydown');
        keyDownListener(event);
        // Check the corrected behavior (sending string payload)
        expect(emitSpy).toHaveBeenCalledWith(Events.WEAPON_SWITCH, 'slow_field');
    });

    it('should emit REQUEST_WEAPON_UPGRADE on "u" keydown', () => {
        const event = createKeyEvent('u', 'keydown');
        keyDownListener(event);
        expect(emitSpy).toHaveBeenCalledWith(Events.REQUEST_WEAPON_UPGRADE);
    });

     it('should emit REQUEST_WEAPON_UPGRADE on "U" keydown', () => {
        const event = createKeyEvent('U', 'keydown');
        keyDownListener(event);
        expect(emitSpy).toHaveBeenCalledWith(Events.REQUEST_WEAPON_UPGRADE);
    });

    it('should not emit events if key is already active (keydown)', () => {
        keyDownListener(createKeyEvent('a', 'keydown')); // First press
        expect(emitSpy).toHaveBeenCalledTimes(1);
        keyDownListener(createKeyEvent('a', 'keydown')); // Second press (without repeat flag) - should still be ignored
        expect(emitSpy).toHaveBeenCalledTimes(1);
    });

     it('should not emit events if key is not active (keyup)', () => {
        keyUpListener(createKeyEvent('a', 'keyup')); // Keyup without keydown first
        expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should remove keyboard listeners on destroy', () => {
        inputManager.destroy(); // Call destroy explicitly for this test
        expect(removeListenerSpy).toHaveBeenCalledWith('keydown', keyDownListener);
        expect(removeListenerSpy).toHaveBeenCalledWith('keyup', keyUpListener);
        // Use the mocked instance directly for checks
        expect(mockLoggerInstance.log).toHaveBeenCalledWith('InputManager destroyed and listeners removed');
        // Set inputManager to null to prevent afterEach from calling destroy again
        inputManager = null!;
    });

});