import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';

import GameScene from './phaser/scenes/GameScene';
import UIScene from './phaser/scenes/UIScene';
import configLoader from './core/config/ConfigLoader';
import logger from './core/utils/Logger';
import FontLoader from './core/utils/FontLoader';
import eventBus from './core/events/EventBus';
import './style.css';

/**
 * Parse aspect ratio string (e.g., "16:9") to a number
 */
function parseAspectRatio(ratioStr: string): number {
  const [width, height] = ratioStr.split(':').map(Number);
  return width / height;
}

// We only support portrait mode (9:16)

/**
 * Calculate the optimal game size based on window dimensions and aspect ratio
 */
function calculateGameSize(aspectRatio: number, maxWidth: number, maxHeight: number): { width: number, height: number } {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Calculate dimensions while maintaining aspect ratio
  let width, height;
  
  // First, calculate based on window dimensions
  if (windowWidth / windowHeight > aspectRatio) {
    // Window is wider than needed - height is the limiting factor
    height = windowHeight;
    width = height * aspectRatio;
  } else {
    // Window is taller than needed - width is the limiting factor
    width = windowWidth;
    height = width / aspectRatio;
  }
  
  // Then, apply maximum constraints if needed
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  
  // Round to nearest integer to avoid sub-pixel rendering issues
  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}

// Initial game configuration - will be updated with display settings
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,  // Default width, will be updated
  height: 600, // Default height, will be updated
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
    mode: Phaser.Scale.FIT, // Use FIT mode to maintain aspect ratio
    autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game canvas
    width: 720, // Default width for portrait mode
    height: 1280, // Default height for portrait mode
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

    // Load display configuration
    const displayConfig = configLoader.getDisplayConfig();
    
    // Always use portrait mode (9:16)
    const aspectRatioStr = displayConfig.aspect_ratio.default; // Should be '9:16'
    const aspectRatio = parseAspectRatio(aspectRatioStr);
    
    // Get max resolution
    const maxWidth = displayConfig.max_resolution.width;
    const maxHeight = displayConfig.max_resolution.height;
    
    logger.log(`Using fixed portrait aspect ratio: ${aspectRatioStr}`);
    
    // Set the game size based on the max resolution from config
    const gameWidth = Math.min(maxWidth, window.innerWidth);
    const gameHeight = Math.min(maxHeight, window.innerHeight);
    
    // Update the config
    config.width = gameWidth;
    config.height = gameHeight;
    
    // Make sure scale is defined
    if (typeof config.scale === 'object') {
      config.scale.width = gameWidth;
      config.scale.height = gameHeight;
    }
    
    logger.log(`Setting game size to ${gameWidth}x${gameHeight} (${displayConfig.aspect_ratio.default} aspect ratio, max: ${maxWidth}x${maxHeight})`);
    
    // Create the Phaser game instance AFTER configs are loaded
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const game = new Phaser.Game(config);
    
    logger.log('Phaser game instance created');
    
    // Handle window resize
    window.addEventListener('resize', () => {
      // The Phaser.Scale.FIT mode will automatically handle resizing while maintaining aspect ratio
      const canvas = game.canvas;
      logger.log(`Window resized, canvas size: ${canvas.width}x${canvas.height}`);
      
      // Emit canvas resized event for UI components
      eventBus.emit('CANVAS_RESIZED', { width: canvas.width, height: canvas.height });
    });
    
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
