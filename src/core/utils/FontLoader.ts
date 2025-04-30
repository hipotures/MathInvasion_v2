import WebFont from 'webfontloader';
import logger from './Logger';

/**
 * Utility class for loading web fonts
 */
export class FontLoader {
  private static fontsLoaded = false;
  private static loadPromise: Promise<void> | null = null;

  /**
   * Load web fonts
   * @returns Promise that resolves when fonts are loaded
   */
  public static loadFonts(): Promise<void> {
    if (this.fontsLoaded) {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise<void>((resolve, reject) => {
      WebFont.load({
        google: {
          families: ['Roboto:400,700', 'Open Sans:400,700']
        },
        active: () => {
          logger.log('Web fonts loaded');
          this.fontsLoaded = true;
          resolve();
        },
        inactive: () => {
          logger.warn('Web fonts could not be loaded');
          reject(new Error('Web fonts could not be loaded'));
        }
      });
    });

    return this.loadPromise;
  }

  /**
   * Check if fonts are loaded
   * @returns True if fonts are loaded
   */
  public static areFontsLoaded(): boolean {
    return this.fontsLoaded;
  }
}

export default FontLoader;