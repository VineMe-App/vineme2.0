/**
 * Logo Component Tests
 * Unit tests for the Logo component
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Logo } from '../Logo';
import { ThemeProvider } from '../../../../theme/provider/ThemeProvider';
import { assetManager } from '../../../../assets';

// Mock the asset manager
jest.mock('../../../../assets', () => ({
  assetManager: {
    getLogo: jest.fn(),
  },
  defaultAssets: {
    logos: {
      full: { uri: 'full-logo.png' },
      icon: { uri: 'icon-logo.png' },
      light: { uri: 'light-logo.png' },
      dark: { uri: 'dark-logo.png' },
    },
  },
}));

// Mock React Native components
jest.mock('react-native', () => ({
  Image: 'Image',
  View: 'View',
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
  Appearance: {
    getColorScheme: () => 'light',
    addChangeListener: () => ({ remove: jest.fn() }),
  },
}));

const mockAssetManager = assetManager as jest.Mocked<typeof assetManager>;

// Test wrapper with theme provider
const TestWrapper: React.FC<{
  children: React.ReactNode;
  isDark?: boolean;
}> = ({ children, isDark = false }) => (
  <ThemeProvider initialTheme={isDark ? 'dark' : 'light'}>
    {children}
  </ThemeProvider>
);

describe('Logo Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAssetManager.getLogo.mockReturnValue({ uri: 'default-logo.png' });
  });

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(
        <TestWrapper>
          <Logo />
        </TestWrapper>
      );

      const logo = screen.getByTestId('logo');
      expect(logo).toBeTruthy();
      expect(mockAssetManager.getLogo).toHaveBeenCalledWith('light');
    });

    it('should render with custom test ID', () => {
      render(
        <TestWrapper>
          <Logo testID="custom-logo" />
        </TestWrapper>
      );

      const logo = screen.getByTestId('custom-logo');
      const container = screen.getByTestId('custom-logo-container');
      expect(logo).toBeTruthy();
      expect(container).toBeTruthy();
    });

    it('should have proper accessibility properties', () => {
      render(
        <TestWrapper>
          <Logo accessibilityLabel="Custom Logo Label" />
        </TestWrapper>
      );

      const logo = screen.getByTestId('logo');
      expect(logo.props.accessibilityLabel).toBe('Custom Logo Label');
      expect(logo.props.accessibilityRole).toBe('image');
    });
  });

  describe('Variant Selection', () => {
    it('should use specified variant', () => {
      render(
        <TestWrapper>
          <Logo variant="icon" />
        </TestWrapper>
      );

      expect(mockAssetManager.getLogo).toHaveBeenCalledWith('icon');
    });

    it('should use full variant by default', () => {
      render(
        <TestWrapper>
          <Logo />
        </TestWrapper>
      );

      expect(mockAssetManager.getLogo).toHaveBeenCalledWith('light');
    });

    it('should handle all logo variants', () => {
      const variants: (keyof typeof mockAssetManager.getLogo)[] = [
        'full',
        'icon',
        'light',
        'dark',
      ];

      variants.forEach((variant) => {
        mockAssetManager.getLogo.mockClear();

        render(
          <TestWrapper>
            <Logo variant={variant as any} />
          </TestWrapper>
        );

        if (variant === 'full' || variant === 'icon') {
          // These should auto-select based on theme
          expect(mockAssetManager.getLogo).toHaveBeenCalledWith('light');
        } else {
          expect(mockAssetManager.getLogo).toHaveBeenCalledWith(variant);
        }
      });
    });
  });

  describe('Theme-based Variant Selection', () => {
    it('should auto-select light variant in light theme', () => {
      render(
        <TestWrapper isDark={false}>
          <Logo variant="full" theme="auto" />
        </TestWrapper>
      );

      expect(mockAssetManager.getLogo).toHaveBeenCalledWith('light');
    });

    it('should auto-select dark variant in dark theme', () => {
      render(
        <TestWrapper isDark={true}>
          <Logo variant="full" theme="auto" />
        </TestWrapper>
      );

      expect(mockAssetManager.getLogo).toHaveBeenCalledWith('dark');
    });

    it('should force light theme when specified', () => {
      render(
        <TestWrapper isDark={true}>
          <Logo variant="full" theme="light" />
        </TestWrapper>
      );

      expect(mockAssetManager.getLogo).toHaveBeenCalledWith('light');
    });

    it('should force dark theme when specified', () => {
      render(
        <TestWrapper isDark={false}>
          <Logo variant="full" theme="dark" />
        </TestWrapper>
      );

      expect(mockAssetManager.getLogo).toHaveBeenCalledWith('dark');
    });

    it('should handle icon variant with theme selection', () => {
      render(
        <TestWrapper isDark={true}>
          <Logo variant="icon" theme="auto" />
        </TestWrapper>
      );

      expect(mockAssetManager.getLogo).toHaveBeenCalledWith('dark');
    });
  });

  describe('Size Handling', () => {
    it('should use medium size by default', () => {
      render(
        <TestWrapper>
          <Logo />
        </TestWrapper>
      );

      const logo = screen.getByTestId('logo');
      expect(logo.props.style).toEqual(
        expect.objectContaining({
          width: 48,
          height: 48,
        })
      );
    });

    it('should handle predefined sizes', () => {
      const sizes = [
        { size: 'small' as const, expected: 24 },
        { size: 'medium' as const, expected: 48 },
        { size: 'large' as const, expected: 96 },
      ];

      sizes.forEach(({ size, expected }) => {
        render(
          <TestWrapper>
            <Logo size={size} testID={`logo-${size}`} />
          </TestWrapper>
        );

        const logo = screen.getByTestId(`logo-${size}`);
        expect(logo.props.style).toEqual(
          expect.objectContaining({
            width: expected,
            height: expected,
          })
        );
      });
    });

    it('should handle custom numeric size', () => {
      render(
        <TestWrapper>
          <Logo size={64} />
        </TestWrapper>
      );

      const logo = screen.getByTestId('logo');
      expect(logo.props.style).toEqual(
        expect.objectContaining({
          width: 64,
          height: 64,
        })
      );
    });
  });

  describe('Style Customization', () => {
    it('should apply custom image style', () => {
      const customStyle = { borderRadius: 8, opacity: 0.8 };

      render(
        <TestWrapper>
          <Logo style={customStyle} />
        </TestWrapper>
      );

      const logo = screen.getByTestId('logo');
      expect(logo.props.style).toEqual(expect.objectContaining(customStyle));
    });

    it('should apply custom container style', () => {
      const customContainerStyle = { backgroundColor: 'red', padding: 10 };

      render(
        <TestWrapper>
          <Logo containerStyle={customContainerStyle} />
        </TestWrapper>
      );

      const container = screen.getByTestId('logo-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customContainerStyle)])
      );
    });

    it('should handle resize mode', () => {
      render(
        <TestWrapper>
          <Logo resizeMode="cover" />
        </TestWrapper>
      );

      const logo = screen.getByTestId('logo');
      expect(logo.props.resizeMode).toBe('cover');
    });
  });

  describe('Error Handling', () => {
    it('should handle asset manager errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockAssetManager.getLogo.mockImplementation(() => {
        throw new Error('Asset loading failed');
      });

      // Should not crash
      expect(() => {
        render(
          <TestWrapper>
            <Logo />
          </TestWrapper>
        );
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have default accessibility label', () => {
      render(
        <TestWrapper>
          <Logo />
        </TestWrapper>
      );

      const logo = screen.getByTestId('logo');
      expect(logo.props.accessibilityLabel).toBe('VineMe Logo');
    });

    it('should use custom accessibility label', () => {
      render(
        <TestWrapper>
          <Logo accessibilityLabel="Custom Brand Logo" />
        </TestWrapper>
      );

      const logo = screen.getByTestId('logo');
      expect(logo.props.accessibilityLabel).toBe('Custom Brand Logo');
    });

    it('should have image accessibility role', () => {
      render(
        <TestWrapper>
          <Logo />
        </TestWrapper>
      );

      const logo = screen.getByTestId('logo');
      expect(logo.props.accessibilityRole).toBe('image');
    });
  });
});
