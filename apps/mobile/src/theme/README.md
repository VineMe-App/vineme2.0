# VineMe Styling System Guide

A comprehensive guide to using and customizing the VineMe design system and theme architecture.

## 🎨 Overview

The VineMe styling system is built on a token-based architecture that provides:
- **Consistent Design Language**: Unified colors, typography, spacing, and components
- **Theme Support**: Light/dark mode with system preference detection
- **Performance Optimization**: Cached styles and optimized theme switching
- **Accessibility**: WCAG AA compliant colors and component patterns
- **Developer Experience**: Type-safe tokens and easy customization

## 📁 Project Structure

```
src/theme/
├── tokens/           # Design tokens (colors, typography, spacing)
├── themes/           # Theme configurations (light, dark)
├── provider/         # Theme context and provider
└── README.md         # This guide

src/components/ui/    # Themed UI components
src/assets/          # Theme-aware assets and icons
```

## 🚀 Quick Start

### Using the Theme in Components

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme/provider';

export const MyComponent = () => {
  const { theme, colors, spacing, typography } = useTheme();
  
  return (
    <View style={{
      backgroundColor: colors.background.primary,
      padding: spacing[4],
    }}>
      <Text style={{
        color: colors.text.primary,
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
      }}>
        Hello World!
      </Text>
    </View>
  );
};
```

### Using Pre-built Components

```tsx
import { Button, Card, Text, Input } from '@/components/ui';

export const MyScreen = () => (
  <Card variant="elevated">
    <Text variant="h2">Welcome</Text>
    <Input label="Email" placeholder="Enter your email" />
    <Button title="Submit" variant="primary" />
  </Card>
);
```

## 🎯 Design Tokens

### Colors

Colors are organized in semantic palettes with numbered variants:

```tsx
// Primary colors (brand colors)
colors.primary[50]   // Lightest
colors.primary[500]  // Base (most commonly used)
colors.primary[900]  // Darkest

// Semantic colors
colors.success[500]  // Green for success states
colors.warning[500]  // Orange for warnings  
colors.error[500]    // Red for errors
colors.info[500]     // Blue for information

// Neutral colors
colors.neutral[50]   // Very light gray
colors.neutral[500]  // Medium gray
colors.neutral[900]  // Very dark gray

// Contextual colors (theme-aware)
colors.text.primary     // Main text color
colors.text.secondary   // Subdued text
colors.background.primary   // Main background
colors.background.secondary // Card/surface background
colors.surface.overlay     // Modal overlays
```

### Typography

Typography tokens provide consistent text styling:

```tsx
// Font sizes
typography.fontSize.xs    // 12px
typography.fontSize.sm    // 14px  
typography.fontSize.base  // 16px (body text)
typography.fontSize.lg    // 18px
typography.fontSize.xl    // 20px
typography.fontSize.xxl   // 24px (headings)

// Font weights
typography.fontWeight.normal    // 400
typography.fontWeight.medium    // 500
typography.fontWeight.semibold  // 600
typography.fontWeight.bold      // 700

// Line heights
typography.lineHeight.tight   // 1.25
typography.lineHeight.normal  // 1.5
typography.lineHeight.relaxed // 1.75
```

### Spacing

Consistent spacing scale based on 4px increments:

```tsx
spacing[0]  // 0px
spacing[1]  // 4px
spacing[2]  // 8px
spacing[3]  // 12px
spacing[4]  // 16px (most common)
spacing[5]  // 20px
spacing[6]  // 24px
spacing[8]  // 32px
spacing[12] // 48px
spacing[16] // 64px
```

### Border Radius

Consistent corner radius values:

```tsx
borderRadius.none   // 0px
borderRadius.sm     // 4px
borderRadius.base   // 8px
borderRadius.md     // 12px
borderRadius.lg     // 16px
borderRadius.xl     // 24px
borderRadius.full   // 9999px (circular)
```

### Shadows

Elevation system for depth and hierarchy:

```tsx
shadows.sm    // Subtle shadow
shadows.base  // Standard shadow
shadows.md    // Medium shadow
shadows.lg    // Large shadow
shadows.xl    // Extra large shadow
```

## 🎨 Customizing Themes

### Modifying Existing Themes

Edit theme files in `src/theme/themes/`:

```tsx
// src/theme/themes/light.ts
export const lightTheme: ThemeConfig = {
  name: 'light',
  colors: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6',  // Change this to customize primary color
      900: '#1e3a8a',
    },
    // ... other colors
  },
  // ... other tokens
};
```

### Creating Custom Themes

1. Create a new theme file:

```tsx
// src/theme/themes/custom.ts
import { ThemeConfig } from './types';
import { defaultTypography, spacing, shadows, borderRadius } from '../tokens';

export const customTheme: ThemeConfig = {
  name: 'custom',
  colors: {
    primary: {
      50: '#fdf2f8',
      500: '#ec4899',  // Pink primary
      900: '#831843',
    },
    // ... define all required colors
  },
  typography: defaultTypography,
  spacing,
  shadows,
  borderRadius,
};
```

2. Add to theme provider:

```tsx
// src/theme/provider/ThemeProvider.tsx
import { customTheme } from '../themes/custom';

