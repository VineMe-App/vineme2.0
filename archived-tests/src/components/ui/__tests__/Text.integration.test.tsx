import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text, Heading1, BodyText, Caption } from '../Text';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';
import { lightTheme } from '../../../theme/themes/light';
import { darkTheme } from '../../../theme/themes/dark';

// Test wrapper with theme switching capability
const TestWrapperWithTheme: React.FC<{
  children: React.ReactNode;
  theme?: 'light' | 'dark';
}> = ({ children, theme = 'light' }) => (
  <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
);

describe('Text Component Integration Tests', () => {
  describe('Theme Integration', () => {
    it('adapts colors correctly when theme changes from light to dark', () => {
      const { rerender } = render(
        <TestWrapperWithTheme theme="light">
          <Text testID="theme-text">Theme Text</Text>
        </TestWrapperWithTheme>
      );

      // Check light theme color
      let textElement = screen.getByTestId('theme-text');
      expect(textElement.props.style.color).toBe(
        lightTheme.colors.text.primary
      );

      // Switch to dark theme
      rerender(
        <TestWrapperWithTheme theme="dark">
          <Text testID="theme-text">Theme Text</Text>
        </TestWrapperWithTheme>
      );

      // Check dark theme color
      textElement = screen.getByTestId('theme-text');
      expect(textElement.props.style.color).toBe(darkTheme.colors.text.primary);
    });

    it('maintains typography consistency across themes', () => {
      const { rerender } = render(
        <TestWrapperWithTheme theme="light">
          <Text variant="h1" testID="consistent-text">
            Consistent Typography
          </Text>
        </TestWrapperWithTheme>
      );

      // Check typography in light theme
      let textElement = screen.getByTestId('consistent-text');
      const lightTypography = {
        fontSize: textElement.props.style.fontSize,
        lineHeight: textElement.props.style.lineHeight,
        fontWeight: textElement.props.style.fontWeight,
      };

      // Switch to dark theme
      rerender(
        <TestWrapperWithTheme theme="dark">
          <Text variant="h1" testID="consistent-text">
            Consistent Typography
          </Text>
        </TestWrapperWithTheme>
      );

      // Check typography remains the same in dark theme
      textElement = screen.getByTestId('consistent-text');
      expect(textElement.props.style.fontSize).toBe(lightTypography.fontSize);
      expect(textElement.props.style.lineHeight).toBe(
        lightTypography.lineHeight
      );
      expect(textElement.props.style.fontWeight).toBe(
        lightTypography.fontWeight
      );
    });

    it('applies semantic colors correctly across themes', () => {
      const semanticColors = ['success', 'warning', 'error', 'info'] as const;

      semanticColors.forEach((color) => {
        const { rerender } = render(
          <TestWrapperWithTheme theme="light">
            <Text color={color} testID={`${color}-text`}>
              {color} Text
            </Text>
          </TestWrapperWithTheme>
        );

        // Check light theme semantic color
        let textElement = screen.getByTestId(`${color}-text`);
        expect(textElement.props.style.color).toBe(
          lightTheme.colors[color][600]
        );

        // Switch to dark theme
        rerender(
          <TestWrapperWithTheme theme="dark">
            <Text color={color} testID={`${color}-text`}>
              {color} Text
            </Text>
          </TestWrapperWithTheme>
        );

        // Check dark theme semantic color
        textElement = screen.getByTestId(`${color}-text`);
        expect(textElement.props.style.color).toBe(
          darkTheme.colors[color][600]
        );
      });
    });
  });

  describe('Typography Hierarchy Integration', () => {
    it('maintains proper visual hierarchy across different variants', () => {
      render(
        <TestWrapperWithTheme>
          <Heading1 testID="h1">Main Heading</Heading1>
          <Text variant="h2" testID="h2">
            Sub Heading
          </Text>
          <BodyText testID="body">Body content text</BodyText>
          <Caption testID="caption">Caption text</Caption>
        </TestWrapperWithTheme>
      );

      const h1Element = screen.getByTestId('h1');
      const h2Element = screen.getByTestId('h2');
      const bodyElement = screen.getByTestId('body');
      const captionElement = screen.getByTestId('caption');

      // Check font size hierarchy (larger to smaller)
      expect(h1Element.props.style.fontSize).toBeGreaterThan(
        h2Element.props.style.fontSize
      );
      expect(h2Element.props.style.fontSize).toBeGreaterThan(
        bodyElement.props.style.fontSize
      );
      expect(bodyElement.props.style.fontSize).toBeGreaterThan(
        captionElement.props.style.fontSize
      );

      // Check font weight hierarchy (headings should be bolder)
      expect(parseInt(h1Element.props.style.fontWeight)).toBeGreaterThan(
        parseInt(bodyElement.props.style.fontWeight)
      );
      expect(parseInt(h2Element.props.style.fontWeight)).toBeGreaterThan(
        parseInt(bodyElement.props.style.fontWeight)
      );
    });

    it('applies consistent line height ratios for readability', () => {
      render(
        <TestWrapperWithTheme>
          <Text variant="body" testID="body-text">
            Body Text
          </Text>
          <Text variant="bodyLarge" testID="body-large-text">
            Large Body Text
          </Text>
          <Text variant="bodySmall" testID="body-small-text">
            Small Body Text
          </Text>
        </TestWrapperWithTheme>
      );

      const bodyElement = screen.getByTestId('body-text');
      const bodyLargeElement = screen.getByTestId('body-large-text');
      const bodySmallElement = screen.getByTestId('body-small-text');

      // Check line height to font size ratios for readability
      const bodyRatio =
        bodyElement.props.style.lineHeight / bodyElement.props.style.fontSize;
      const bodyLargeRatio =
        bodyLargeElement.props.style.lineHeight /
        bodyLargeElement.props.style.fontSize;
      const bodySmallRatio =
        bodySmallElement.props.style.lineHeight /
        bodySmallElement.props.style.fontSize;

      // All ratios should be reasonable for readability (typically 1.2-1.6)
      expect(bodyRatio).toBeGreaterThanOrEqual(1.2);
      expect(bodyRatio).toBeLessThanOrEqual(1.6);
      expect(bodyLargeRatio).toBeGreaterThanOrEqual(1.2);
      expect(bodyLargeRatio).toBeLessThanOrEqual(1.6);
      expect(bodySmallRatio).toBeGreaterThanOrEqual(1.2);
      expect(bodySmallRatio).toBeLessThanOrEqual(1.6);
    });
  });

  describe('Accessibility Integration', () => {
    it('provides proper accessibility roles for screen readers', () => {
      render(
        <TestWrapperWithTheme>
          <Text variant="h1" testID="heading">
            Main Heading
          </Text>
          <Text variant="body" testID="content">
            Content text
          </Text>
          <Text variant="caption" testID="caption">
            Caption
          </Text>
        </TestWrapperWithTheme>
      );

      const headingElement = screen.getByTestId('heading');
      const contentElement = screen.getByTestId('content');
      const captionElement = screen.getByTestId('caption');

      expect(headingElement.props.accessibilityRole).toBe('header');
      expect(contentElement.props.accessibilityRole).toBe('text');
      expect(captionElement.props.accessibilityRole).toBe('text');
    });

    it('supports font scaling for accessibility needs', () => {
      render(
        <TestWrapperWithTheme>
          <Text testID="scalable-text">Scalable Text</Text>
        </TestWrapperWithTheme>
      );

      const textElement = screen.getByTestId('scalable-text');

      expect(textElement.props.allowFontScaling).toBe(true);
      expect(textElement.props.maxFontSizeMultiplier).toBeDefined();
      expect(textElement.props.maxFontSizeMultiplier).toBeGreaterThan(1);
    });

    it('provides accessibility labels for screen readers', () => {
      render(
        <TestWrapperWithTheme>
          <Text testID="labeled-text">Important Information</Text>
        </TestWrapperWithTheme>
      );

      const textElement = screen.getByTestId('labeled-text');
      expect(textElement.props.accessibilityLabel).toBe(
        'Important Information'
      );
      expect(textElement.props.accessible).toBe(true);
    });
  });

  describe('Style Composition Integration', () => {
    it('properly composes variant styles with custom overrides', () => {
      const customStyle = {
        marginTop: 20,
        marginBottom: 10,
        textDecorationLine: 'underline' as const,
      };

      render(
        <TestWrapperWithTheme>
          <Text variant="h2" style={customStyle} testID="composed-text">
            Composed Text
          </Text>
        </TestWrapperWithTheme>
      );

      const textElement = screen.getByTestId('composed-text');

      // Should have both variant styles and custom styles
      expect(textElement.props.style.fontSize).toBe(48); // from h2 variant
      expect(textElement.props.style.fontWeight).toBe('700'); // from h2 variant
      expect(textElement.props.style.marginTop).toBe(20); // from custom style
      expect(textElement.props.style.marginBottom).toBe(10); // from custom style
      expect(textElement.props.style.textDecorationLine).toBe('underline'); // from custom style
    });

    it('allows style overrides to take precedence over variant styles', () => {
      const overrideStyle = {
        fontSize: 100,
        color: '#ff0000',
        fontWeight: '300' as const,
      };

      render(
        <TestWrapperWithTheme>
          <Text variant="h1" style={overrideStyle} testID="override-text">
            Override Text
          </Text>
        </TestWrapperWithTheme>
      );

      const textElement = screen.getByTestId('override-text');

      // Custom styles should override variant styles
      expect(textElement.props.style.fontSize).toBe(100); // overridden
      expect(textElement.props.style.color).toBe('#ff0000'); // overridden
      expect(textElement.props.style.fontWeight).toBe('300'); // overridden
    });
  });

  describe('Performance Integration', () => {
    it('renders multiple text components efficiently', () => {
      const startTime = performance.now();

      render(
        <TestWrapperWithTheme>
          {Array.from({ length: 100 }, (_, i) => (
            <Text key={i} variant="body" testID={`text-${i}`}>
              Text content {i}
            </Text>
          ))}
        </TestWrapperWithTheme>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render 100 text components in reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100);

      // Verify all components rendered
      expect(screen.getByTestId('text-0')).toBeTruthy();
      expect(screen.getByTestId('text-99')).toBeTruthy();
    });

    it('handles style recalculation efficiently', () => {
      const { rerender } = render(
        <TestWrapperWithTheme>
          <Text variant="body" color="primary" testID="perf-text">
            Performance Test
          </Text>
        </TestWrapperWithTheme>
      );

      const startTime = performance.now();

      // Re-render with different props multiple times
      for (let i = 0; i < 50; i++) {
        const variant = i % 2 === 0 ? 'body' : 'h1';
        const color = i % 2 === 0 ? 'primary' : 'secondary';

        rerender(
          <TestWrapperWithTheme>
            <Text variant={variant} color={color} testID="perf-text">
              Performance Test
            </Text>
          </TestWrapperWithTheme>
        );
      }

      const endTime = performance.now();
      const rerenderTime = endTime - startTime;

      // Should handle multiple re-renders efficiently (less than 50ms)
      expect(rerenderTime).toBeLessThan(50);
    });
  });
});
