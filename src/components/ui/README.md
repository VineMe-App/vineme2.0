# VineMe UI Component Library

A comprehensive, accessible, and consistent UI component library built with React Native and TypeScript for the VineMe mobile application.

## Features

- 🎨 **Consistent Design System**: Built with design tokens for colors, typography, spacing, and shadows
- ♿ **Accessibility First**: All components include proper accessibility labels and support
- 📱 **Mobile Optimized**: Designed specifically for mobile interfaces with proper touch targets
- 🔧 **TypeScript Support**: Full type safety with comprehensive interfaces
- 🧪 **Well Tested**: Comprehensive test coverage for all components
- 📚 **Well Documented**: Clear documentation and examples for all components

## Design Tokens

The component library is built on a foundation of design tokens that ensure consistency across the application.

### Colors

```typescript
import { Theme } from '../../utils/theme';

// Primary colors
Theme.colors.primary; // #007AFF
Theme.colors.secondary; // #5856D6

// Semantic colors
Theme.colors.success; // #34C759
Theme.colors.warning; // #FF9500
Theme.colors.error; // #FF3B30

// Text colors
Theme.colors.textPrimary; // #111827
Theme.colors.textSecondary; // #6B7280
Theme.colors.textTertiary; // #9CA3AF
```

### Typography

```typescript
// Font sizes
Theme.typography.fontSize.xs; // 12
Theme.typography.fontSize.sm; // 14
Theme.typography.fontSize.base; // 16
Theme.typography.fontSize.lg; // 18

// Font weights
Theme.typography.fontWeight.normal; // '400'
Theme.typography.fontWeight.medium; // '500'
Theme.typography.fontWeight.semiBold; // '600'
Theme.typography.fontWeight.bold; // '700'
```

### Spacing

```typescript
Theme.spacing.xs; // 4
Theme.spacing.sm; // 8
Theme.spacing.base; // 16
Theme.spacing.xl; // 24
```

## Components

### Button

A versatile button component with multiple variants and sizes.

```tsx
import { Button } from '../components/ui';

// Basic usage
<Button title="Click me" onPress={() => {}} />

// With variants
<Button title="Primary" onPress={() => {}} variant="primary" />
<Button title="Secondary" onPress={() => {}} variant="secondary" />
<Button title="Danger" onPress={() => {}} variant="danger" />
<Button title="Ghost" onPress={() => {}} variant="ghost" />
<Button title="Outline" onPress={() => {}} variant="outline" />

// With sizes
<Button title="Small" onPress={() => {}} size="small" />
<Button title="Medium" onPress={() => {}} size="medium" />
<Button title="Large" onPress={() => {}} size="large" />

// With states
<Button title="Loading" onPress={() => {}} loading />
<Button title="Disabled" onPress={() => {}} disabled />
```

### Input

A flexible input component with validation support. Styled to match the onboarding design with consistent borderWidth: 2, borderRadius: 12, and padding.

```tsx
import { Input } from '../components/ui';

// Basic usage (matches onboarding style)
<Input
  label="Email"
  placeholder="Enter your email"
  value={email}
  onChangeText={setEmail}
/>

// With validation
<Input
  label="Password"
  placeholder="Enter password"
  value={password}
  onChangeText={setPassword}
  error={passwordError}
  required
  secureTextEntry
/>

// Multiline input
<Input
  label="Bio (optional)"
  value={bio}
  onChangeText={setBio}
  multiline
  numberOfLines={6}
  textAlignVertical="top"
/>

// With variants
<Input variant="filled" placeholder="Filled input" />
<Input variant="outlined" placeholder="Outlined input" />
```

### Card

A container component for grouping related content.

```tsx
import { Card } from '../components/ui';

// Basic usage
<Card>
  <Text>Card content</Text>
</Card>

// Pressable card
<Card onPress={() => console.log('Card pressed')}>
  <Text>Pressable card</Text>
</Card>

// With variants
<Card variant="outlined">
  <Text>Outlined card</Text>
</Card>

<Card variant="elevated">
  <Text>Elevated card</Text>
</Card>
```

### CTACard

A standardized call-to-action card component for consistent CTA styling across the app.

```tsx
import { CTACard } from '../components/ui';

// Basic usage
<CTACard
  title="Connect a friend"
  description="Help someone join our community"
  onPress={() => router.push('/referral-landing')}
/>

// With icon
<CTACard
  title="Create a group"
  description="Start your own group"
  iconName="people-outline"
  iconColor="#007AFF"
  onPress={() => router.push('/group/create')}
/>

// With variants
<CTACard variant="default" title="Default CTA" onPress={() => {}} />
<CTACard variant="filled" title="Filled CTA" onPress={() => {}} />
<CTACard variant="outlined" title="Outlined CTA" onPress={() => {}} />
```

### Header

A standardized header component for consistent header styling across screens.

```tsx
import { Header } from '../components/ui';

// Basic usage
<Header title="Screen Title" />

// With back button handler
<Header
  title="Edit Profile"
  onBackPress={() => router.back()}
/>

// With right actions
<Header
  title="Notifications"
  rightActions={
    <TouchableOpacity onPress={handleSettings}>
      <Ionicons name="settings-outline" size={24} />
    </TouchableOpacity>
  }
/>

// With subtitle
<Header
  title="Groups"
  subtitle="Find your community"
/>
```

