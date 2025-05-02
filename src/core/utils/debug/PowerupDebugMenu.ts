import { EventBus } from '../../events/EventBus';
import * as Events from '../../constants/events';
import { PowerupConfig } from '../../config/schemas/powerupSchema';
import logger from '../Logger';
import debugState from '../DebugState';

export class PowerupDebugMenu {
  private container!: HTMLDivElement;
  private dropdownButton!: HTMLDivElement;
  private dropdownContent!: HTMLDivElement;
  private eventBus: EventBus;
  private powerupsConfig: PowerupConfig[];
  private isVisible: boolean = false;

  constructor(eventBus: EventBus, powerupsConfig: PowerupConfig[]) {
    this.eventBus = eventBus;
    // Ensure powerupsConfig is an array, provide empty array if not
    this.powerupsConfig = Array.isArray(powerupsConfig) ? powerupsConfig : [];
    this.setupUI();

    // Listen for debug mode changes
    this.eventBus.on(Events.DEBUG_MODE_CHANGED, this.handleDebugModeChanged.bind(this));
    // Set initial visibility based on current debug state
    this.setVisible(debugState.isDebugMode);
  }

  private setupUI() {
    // Create container
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.top = '10px';
    this.container.style.left = '50%';
    this.container.style.transform = 'translateX(-50%)';
    this.container.style.zIndex = '1000'; // Ensure it's above other UI
    this.container.style.display = 'none'; // Initially hidden
    this.container.style.fontFamily = 'Arial, sans-serif';

    // Create dropdown button
    this.dropdownButton = document.createElement('div');
    this.dropdownButton.textContent = 'Powerups ▼';
    this.dropdownButton.style.backgroundColor = '#444';
    this.dropdownButton.style.color = '#fff';
    this.dropdownButton.style.padding = '8px 12px';
    this.dropdownButton.style.cursor = 'pointer';
    this.dropdownButton.style.borderRadius = '4px';
    this.dropdownButton.style.userSelect = 'none'; // Prevent text selection

    // Create dropdown content
    this.dropdownContent = document.createElement('div');
    this.dropdownContent.style.display = 'none';
    this.dropdownContent.style.position = 'absolute';
    this.dropdownContent.style.backgroundColor = '#333';
    this.dropdownContent.style.minWidth = '160px';
    this.dropdownContent.style.boxShadow = '0px 8px 16px 0px rgba(0,0,0,0.2)';
    this.dropdownContent.style.zIndex = '1'; // Ensure dropdown is above button
    this.dropdownContent.style.marginTop = '2px'; // Small gap
    this.dropdownContent.style.borderRadius = '4px';
    this.dropdownContent.style.maxHeight = '200px'; // Limit height and add scroll
    this.dropdownContent.style.overflowY = 'auto';

    // Add powerup options
    if (this.powerupsConfig.length > 0) {
      this.powerupsConfig.forEach(powerup => {
        const option = document.createElement('div');
        option.textContent = powerup.name;
        option.style.padding = '10px 14px';
        option.style.color = '#fff';
        option.style.cursor = 'pointer';
        option.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent container click from closing dropdown immediately
          this.spawnPowerup(powerup.id);
        });
        option.addEventListener('mouseenter', () => {
          option.style.backgroundColor = '#555';
        });
        option.addEventListener('mouseleave', () => {
          option.style.backgroundColor = ''; // Use default background
        });
        this.dropdownContent.appendChild(option);
      });
    } else {
      const noOptions = document.createElement('div');
      noOptions.textContent = 'No powerups configured';
      noOptions.style.padding = '10px 14px';
      noOptions.style.color = '#aaa';
      this.dropdownContent.appendChild(noOptions);
    }


    // Add event listeners
    this.dropdownButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent body click listener from closing immediately
      this.toggleDropdown();
    });

    // Close dropdown if clicked outside
    document.addEventListener('click', (e) => {
      if (this.isVisible && !this.container.contains(e.target as Node)) {
        this.dropdownContent.style.display = 'none';
      }
    });

    // Assemble UI
    this.container.appendChild(this.dropdownButton);
    this.container.appendChild(this.dropdownContent);
    document.body.appendChild(this.container);
  }

  private toggleDropdown() {
    const isOpen = this.dropdownContent.style.display === 'block';
    this.dropdownContent.style.display = isOpen ? 'none' : 'block';
    this.dropdownButton.textContent = isOpen ? 'Powerups ▼' : 'Powerups ▲';
  }

  private spawnPowerup(powerupId: string) {
    // Generate position at top of screen with random X
    const canvas = document.querySelector('canvas');
    let x = 400, y = 0; // Default fallback X, Y at top

    // Use assumed game width (800) for random X calculation
    const gameWidth = 800;
    x = Math.random() * gameWidth;
    // Y position slightly above the top edge to mimic falling in
    y = -10;

    // Note: We could try getting width from Phaser's scale manager if available,
    // but using the assumed width is simpler for now.
    // if (canvas) {
    //   const rect = canvas.getBoundingClientRect();
    //   x = Math.random() * rect.width;
    //   y = -10;
    // }

    logger.debug(`Debug: Spawning powerup ${powerupId} at (${x.toFixed(0)}, ${y})`);

    // Emit event to request powerup spawn
    this.eventBus.emit(Events.REQUEST_SPAWN_POWERUP, {
      x,
      y,
      enemyId: 'debug-spawn', // Mark as debug-spawned
      powerupId // Specify which powerup to spawn
    });

    // Close dropdown after selection
    this.dropdownContent.style.display = 'none';
    this.dropdownButton.textContent = 'Powerups ▼'; // Reset button text
  }

  private handleDebugModeChanged(data: { isDebugMode: boolean }): void {
    this.setVisible(data.isDebugMode);
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.container.style.display = visible ? 'block' : 'none';
    // Ensure dropdown is closed when UI becomes visible/hidden
    if (!visible) {
        this.dropdownContent.style.display = 'none';
        this.dropdownButton.textContent = 'Powerups ▼';
    }
  }

  public destroy(): void {
    this.eventBus.off(Events.DEBUG_MODE_CHANGED, this.handleDebugModeChanged.bind(this));

    // Remove event listeners from document? Might be tricky if multiple instances exist.
    // For simplicity, assuming only one instance and not removing body listener.

    if (document.body.contains(this.container)) {
      document.body.removeChild(this.container);
    }
    logger.log('PowerupDebugMenu destroyed.');
  }
}