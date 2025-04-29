import Phaser from 'phaser';

export class HelloWorldScene extends Phaser.Scene {
  constructor() {
    // Scene key must be unique
    super('HelloWorldScene');
  }

  preload() {
    // Preload assets if needed (not required for simple text)
  }

  create() {
    // Add "Hello World" text to the center of the screen
    const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
    const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;

    this.add
      .text(screenCenterX, screenCenterY, 'Hello World!', {
        font: '48px Arial',
        color: '#ffffff', // White text
      })
      .setOrigin(0.5); // Center the text origin
  }

  update() {
    // Game logic updates go here (not needed for this simple scene)
  }
}
