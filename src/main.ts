import Phaser from 'phaser';

// Import the new scenes
import GameScene from './phaser/scenes/GameScene';
import UIScene from './phaser/scenes/UIScene';
import configLoader from './core/config/ConfigLoader'; // Import config loader
import logger from './core/utils/Logger'; // Import logger
import './style.css'; // Keep basic styling

// Phaser Game Configuration
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // Automatically choose WebGL or Canvas
  width: window.innerWidth, // Use window width
  height: window.innerHeight, // Use window height
  physics: {
    default: 'arcade', // Use Arcade Physics
    arcade: {
      gravity: { x: 0, y: 0 }, // No gravity needed for this type of game
      debug: false, // Set to true for physics debugging visuals
    },
  },
  scene: [GameScene, UIScene], // Load GameScene first, then UIScene in parallel
  parent: 'app', // ID of the DOM element to parent the canvas to
  scale: {
    mode: Phaser.Scale.RESIZE, // Resize game canvas to fill the browser window
    autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game canvas
  },
};

// Wrap game initialization in an async function to await config loading
async function initGame() {
  try {
    logger.log('Loading configurations...');
    await configLoader.loadAllConfigs();
    logger.log('Configurations loaded successfully.');

    // Create the Phaser game instance AFTER configs are loaded
    const game = new Phaser.Game(config);

    // Optional: Clean up the default Vite HTML content if not needed
    const appElement = document.querySelector<HTMLDivElement>('#app');
    if (appElement) {
      // Remove Vite's default content if the game canvas will fill the element
      // Or adjust as needed if you want to keep some surrounding HTML
      appElement.innerHTML = ''; // Clear the div so only the canvas is inside
    }

    // Export the game instance if needed elsewhere (optional)
    // Note: Exporting might be less useful now due to async init
    // Consider alternative ways to access the game instance if required globally
    // export default game; // Commenting out for now
  } catch (error) {
    logger.error('Failed to initialize game:', error);
    // Display error to the user?
    const appElement = document.querySelector<HTMLDivElement>('#app');
    if (appElement) {
      appElement.innerHTML = `<div style="color: red; padding: 20px;">
        <h2>Error Initializing Game</h2>
        <p>Could not load game configurations. Please check the console for details.</p>
        <pre>${error instanceof Error ? error.message : String(error)}</pre>
      </div>`;
    }
  }
}

// Start the game initialization process
initGame();

// --- Old synchronous initialization ---
// const game = new Phaser.Game(config);
// const appElement = document.querySelector<HTMLDivElement>('#app');
// if (appElement) {
//   appElement.innerHTML = '';
// }
// export default game;
