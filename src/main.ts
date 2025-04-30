import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register'; // Import PWA registration

// Import the new scenes
import GameScene from './phaser/scenes/GameScene';
import UIScene from './phaser/scenes/UIScene';
import configLoader from './core/config/ConfigLoader'; // Import config loader
import logger from './core/utils/Logger'; // Import logger
import FontLoader from './core/utils/FontLoader'; // Import font loader
import './style.css'; // Keep basic styling

// Phaser Game Configuration
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // Automatically choose WebGL or Canvas
  width: 800, // Fixed game width
  height: 600, // Fixed game height
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
    mode: Phaser.Scale.FIT, // FIT mode to maintain aspect ratio
    autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game canvas
  },
  backgroundColor: '#000000', // Add a background color
  pixelArt: true, // Enable pixel art mode (prevents blurry sprites)
  roundPixels: true, // Round pixel positions to avoid sub-pixel rendering
};

// Wrap game initialization in an async function to await config loading
async function initGame() {
  try {
    // Add a visible message to the DOM before loading
    const appElement = document.querySelector<HTMLDivElement>('#app');
    if (appElement) {
      appElement.innerHTML = '<div style="color: white; padding: 20px; text-align: center;"><h2>Loading game...</h2></div>';
    }

    logger.log('Loading configurations...');
    await configLoader.loadAllConfigs();
    logger.log('Configurations loaded successfully.');

    // Load web fonts
    logger.log('Loading web fonts...');
    try {
      await FontLoader.loadFonts();
      logger.log('Web fonts loaded successfully.');
    } catch (error) {
      logger.warn('Failed to load web fonts, falling back to system fonts:', error);
    }

    // Clear the loading message
    if (appElement) {
      appElement.innerHTML = '';
    }

    // Create the Phaser game instance AFTER configs are loaded
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const game = new Phaser.Game(config);
    
    // Log when the game is created
    logger.log('Phaser game instance created');
    
    // Check if the canvas was created
    setTimeout(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        logger.log('Canvas element found in DOM');
        // Add a border to make it visible for debugging
        canvas.style.border = '2px solid red';
      } else {
        logger.error('No canvas element found in DOM after game initialization');
      }
    }, 1000);

  } catch (error) {
    logger.error('Failed to initialize game:', error);
    // Display error to the user
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

// Register the service worker
registerSW({ immediate: true }); // immediate: true tries to register ASAP

// --- Old synchronous initialization ---
// const game = new Phaser.Game(config);
// const appElement = document.querySelector<HTMLDivElement>('#app');
// if (appElement) {
//   appElement.innerHTML = '';
// }
// export default game;
