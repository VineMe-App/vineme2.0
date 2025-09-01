/**
 * Basic Asset Management Integration Test
 * Simple test to verify core functionality works
 */

import { AssetManager, defaultAssets, assetManager } from '../index';

describe('Basic Asset Management Integration', () => {
  beforeEach(() => {
    assetManager.resetToDefaults();
  });

  it('should provide default assets', () => {
    expect(defaultAssets).toBeDefined();
    expect(defaultAssets.logos).toBeDefined();
    expect(defaultAssets.icons).toBeDefined();
    expect(defaultAssets.animations).toBeDefined();
  });

  it('should create singleton asset manager', () => {
    const manager1 = AssetManager.getInstance();
    const manager2 = AssetManager.getInstance();
    expect(manager1).toBe(manager2);
  });

  it('should get logo assets', () => {
    const fullLogo = assetManager.getLogo('full');
    const iconLogo = assetManager.getLogo('icon');
    
    expect(fullLogo).toBeDefined();
    expect(iconLogo).toBeDefined();
  });

  it('should update assets', () => {
    const newAssets = {
      logos: {
        custom: { uri: 'custom-logo.png' },
      },
    };

    assetManager.updateAssets(newAssets);
    const assets = assetManager.getAssets();
    
    expect(assets.logos.custom).toEqual({ uri: 'custom-logo.png' });
  });

  it('should handle fallbacks gracefully', () => {
    const nonExistentIcon = assetManager.getIcon('non-existent');
    expect(nonExistentIcon).toBeDefined(); // Should return fallback
  });
});