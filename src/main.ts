import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';

import GameScene from './phaser/scenes/GameScene';
import UIScene from './phaser/scenes/UIScene';
import configLoader from './core/config/ConfigLoader';
import logger from './core/utils/Logger';
import FontLoader from './core/utils/FontLoader';
import './style.css';

// Phaser Game Configuration
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
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
  backgroundColor: '#000000',
  pixelArt: true, // Enable pixel art mode (prevents blurry sprites)
  roundPixels: true, // Round pixel positions to avoid sub-pixel rendering
};

// Wrap game initialization in an async function to await config loading
async function initGame() {
  try {
    const appElement = document.querySelector<HTMLDivElement>('#app');
    if (appElement) {
      appElement.innerHTML = '<div style="color: white; padding: 20px; text-align: center;"><h2>Loading game...</h2></div>';
    }

    logger.log('Loading configurations...');
    await configLoader.loadAllConfigs();
    logger.log('Configurations loaded successfully.');

    logger.log('Loading web fonts...');
    try {
      await FontLoader.loadFonts();
      logger.log('Web fonts loaded successfully.');
    } catch (error) {
      logger.warn('Failed to load web fonts, falling back to system fonts:', error);
    }

    if (appElement) {
      appElement.innerHTML = '';
    }

    // Create the Phaser game instance AFTER configs are loaded
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const game = new Phaser.Game(config);
    
    logger.log('Phaser game instance created');
    
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

initGame();

registerSW({ immediate: true }); // immediate: true tries to register ASAP

// --- Old synchronous initialization ---
// const game = new Phaser.Game(config);
// const appElement = document.querySelector<HTMLDivElement>('#app');
// if (appElement) {
//   appElement.innerHTML = '';
// }
// export default game;
