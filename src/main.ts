import Phaser from 'phaser';

import { HelloWorldScene } from './phaser/scenes/HelloWorldScene';
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
  scene: [HelloWorldScene], // Add scenes here
  parent: 'app', // ID of the DOM element to parent the canvas to
  scale: {
    mode: Phaser.Scale.RESIZE, // Resize game canvas to fill the browser window
    autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game canvas
  },
};

// Create the Phaser game instance
const game = new Phaser.Game(config);

// Optional: Clean up the default Vite HTML content if not needed
const appElement = document.querySelector<HTMLDivElement>('#app');
if (appElement) {
  // Remove Vite's default content if the game canvas will fill the element
  // Or adjust as needed if you want to keep some surrounding HTML
  appElement.innerHTML = ''; // Clear the div so only the canvas is inside
}

// Export the game instance if needed elsewhere (optional)
export default game;
