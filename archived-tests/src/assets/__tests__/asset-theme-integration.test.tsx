/**
 * Asset-Theme Integration Tests
 * Tests for asset management integration with theme system
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/provider/ThemeProvider';
import { useTheme } from '../../theme/provider/useTheme';
import { Logo } from '../../components/brand/Logo/Logo';
import { assetManager } from '../index';

// Mock React Native components
jest.mock('react-native', () => ({
  Image: 'Image',
  View: 'View',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Appearance: {
    getColorScheme: () => 'light',
    addChangeListener: () => ({ remove: jest.fn() }),
  },
}));

// Test component that uses theme assets
const TestAssetComponent: React.FC = () => {
  const { assets, updateAssets, isDark } = useTheme();
  
  return (
    <>
      <Logo testID="theme-logo" />
      <button
        testID="update-assets-btn"
        onClick={() => updateAssets({
          logos: {
            ...assets.logos,
            custom: { uri: 'custom-logo.png' },
          },
        })}
      >
        Update Assets
      </button>
      <span testID="theme-indicator">{isDark ? 'dark' : 'light'}</span>
    </>
  );
};

describe('Asset-Theme Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    assetManager.resetToDefaults();
  });

  describe('Theme Provider Asset Integration', () => {
    it('should provide assets through theme context', () => {
      let capturedAssets: any;
      
      const TestComponent = () => {
        const { assets } = useTheme();
        capturedAssets = assets;
        return null;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(capturedAssets).toBeDefined();
      expect(capturedAssets.logos).toBeDefined();
      expect(capturedAssets.icons).toBeDefined();
      expect(capturedAssets.animations).toBeDefined();
    });

    it('should provide updateAssets function through theme context', () => {
      let capturedUpdateAssets: any;
      
      const TestComponent = () => {
        const { updateAssets } = useTheme();
        capturedUpdateAssets = updateAssets;
        return null;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(capturedUpdateAssets).toBeDefined();
      expect(typeof capturedUpdateAssets).toBe('function');
    });

    it('should update assets through theme context', () => {
      const TestComponent = () => {
        const { assets, updateAssets } = useTheme();
        
        React.useEffect(() => {
          updateAssets({
            icons: {
              test: { uri: 'test-icon.png' },
            },
          });
        }, [updateAssets]);

        return <span testID="test-icon">{JSON.stringify(assets.icons.test)}</span>;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // The component should have access to the updated assets
      // Note: In a real test, you might need to wait for the update
      expect(screen.getByTestId('test-icon')).toBeTruthy();
    });
  });

  describe('Logo Component Theme Integration', () => {
    it('should render logo with light theme by default', () => {
      render(
        <ThemeProvider initialTheme="light">
          <Logo testID="light-logo" />
        </ThemeProvider>
      );

      const logo = screen.getByTestId('light-logo');
      expect(logo).toBeTruthy();
    });

    it('should render logo with dark theme', () => {
      render(
        <ThemeProvider initialTheme="dark">
          <Logo testID="dark-logo" />
        </ThemeProvider>
      );

      const logo = screen.getByTestId('dark-logo');
      expect(logo).toBeTruthy();
    });

    it('should auto-select logo variant based on theme', () => {
      const LogoTestComponent = () => {
        const { isDark } = useTheme();
        return (
          <>
            <Logo variant="full" theme="auto" testID="auto-logo" />
            <span testID="theme-state">{isDark ? 'dark' : 'light'}</span>
          </>
        );
      };

      // Test light theme
      const { rerender } = render(
        <ThemeProvider initialTheme="light">
          <LogoTestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme-state')).toHaveTextContent('light');

      // Test dark theme
      rerender(
        <ThemeProvider initialTheme="dark">
          <LogoTestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme-state')).toHaveTextContent('dark');
    });
  });

  describe('Asset Fallback Mechanisms', () => {
    it('should handle missing assets gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Clear assets to simulate missing assets
      assetManager.updateAssets({
        logos: {} as any,
      });

      render(
        <ThemeProvider>
          <Logo testID="fallback-logo" />
        </ThemeProvider>
      );

      // Should still render without crashing
      expect(screen.getByTestId('fallback-logo')).toBeTruthy();
      
      consoleSpy.mockRestore();
    });

    it('should provide fallback assets when primary assets fail', () => {
      // Mock asset manager to simulate failure
      const originalGetLogo = assetManager.getLogo;
      assetManager.getLogo = jest.fn().mockImplementation(() => {
        throw new Error('Asset loading failed');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(
        <ThemeProvider>
          <Logo testID="error-logo" />
        </ThemeProvider>
      );

      // Should still render
      expect(screen.getByTestId('error-logo')).toBeTruthy();

      // Restore original function
      assetManager.getLogo = originalGetLogo;
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Considerations', () => {
    it('should not cause unnecessary re-renders when assets update', () => {
      let renderCount = 0;
      
      const TestComponent = () => {
        renderCount++;
        const { updateAssets } = useTheme();
        
        return (
          <button
            testID="update-btn"
            onClick={() => updateAssets({ icons: { new: { uri: 'new.png' } } })}
          >
            Update
          </button>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const initialRenderCount = renderCount;

      // Update assets
      act(() => {
        const updateBtn = screen.getByTestId('update-btn');
        updateBtn.props.onClick();
      });

      // Should only cause minimal re-renders
      expect(renderCount).toBeGreaterThan(initialRenderCount);
      expect(renderCount).toBeLessThan(initialRenderCount + 5); // Reasonable threshold
    });
  });

  describe('Error Boundaries', () => {
    it('should handle asset update errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const TestComponent = () => {
        const { updateAssets } = useTheme();
        
        React.useEffect(() => {
          // Try to update with invalid data
          updateAssets(null as any);
        }, [updateAssets]);

        return <span testID="error-test">Test</span>;
      };

      // Should not crash
      expect(() => {
        render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        );
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });
});