// Add custom theme to available themes
const availableThemes = {
  light: lightTheme,
  dark: darkTheme,
  custom: customTheme,
};
```

### Modifying Design Tokens

Edit token files in `src/theme/tokens/`:

```tsx
// src/theme/tokens/colors.ts
export const primaryColors = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',  // Base primary color
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
};
```

## 🧩 Component Variants

### Button Variants

```tsx
<Button variant="primary" />    // Solid primary color
<Button variant="secondary" />  // Solid secondary color  
<Button variant="outline" />    // Outlined style
<Button variant="ghost" />      // Text-only style
<Button variant="link" />       // Link appearance
```

### Card Variants

```tsx
<Card variant="default" />   // Basic card
<Card variant="outlined" />  // With border
<Card variant="elevated" />  // With shadow
<Card variant="filled" />    // Filled background
<Card variant="ghost" />     // Minimal styling
```

### Text Variants

```tsx
<Text variant="h1" />        // Large heading
<Text variant="h2" />        // Medium heading
<Text variant="h3" />        // Small heading
<Text variant="body" />      // Body text (default)
<Text variant="caption" />   // Small text
<Text variant="overline" />  // Uppercase small text
```

## 🎛️ Theme Switching

### Manual Theme Control

```tsx
import { useTheme } from '@/theme/provider';

export const ThemeToggle = () => {
  const { isDark, toggleTheme, setThemeMode } = useTheme();
  
  return (
    <>
      <Button onPress={toggleTheme}>
        Switch to {isDark ? 'Light' : 'Dark'} Mode
      </Button>
      
      <Button onPress={() => setThemeMode('system')}>
        Use System Theme
      </Button>
    </>
  );
};
```

### System Theme Detection

The theme provider automatically detects and follows system theme changes when set to 'system' mode.

## 🎨 Style Guide Pages

Access these pages through the DevTools overlay (🐞 button) → Styles tab:

- **Complete Style Guide** (`/styling-system-example`): Full component showcase
- **Simple Style Guide** (`/styling-system-example-simple`): Basic examples
- **Interactive Demo** (`/styling-system-demo`): Theme switching demo
- **Performance Demo** (`/styling-system-performance-demo`): Performance tools

## 🔧 Development Workflow

### 1. Design New Components

1. Start with the style guide pages to see existing patterns
2. Use design tokens for consistency
3. Follow the component variant pattern
4. Add accessibility props and proper contrast

### 2. Test Your Changes

```bash
# Run all tests
npm run test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration
```

### 3. Performance Optimization

- Use the StylePerformanceMonitor component for debugging
- Check theme switching performance (should be <16ms)
- Monitor memory usage during style operations
- Use memoized styles for expensive calculations

## 📱 Responsive Design

### Screen Size Breakpoints

```tsx
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const breakpoints = {
  sm: 640,   // Small phones
  md: 768,   // Large phones
  lg: 1024,  // Tablets
  xl: 1280,  // Large tablets
};

const isTablet = width >= breakpoints.md;
```

### Adaptive Spacing

```tsx
const getResponsiveSpacing = (size: 'sm' | 'md' | 'lg') => {
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  
  const spacingMap = {
    sm: isTablet ? spacing[3] : spacing[2],
    md: isTablet ? spacing[6] : spacing[4], 
    lg: isTablet ? spacing[8] : spacing[6],
  };
  
  return spacingMap[size];
};
```

## ♿ Accessibility Guidelines

### Color Contrast

- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio
- **UI elements**: Minimum 3:1 contrast ratio

### Component Accessibility

```tsx
<Button
  title="Submit"
  accessibilityLabel="Submit form"
  accessibilityHint="Submits the registration form"
  accessibilityRole="button"
/>

<Input
  label="Email"
  accessibilityLabel="Email address"
  accessibilityHint="Enter your email address"
/>
```

## 🚀 Performance Best Practices

### Style Optimization

```tsx
// ✅ Good: Use memoized styles
const styles = useMemo(() => StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    padding: spacing[4],
  },
}), [colors.background.primary, spacing]);

// ❌ Avoid: Inline styles in render
<View style={{
  backgroundColor: colors.background.primary, // Recreated every render
  padding: spacing[4],
}} />
```

### Theme Performance

```tsx
// ✅ Good: Destructure needed values
const { colors, spacing } = useTheme();

// ❌ Avoid: Using entire theme object
const theme = useTheme();
// theme.colors.primary[500] - causes unnecessary re-renders
```

## 🧪 Testing

### Component Testing

```tsx
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/provider';

const renderWithTheme = (component, theme = 'light') => {
  return render(
    <ThemeProvider initialTheme={theme}>
      {component}
    </ThemeProvider>
  );
};

test('renders with correct theme colors', () => {
  const { getByTestId } = renderWithTheme(<MyComponent />);
  // Test implementation
});
```

### Accessibility Testing

```tsx
import { getContrastRatio, isAccessibleContrast } from '@/utils/colors';

test('meets contrast requirements', () => {
  const contrast = getContrastRatio(textColor, backgroundColor);
  expect(isAccessibleContrast(contrast)).toBe(true);
});
```

## 🔍 Debugging

### Theme Debugging

Use the DevTools overlay to:
- Navigate to style guide pages
- View current theme information
- Access component examples
- Run performance tests

### Console Debugging

```tsx
// Log current theme state
console.log('Current theme:', theme.name);
console.log('Is dark mode:', isDark);
console.log('Available colors:', Object.keys(colors));

// Performance debugging
import { StylePerformanceDebugger } from '@/utils/performanceStyleUtils';
StylePerformanceDebugger.generateReport();
```

## 📚 Additional Resources

- **Component Examples**: `src/components/ui/__examples__/`
- **Test Suite**: Use `npm run test` for general tests or `npm run test:unit` for unit tests
- **Performance Utils**: `src/utils/performanceStyleUtils.ts`
- **Migration Tools**: `src/utils/migration/`

## 🤝 Contributing

When adding new components or modifying the theme system:

1. Follow the existing token structure
2. Add comprehensive tests
3. Update this README if needed
4. Test accessibility compliance
5. Verify performance impact
6. Add examples to the style guide

---

**Happy styling! 🎨**