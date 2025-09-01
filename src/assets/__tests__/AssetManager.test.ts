/**
 * Asset Manager Tests
 * Unit tests for the asset management system
 */

import { AssetManager, defaultAssets, assetManager, getAsset } from '../index';

// Mock React Native Image
jest.mock('react-native', () => ({
  Image: {
    resolveAssetSource: jest.fn((source) => ({ uri: `mocked-${source}` })),
  },
}));

describe('AssetManager', () => {
  let manager: AssetManager;

  beforeEach(() => {
    manager = AssetManager.getInstance();
    manager.resetToDefaults();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AssetManager.getInstance();
      const instance2 = AssetManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return the global assetManager instance', () => {
      expect(assetManager).toBe(AssetManager.getInstance());
    });
  });

  describe('Asset Configuration', () => {
    it('should initialize with default assets', () => {
      const assets = manager.getAssets();
      expect(assets).toEqual(defaultAssets);
    });

    it('should update assets configuration', () => {
      const newLogos = {
        full: { uri: 'new-full-logo.png' },
        icon: { uri: 'new-icon-logo.png' },
      };

      manager.updateAssets({ logos: newLogos });
      const assets = manager.getAssets();

      expect(assets.logos.full).toEqual(newLogos.full);
      expect(assets.logos.icon).toEqual(newLogos.icon);
      // Should preserve existing assets
      expect(assets.logos.light).toEqual(defaultAssets.logos.light);
      expect(assets.logos.dark).toEqual(defaultAssets.logos.dark);
    });

    it('should merge new assets with existing ones', () => {
      const newIcons = {
        home: { uri: 'home-icon.png' },
        settings: { uri: 'settings-icon.png' },
      };

      manager.updateAssets({ icons: newIcons });
      const assets = manager.getAssets();

      expect(assets.icons).toEqual({
        ...defaultAssets.icons,
        ...newIcons,
      });
    });

    it('should reset to default assets', () => {
      // Update assets first
      manager.updateAssets({
        logos: { full: { uri: 'custom-logo.png' } },
        icons: { custom: { uri: 'custom-icon.png' } },
      });

      // Reset to defaults
      manager.resetToDefaults();
      const assets = manager.getAssets();

      expect(assets).toEqual(defaultAssets);
    });
  });

  describe('Logo Asset Retrieval', () => {
    it('should return logo asset for valid variant', () => {
      const logo = manager.getLogo('full');
      expect(logo).toEqual(defaultAssets.logos.full);
    });

    it('should return default variant when no variant specified', () => {
      const logo = manager.getLogo();
      expect(logo).toEqual(defaultAssets.logos.full);
    });

    it('should return fallback for invalid variant', () => {
      const logo = manager.getLogo('invalid' as any);
      expect(logo).toEqual(defaultAssets.logos.full);
    });

    it('should handle logo retrieval errors gracefully', () => {
      // Mock console.warn to avoid test output
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Force an error by making logos undefined
      (manager as any).assets = { ...defaultAssets, logos: undefined };

      const logo = manager.getLogo('full');
      expect(logo).toEqual(defaultAssets.logos.full);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load logo variant: full',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Icon Asset Retrieval', () => {
    it('should return icon asset for valid name', () => {
      const icon = manager.getIcon('default');
      expect(icon).toEqual(defaultAssets.icons.default);
    });

    it('should return fallback for non-existent icon', () => {
      const icon = manager.getIcon('non-existent');
      expect(icon).toEqual(defaultAssets.icons.default);
    });

    it('should handle icon retrieval errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Force an error by making icons undefined
      (manager as any).assets = { ...defaultAssets, icons: undefined };

      const icon = manager.getIcon('test');
      expect(icon).toEqual(defaultAssets.icons.default);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load icon: test',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Animation Asset Retrieval', () => {
    it('should return animation asset for valid name', () => {
      manager.updateAssets({
        animations: { loading: { source: 'loading.json' } },
      });

      const animation = manager.getAnimation('loading');
      expect(animation).toEqual({ source: 'loading.json' });
    });

    it('should return null for non-existent animation', () => {
      const animation = manager.getAnimation('non-existent');
      expect(animation).toBeNull();
    });

    it('should handle animation retrieval errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Force an error by making animations undefined
      (manager as any).assets = { ...defaultAssets, animations: undefined };

      const animation = manager.getAnimation('test');
      expect(animation).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load animation: test',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Asset Utilities', () => {
    it('should provide convenient asset access functions', () => {
      expect(getAsset.logo()).toEqual(defaultAssets.logos.full);
      expect(getAsset.logo('icon')).toEqual(defaultAssets.logos.icon);
      expect(getAsset.icon('default')).toEqual(defaultAssets.icons.default);
      expect(getAsset.animation('test')).toBeNull();
    });
  });
});

describe('Default Assets', () => {
  it('should have required logo variants', () => {
    expect(defaultAssets.logos).toHaveProperty('full');
    expect(defaultAssets.logos).toHaveProperty('icon');
    expect(defaultAssets.logos).toHaveProperty('light');
    expect(defaultAssets.logos).toHaveProperty('dark');
  });

  it('should have default icon', () => {
    expect(defaultAssets.icons).toHaveProperty('default');
  });

  it('should have animations object', () => {
    expect(defaultAssets.animations).toBeDefined();
    expect(typeof defaultAssets.animations).toBe('object');
  });
});