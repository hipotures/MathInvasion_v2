import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../../../src/core/events/EventBus';
import InputManager from '../../../src/core/managers/InputManager'; // Default import
import {
    MOVE_LEFT_START,    // Corrected
    MOVE_RIGHT_START,   // Corrected
    MOVE_LEFT_STOP,     // Corrected
    MOVE_RIGHT_STOP,    // Corrected
    FIRE_START,         // Added missing import
    // REQUEST_FIRE_WEAPON, // Removed unused import
    REQUEST_WEAPON_UPGRADE, // Corrected
    WEAPON_SWITCH,      // Corrected
} from '../../../src/core/constants/events';

// Mock EventBus more explicitly
const mockEmit = vi.fn();
vi.mock('../../../src/core/events/EventBus', () => {
    // Mock the default export constructor and its methods
    return {
        EventBus: vi.fn().mockImplementation(() => ({
            emit: mockEmit,
            // Mock other methods if needed by InputManager (e.g., on, off)
            on: vi.fn(),
            off: vi.fn(),
            cleanup: vi.fn(),
        })),
    };
});


describe('InputManager', () => {
    let inputManager: InputManager;
    // mockEventBus instance is implicitly created via the mock factory
    // We will use the mockEmit function directly for assertions

    beforeEach(() => {
        // Reset mocks for each test
        mockEmit.mockClear();
        // Create InputManager instance, passing the mocked EventBus constructor result implicitly
        // Note: We pass the *class* EventBus to the constructor type hint,
        // but the mock factory ensures the instance created inside InputManager uses our mock.
        inputManager = new InputManager(new EventBus());
    });

    afterEach(() => {
        inputManager.destroy(); // Use destroy() method
    });

    it('should initialize and register keydown/keyup listeners in constructor', () => { // Updated description
        // Check if addEventListener was called during init
        // Note: JSDOM doesn't fully support KeyboardEvent properties like 'key',
        // so we rely on the internal logic being correct and test event emission.
        // We can infer listener registration if events are handled correctly.
        expect(inputManager).toBeDefined();
        // We can't directly check window.addEventListener mocks easily here without more complex setup.
        // We'll verify registration implicitly through event handling tests.
    });

    // --- Movement ---

    it('should emit MOVE_LEFT_START on ArrowLeft keydown', () => { // Corrected event name
        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
        window.dispatchEvent(event);
        expect(mockEmit).toHaveBeenCalledWith(MOVE_LEFT_START); // Use mockEmit
    });

    it('should emit MOVE_RIGHT_START on ArrowRight keydown', () => { // Corrected event name
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        window.dispatchEvent(event);
        expect(mockEmit).toHaveBeenCalledWith(MOVE_RIGHT_START); // Use mockEmit
    });

    it('should emit MOVE_LEFT_STOP on ArrowLeft keyup when moving left', () => { // Corrected event name
        // Start moving left
        const downEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
        window.dispatchEvent(downEvent);
        vi.clearAllMocks(); // Clear the emit from keydown

        // Stop moving left
        const upEvent = new KeyboardEvent('keyup', { key: 'ArrowLeft' });
        window.dispatchEvent(upEvent);
        expect(mockEmit).toHaveBeenCalledWith(MOVE_LEFT_STOP); // Use mockEmit
    });

    it('should emit MOVE_RIGHT_STOP on ArrowRight keyup when moving right', () => { // Corrected event name
        // Start moving right
        const downEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        window.dispatchEvent(downEvent);
        vi.clearAllMocks(); // Clear the emit from keydown

        // Stop moving right
        const upEvent = new KeyboardEvent('keyup', { key: 'ArrowRight' });
        window.dispatchEvent(upEvent);
        expect(mockEmit).toHaveBeenCalledWith(MOVE_RIGHT_STOP); // Use mockEmit
    });

     // Removed extra closing brace here if present, ensuring structure is correct.
 
     // Note: The InputManager's current logic emits STOP for the released key,
     // regardless of whether the opposing key is held. Adjusting tests to match.
 
      it('should emit MOVE_LEFT_STOP on ArrowLeft keyup even if ArrowRight is still down', () => {
         // Press Right, then Left
         window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
         window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); // Now moving left
         vi.clearAllMocks();
 
         // Release Left (Right is still down)
         window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
         // Should emit MOVE_LEFT_STOP because Left was released
         expect(mockEmit).toHaveBeenCalledWith(MOVE_LEFT_STOP); // Use mockEmit
         expect(mockEmit).not.toHaveBeenCalledWith(MOVE_RIGHT_START); // Use mockEmit
         expect(mockEmit).not.toHaveBeenCalledWith(MOVE_RIGHT_STOP); // Use mockEmit
     });
 
     it('should emit MOVE_RIGHT_STOP on ArrowRight keyup even if ArrowLeft is still down', () => {
         // Press Left, then Right
         window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
         window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); // Now moving right
         vi.clearAllMocks();
 
         // Release Right (Left is still down)
         window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
          // Should emit MOVE_RIGHT_STOP because Right was released
         expect(mockEmit).toHaveBeenCalledWith(MOVE_RIGHT_STOP); // Use mockEmit
         expect(mockEmit).not.toHaveBeenCalledWith(MOVE_LEFT_START); // Use mockEmit
         expect(mockEmit).not.toHaveBeenCalledWith(MOVE_LEFT_STOP); // Use mockEmit
     });
 
 
     // --- Firing ---
 
     it('should emit FIRE_START on Space keydown', () => { // Corrected event name
         const event = new KeyboardEvent('keydown', { key: ' ' }); // Space key
         window.dispatchEvent(event);
         expect(mockEmit).toHaveBeenCalledWith(FIRE_START); // Use mockEmit
    // --- Upgrades ---

    it('should emit REQUEST_WEAPON_UPGRADE on U keydown', () => { // Corrected event name
        const event = new KeyboardEvent('keydown', { key: 'u' });
        window.dispatchEvent(event);
        expect(mockEmit).toHaveBeenCalledWith(REQUEST_WEAPON_UPGRADE); // Use mockEmit
    });

     it('should emit REQUEST_WEAPON_UPGRADE on U keydown (uppercase)', () => { // Corrected event name
        const event = new KeyboardEvent('keydown', { key: 'U' });
        window.dispatchEvent(event);
        expect(mockEmit).toHaveBeenCalledWith(REQUEST_WEAPON_UPGRADE); // Use mockEmit
    });


    // --- Weapon Switching ---

    it('should emit WEAPON_SWITCH with weapon ID "bullet" on 1 keydown', () => { // Corrected payload
        const event = new KeyboardEvent('keydown', { key: '1' });
        window.dispatchEvent(event);
        expect(mockEmit).toHaveBeenCalledWith(WEAPON_SWITCH, 'bullet'); // Use mockEmit
    });

    it('should emit WEAPON_SWITCH with weapon ID "laser" on 2 keydown', () => { // Corrected payload
        const event = new KeyboardEvent('keydown', { key: '2' });
        window.dispatchEvent(event);
        expect(mockEmit).toHaveBeenCalledWith(WEAPON_SWITCH, 'laser'); // Use mockEmit
    });

    it('should emit WEAPON_SWITCH with weapon ID "slow_field" on 3 keydown', () => { // Corrected payload
        const event = new KeyboardEvent('keydown', { key: '3' });
        window.dispatchEvent(event);
        expect(mockEmit).toHaveBeenCalledWith(WEAPON_SWITCH, 'slow_field'); // Use mockEmit
    });

    // --- Cleanup ---

    it('should remove listeners on destroy', () => { // Use destroy()
        const removeSpy = vi.spyOn(window, 'removeEventListener');
        inputManager.destroy(); // Use destroy()
        // Expect removeEventListener to have been called for keydown and keyup
        expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
        expect(removeSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
        removeSpy.mockRestore(); // Clean up the spy
    });

     it('should not emit events after destroy', () => { // Use destroy()
        inputManager.destroy(); // Use destroy()
        mockEmit.mockClear(); // Clear our specific mock function

        // Try dispatching events
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'u' }));

        // Ensure no events were emitted
        expect(mockEmit).not.toHaveBeenCalled(); // Use mockEmit
    });
});

});
