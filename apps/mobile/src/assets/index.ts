/**
 * Asset Management System
 * Centralized asset configuration and management
 */

import { ImageSourcePropType } from 'react-native';

// Asset type definitions
export interface AssetConfig {
  logos: {
    full: ImageSourcePropType;
    icon: ImageSourcePropType;
    light: ImageSourcePropType;
    dark: ImageSourcePropType;
  };
  icons: Record<string, ImageSourcePropType>;
  animations: Record<string, any>; // Lottie animations
}

export interface LogoVariant {
  full: ImageSourcePropType;
  icon: ImageSourcePropType;
  light: ImageSourcePropType;
  dark: ImageSourcePropType;
}

// Default asset configuration
export const defaultAssets: AssetConfig = {
  logos: {
    full: require('../../assets/icon.png'), // Using existing app icon as placeholder
    icon: require('../../assets/icon.png'),
    light: require('../../assets/icon.png'),
    dark: require('../../assets/icon.png'),
  },
  icons: {
    // Placeholder for future icons
    default: require('../../assets/icon.png'),
  },
  animations: {
    // Placeholder for future animations
  },
};

// Asset loading utilities
export class AssetManager {
  private static instance: AssetManager;
  private assets: AssetConfig;
  private fallbackAssets: AssetConfig;

  private constructor() {
    this.assets = defaultAssets;
    this.fallbackAssets = defaultAssets;
  }

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  /**
   * Update asset configuration
   */
  public updateAssets(newAssets: Partial<AssetConfig>): void {
    this.assets = {
      ...this.assets,
      ...newAssets,
      logos: {
        ...this.assets.logos,
        ...newAssets.logos,
      },
      icons: {
        ...this.assets.icons,
        ...newAssets.icons,
      },
      animations: {
        ...this.assets.animations,
        ...newAssets.animations,
      },
    };
  }

  /**
   * Get logo asset with fallback mechanism
   */
  public getLogo(variant: keyof LogoVariant = 'full'): ImageSourcePropType {
    try {
      const asset = this.assets.logos[variant];
      if (asset) {
        return asset;
      }
      // Try fallback for the same variant
      const fallbackAsset = this.fallbackAssets.logos[variant];
      if (fallbackAsset) {
        return fallbackAsset;
      }
      // Final fallback to full logo
      return this.fallbackAssets.logos.full;
    } catch (error) {
      console.warn(`Failed to load logo variant: ${variant}`, error);
      return this.fallbackAssets.logos.full;
    }
  }

  /**
   * Get icon asset with fallback mechanism
   */
  public getIcon(name: string): ImageSourcePropType {
    try {
      const asset = this.assets.icons[name];
      if (asset) {
        return asset;
      }
      // Fallback to default icon
      return this.fallbackAssets.icons.default;
    } catch (error) {
      console.warn(`Failed to load icon: ${name}`, error);
      return this.fallbackAssets.icons.default;
    }
  }

  /**
   * Get animation asset with fallback mechanism
   */
  public getAnimation(name: string): any {
    try {
      return this.assets.animations[name] || null;
    } catch (error) {
      console.warn(`Failed to load animation: ${name}`, error);
      return null;
    }
  }

  /**
   * Get all assets
   */
  public getAssets(): AssetConfig {
    return this.assets;
  }

  /**
   * Reset to default assets
   */
  public resetToDefaults(): void {
    this.assets = { ...defaultAssets };
  }
}

// Export singleton instance
export const assetManager = AssetManager.getInstance();

// Export asset utilities
export const getAsset = {
  logo: (variant?: keyof LogoVariant) => assetManager.getLogo(variant),
  icon: (name: string) => assetManager.getIcon(name),
  animation: (name: string) => assetManager.getAnimation(name),
};