### Footer

A standardized footer component for consistent footer styling.

```tsx
import { Footer } from '../components/ui';

<Footer>
  <Button title="Submit" onPress={handleSubmit} />
  <Text variant="caption" color="secondary">
    By continuing, you agree to our Terms
  </Text>
</Footer>
```

### Form with Validation

A comprehensive form system with built-in validation.

```tsx
import { Form, FormField, Input, Button } from '../components/ui';

const formConfig = {
  email: {
    rules: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    initialValue: '',
  },
  password: {
    rules: { required: true, minLength: 8 },
    initialValue: '',
  },
};

<Form config={formConfig} onSubmit={handleSubmit}>
  <FormField name="email">
    {({ value, error, onChange, onBlur }) => (
      <Input
        label="Email"
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        error={error}
        keyboardType="email-address"
        required
      />
    )}
  </FormField>

  <FormField name="password">
    {({ value, error, onChange, onBlur }) => (
      <Input
        label="Password"
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        error={error}
        secureTextEntry
        required
      />
    )}
  </FormField>

  <Button title="Submit" onPress={() => {}} />
</Form>;
```

### Select

A dropdown selection component.

```tsx
import { Select } from '../components/ui';

const options = [
  { label: 'Option 1', value: '1' },
  { label: 'Option 2', value: '2' },
  { label: 'Option 3', value: '3' },
];

<Select
  label="Choose an option"
  options={options}
  value={selectedValue}
  onSelect={(option) => setSelectedValue(option.value)}
  placeholder="Select an option"
/>;
```

### Checkbox

A checkbox component with label support.

```tsx
import { Checkbox } from '../components/ui';

<Checkbox
  checked={isChecked}
  onPress={() => setIsChecked(!isChecked)}
  label="I agree to the terms and conditions"
/>;
```

### Badge

A small status indicator component.

```tsx
import { Badge } from '../components/ui';

<Badge variant="primary">New</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Error</Badge>
```

### Modal

A modal dialog component.

```tsx
import { Modal, Button } from '../components/ui';

<Modal
  isVisible={isModalVisible}
  onClose={() => setIsModalVisible(false)}
  title="Confirmation"
  size="medium"
>
  <Text>Are you sure you want to continue?</Text>
  <Button title="Confirm" onPress={handleConfirm} />
</Modal>;
```

### Loading States

Components for displaying loading states.

```tsx
import { LoadingSpinner, EmptyState } from '../components/ui';

// Loading spinner
<LoadingSpinner size="large" message="Loading..." />

// Empty state
<EmptyState
  title="No items found"
  message="There are no items to display."
  action={<Button title="Refresh" onPress={refresh} />}
/>
```

## Validation Rules

The form system supports various validation rules:

```typescript
interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | undefined;
}

// Example usage
const rules = {
  required: true,
  minLength: 3,
  maxLength: 50,
  pattern: /^[a-zA-Z\s]+$/,
  custom: (value) => (value === 'admin' ? 'Username not allowed' : undefined),
};
```

## Accessibility

All components are built with accessibility in mind:

- Proper `accessibilityRole` attributes
- `accessibilityLabel` and `accessibilityHint` support
- `accessibilityState` for interactive elements
- Minimum touch target sizes (44pt)
- High contrast color ratios
- Screen reader support

## Testing

The component library includes comprehensive tests:

```bash
# Run UI component tests
npm test -- src/components/ui/__tests__/ui-components.test.tsx
```

## Examples

See the `ComponentShowcase.tsx` file in the `__examples__` directory for a comprehensive demonstration of all components and their usage patterns.

## Styling Consistency

The UI component library ensures consistent styling across the app:

- **CTAs**: Use `CTACard` component for all call-to-action cards
- **Cards**: Use `Card` component or ensure consistent borderRadius (12), shadows, and padding
- **Buttons**: Always use `Button` component instead of custom TouchableOpacity
- **Inputs**: Use `Input` component which matches onboarding style (borderWidth: 2, borderRadius: 12)
- **Text**: Use `Text` component from `@/components/ui/Text` instead of raw React Native Text
- **Modals**: Use `Modal` component for all modal dialogs
- **Headers/Footers**: Use `Header` and `Footer` components for consistent navigation

## Best Practices

1. **Use Design Tokens**: Always use theme values instead of hardcoded values
2. **Accessibility First**: Include proper accessibility attributes
3. **Consistent Spacing**: Use theme spacing values for consistent layouts
4. **Type Safety**: Leverage TypeScript for better development experience
5. **Test Coverage**: Write tests for custom components and validation logic
6. **Performance**: Use React.memo for components that don't need frequent re-renders
7. **Single Source of Truth**: Use standardized components (CTACard, Header, Footer, Button, Input, Card) instead of custom implementations

## Contributing

When adding new components:

1. Follow the existing patterns and conventions
2. Use design tokens from the theme
3. Include proper TypeScript interfaces
4. Add accessibility attributes
5. Write comprehensive tests
6. Update this documentation
7. Add examples to the showcase

## Migration Guide

If you're migrating from hardcoded styles to this component library:

1. Replace hardcoded colors with theme colors
2. Replace hardcoded spacing with theme spacing
3. Use the new form validation system instead of custom validation
4. Update button and input components to use the new variants
5. Add proper accessibility attributes to custom components
