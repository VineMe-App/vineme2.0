# Styling System Quick Reference

## 🚀 Common Tasks

### Change Primary Brand Color

```tsx
// 1. Edit src/theme/tokens/colors.ts
export const primaryColors = {
  50: '#eff6ff',
  500: '#your-new-color', // Change this
  900: '#1e3a8a',
};

// 2. Or create custom theme in src/theme/themes/
export const customTheme = {
  colors: {
    primary: { 500: '#your-new-color' },
  },
};
```

### Add New Component Variant

```tsx
// 1. Define variant in component
type ButtonVariant = 'primary' | 'secondary' | 'your-new-variant';

// 2. Add styling logic
const getVariantStyles = (variant: ButtonVariant) => {
  switch (variant) {
    case 'your-new-variant':
      return {
        backgroundColor: colors.your.color,
        borderColor: colors.your.border,
      };
  }
};
```

### Create Responsive Styles

```tsx
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const styles = {
  container: {
    padding: isTablet ? spacing[6] : spacing[4],
    fontSize: isTablet ? typography.fontSize.lg : typography.fontSize.base,
  },
};
```

### Add Dark Mode Support

```tsx
// Colors automatically switch with theme
const { colors, isDark } = useTheme();

// Manual dark mode logic if needed
const iconName = isDark ? 'moon' : 'sun';
const customStyle = isDark ? darkStyles : lightStyles;
```

## 🎨 Token Reference

### Most Used Colors

```tsx
colors.primary[500]; // Brand primary
colors.text.primary; // Main text
colors.text.secondary; // Subdued text
colors.background.primary; // Main background
colors.background.secondary; // Cards/surfaces
colors.error[500]; // Error states
colors.success[500]; // Success states
```

### Most Used Spacing

```tsx
spacing[2]; // 8px  - Small gaps
spacing[4]; // 16px - Standard padding
spacing[6]; // 24px - Large padding
spacing[8]; // 32px - Section spacing
```

### Most Used Typography

```tsx
typography.fontSize.base; // 16px - Body text
typography.fontSize.lg; // 18px - Subheadings
typography.fontSize.xl; // 20px - Headings
typography.fontWeight.medium; // 500 - Emphasis
typography.fontWeight.semibold; // 600 - Headings
```

## 🧩 Component Patterns

### Standard Button

```tsx
<Button title="Action" variant="primary" size="medium" onPress={handlePress} />
```

### Form Input

```tsx
<Input
  label="Field Label"
  placeholder="Enter value"
  value={value}
  onChangeText={setValue}
  error={errorMessage}
/>
```

### Card Container

```tsx
<Card variant="elevated">
  <Text variant="h3">Card Title</Text>
  <Text variant="body">Card content</Text>
</Card>
```

## 🔧 DevTools Access

1. Look for 🐞 button (bottom right)
2. Click "STYLES" tab
3. Navigate to style guide pages
4. Use quick actions for info

## 📱 Testing Your Changes

```bash
# Run all tests
npm run test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration
```

## 🎯 Style Guide Pages

- `/styling-system-example` - Complete showcase
- `/styling-system-example-simple` - Basic examples
- `/styling-system-demo` - Interactive demo
- `/styling-system-performance-demo` - Performance tools
