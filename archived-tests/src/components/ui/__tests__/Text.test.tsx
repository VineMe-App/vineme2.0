import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import {
  Text,
  Heading1,
  Heading2,
  BodyText,
  BodyLarge,
  Caption,
  Label,
} from '../Text';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';
import { lightTheme } from '../../../theme/themes/light';

// Mock theme provider wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider initialTheme="light">{children}</ThemeProvider>
);

// Helper function to get flattened style
const getStyle = (element: any) => {
  const style = element.props.style;
  if (Array.isArray(style)) {
    // Always flatten arrays to handle multiple styles
    return StyleSheet.flatten(style);
  }
  return style;
};

describe('Text Component', () => {
  describe('Basic Rendering', () => {
    it('renders text content correctly', () => {
      render(
        <TestWrapper>
          <Text testID="test-text">Hello World</Text>
        </TestWrapper>
      );

      expect(screen.getByTestId('test-text')).toBeTruthy();
      expect(screen.getByText('Hello World')).toBeTruthy();
    });

    it('applies default variant (body) when no variant specified', () => {
      render(
        <TestWrapper>
          <Text testID="default-text">Default Text</Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('default-text');
      const style = getStyle(textElement);
      expect(style).toMatchObject({
        fontSize: 16, // body variant fontSize
        lineHeight: 24, // body variant lineHeight
      });
    });
  });

  describe('Typography Variants', () => {
    it('applies h1 variant styles correctly', () => {
      render(
        <TestWrapper>
          <Text variant="h1" testID="h1-text">
            Heading 1
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('h1-text');
      const style = getStyle(textElement);
      expect(style).toMatchObject({
        fontSize: 60, // h1 variant fontSize
        lineHeight: 60, // h1 variant lineHeight
        fontWeight: '700', // bold
      });
    });

    it('applies h2 variant styles correctly', () => {
      render(
        <TestWrapper>
          <Text variant="h2" testID="h2-text">
            Heading 2
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('h2-text');
      const style = getStyle(textElement);
      expect(style).toMatchObject({
        fontSize: 48, // h2 variant fontSize
        lineHeight: 48, // h2 variant lineHeight
        fontWeight: '700', // bold
      });
    });

    it('applies body variant styles correctly', () => {
      render(
        <TestWrapper>
          <Text variant="body" testID="body-text">
            Body Text
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('body-text');
      const style = getStyle(textElement);
      expect(style).toMatchObject({
        fontSize: 16, // body variant fontSize
        lineHeight: 24, // body variant lineHeight
        fontWeight: '400', // normal
      });
    });

    it('applies caption variant styles correctly', () => {
      render(
        <TestWrapper>
          <Text variant="caption" testID="caption-text">
            Caption Text
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('caption-text');
      const style = getStyle(textElement);
      expect(style).toMatchObject({
        fontSize: 12, // caption variant fontSize
        lineHeight: 16, // caption variant lineHeight
        fontWeight: '400', // normal
      });
    });

    it('applies label variant styles correctly', () => {
      render(
        <TestWrapper>
          <Text variant="label" testID="label-text">
            Label Text
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('label-text');
      const style = getStyle(textElement);
      expect(style).toMatchObject({
        fontSize: 14, // label variant fontSize
        lineHeight: 20, // label variant lineHeight
        fontWeight: '500', // medium
      });
    });
  });

  describe('Color Variants', () => {
    it('applies primary color correctly', () => {
      render(
        <TestWrapper>
          <Text color="primary" testID="primary-text">
            Primary Text
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('primary-text');
      const style = getStyle(textElement);
      expect(style.color).toBe(lightTheme.colors.text.primary);
    });

    it('applies secondary color correctly', () => {
      render(
        <TestWrapper>
          <Text color="secondary" testID="secondary-text">
            Secondary Text
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('secondary-text');
      const style = getStyle(textElement);
      expect(style.color).toBe(lightTheme.colors.text.secondary);
    });

    it('applies error color correctly', () => {
      render(
        <TestWrapper>
          <Text color="error" testID="error-text">
            Error Text
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('error-text');
      const style = getStyle(textElement);
      expect(style.color).toBe(lightTheme.colors.error[600]);
    });

    it('applies success color correctly', () => {
      render(
        <TestWrapper>
          <Text color="success" testID="success-text">
            Success Text
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('success-text');
      const style = getStyle(textElement);
      expect(style.color).toBe(lightTheme.colors.success[600]);
    });

    it('applies disabled color correctly', () => {
      render(
        <TestWrapper>
          <Text color="disabled" testID="disabled-text">
            Disabled Text
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('disabled-text');
      const style = getStyle(textElement);
      expect(style.color).toBe(lightTheme.colors.text.disabled);
    });
  });

  describe('Font Weight Variations', () => {
    it('applies custom font weight correctly', () => {
      render(
        <TestWrapper>
          <Text weight="bold" testID="bold-text">
            Bold Text
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('bold-text');
      const style = getStyle(textElement);
      expect(style.fontWeight).toBe('700');
    });

    it('applies light font weight correctly', () => {
      render(
        <TestWrapper>
          <Text weight="light" testID="light-text">
            Light Text
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('light-text');
      const style = getStyle(textElement);
      expect(style.fontWeight).toBe('300');
    });

    it('overrides variant font weight with custom weight', () => {
      render(
        <TestWrapper>
          <Text variant="h1" weight="light" testID="custom-weight-text">
            Custom Weight
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('custom-weight-text');
      const style = getStyle(textElement);
      expect(style.fontWeight).toBe('300'); // light, not h1's bold
    });
  });

  describe('Text Alignment', () => {
    it('applies left alignment by default', () => {
      render(
        <TestWrapper>
          <Text testID="default-align-text">Default Align</Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('default-align-text');
      const style = getStyle(textElement);
      expect(style.textAlign).toBe('left');
    });

    it('applies center alignment correctly', () => {
      render(
        <TestWrapper>
          <Text align="center" testID="center-text">
            Center Text
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('center-text');
      const style = getStyle(textElement);
      expect(style.textAlign).toBe('center');
    });

    it('applies right alignment correctly', () => {
      render(
        <TestWrapper>
          <Text align="right" testID="right-text">
            Right Text
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('right-text');
      const style = getStyle(textElement);
      expect(style.textAlign).toBe('right');
    });
  });

  describe('Accessibility Features', () => {
    it('sets correct accessibility role for heading variants', () => {
      render(
        <TestWrapper>
          <Text variant="h1" testID="heading-text">
            Heading
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('heading-text');
      expect(textElement.props.accessibilityRole).toBe('header');
    });

    it('sets correct accessibility role for body text', () => {
      render(
        <TestWrapper>
          <Text variant="body" testID="body-text">
            Body
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('body-text');
      expect(textElement.props.accessibilityRole).toBe('text');
    });

    it('enables font scaling for accessibility', () => {
      render(
        <TestWrapper>
          <Text testID="scalable-text">Scalable Text</Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('scalable-text');
      expect(textElement.props.allowFontScaling).toBe(true);
    });

    it('sets accessibility label for string children', () => {
      render(
        <TestWrapper>
          <Text testID="labeled-text">Accessible Text</Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('labeled-text');
      expect(textElement.props.accessibilityLabel).toBe('Accessible Text');
    });
  });

  describe('Custom Styles', () => {
    it('applies custom style overrides', () => {
      const customStyle = { marginTop: 10, marginBottom: 5 };

      render(
        <TestWrapper>
          <Text style={customStyle} testID="custom-style-text">
            Custom Style
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('custom-style-text');
      const style = getStyle(textElement);
      expect(style).toMatchObject(customStyle);
    });

    it('merges custom styles with variant styles', () => {
      const customStyle = { color: '#ff0000' };

      render(
        <TestWrapper>
          <Text variant="h1" style={customStyle} testID="merged-style-text">
            Merged Style
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('merged-style-text');
      const style = getStyle(textElement);
      expect(style).toMatchObject({
        fontSize: 60, // from h1 variant
        color: '#ff0000', // from custom style
      });
    });
  });

  describe('Selectable Text', () => {
    it('sets selectable prop correctly', () => {
      render(
        <TestWrapper>
          <Text selectable testID="selectable-text">
            Selectable Text
          </Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('selectable-text');
      expect(textElement.props.selectable).toBe(true);
    });

    it('defaults to non-selectable', () => {
      render(
        <TestWrapper>
          <Text testID="non-selectable-text">Non-selectable Text</Text>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('non-selectable-text');
      expect(textElement.props.selectable).toBe(false);
    });
  });
});

describe('Predefined Text Components', () => {
  describe('Heading Components', () => {
    it('renders Heading1 with correct variant', () => {
      render(
        <TestWrapper>
          <Heading1 testID="heading1">Heading 1</Heading1>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('heading1');
      const style = getStyle(textElement);
      expect(style.fontSize).toBe(60); // h1 fontSize
      expect(textElement.props.accessibilityRole).toBe('header');
    });

    it('renders Heading2 with correct variant', () => {
      render(
        <TestWrapper>
          <Heading2 testID="heading2">Heading 2</Heading2>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('heading2');
      const style = getStyle(textElement);
      expect(style.fontSize).toBe(48); // h2 fontSize
      expect(textElement.props.accessibilityRole).toBe('header');
    });
  });

  describe('Body Components', () => {
    it('renders BodyText with correct variant', () => {
      render(
        <TestWrapper>
          <BodyText testID="body-text">Body Text</BodyText>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('body-text');
      const style = getStyle(textElement);
      expect(style.fontSize).toBe(16); // body fontSize
      expect(textElement.props.accessibilityRole).toBe('text');
    });

    it('renders BodyLarge with correct variant', () => {
      render(
        <TestWrapper>
          <BodyLarge testID="body-large">Large Body Text</BodyLarge>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('body-large');
      const style = getStyle(textElement);
      expect(style.fontSize).toBe(18); // bodyLarge fontSize
    });
  });

  describe('Caption and Label Components', () => {
    it('renders Caption with correct variant', () => {
      render(
        <TestWrapper>
          <Caption testID="caption">Caption Text</Caption>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('caption');
      const style = getStyle(textElement);
      expect(style.fontSize).toBe(12); // caption fontSize
    });

    it('renders Label with correct variant', () => {
      render(
        <TestWrapper>
          <Label testID="label">Label Text</Label>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('label');
      const style = getStyle(textElement);
      expect(style.fontSize).toBe(14); // label fontSize
      expect(style.fontWeight).toBe('500'); // medium weight
    });
  });

  describe('Props Forwarding', () => {
    it('forwards props to predefined components', () => {
      render(
        <TestWrapper>
          <Heading1 color="error" align="center" testID="forwarded-props">
            Error Heading
          </Heading1>
        </TestWrapper>
      );

      const textElement = screen.getByTestId('forwarded-props');
      const style = getStyle(textElement);
      expect(style.color).toBe(lightTheme.colors.error[600]);
      expect(style.textAlign).toBe('center');
    });
  });
});
