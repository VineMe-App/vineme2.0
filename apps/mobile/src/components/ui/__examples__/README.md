# UI Component Examples

This directory contains interactive examples of all UI components in the design system.

## 📁 Available Examples

- **Button.example.tsx** - All button variants and states
- **Card.example.tsx** - Card layouts and interactions  
- **Input.example.tsx** - Form inputs and validation
- **Modal.example.tsx** - Modal dialogs and overlays
- **Text.example.tsx** - Typography variants

## 🎯 How to Use Examples

### 1. Import and Use in Style Guide Pages

```tsx
import { ButtonExample } from '@/components/ui/__examples__/Button.example';

export default function StyleGuidePage() {
  return (
    <ScrollView>
      <ButtonExample />
    </ScrollView>
  );
}
```

### 2. Copy Patterns for New Components

```tsx
// Example pattern from Button.example.tsx
const ExampleSection = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);
```

### 3. Test Component Behavior

Examples include:
- All component variants
- Interactive state changes
- Theme switching behavior
- Accessibility features
- Error states and edge cases

## 🔧 Adding New Examples

When creating a new UI component:

1. Create `ComponentName.example.tsx`
2. Show all variants and states
3. Include interactive demos
4. Add accessibility examples
5. Test with both light/dark themes

```tsx
// Template for new examples
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/provider';
import { YourComponent } from '../YourComponent';

export const YourComponentExample = () => {
  const { theme } = useTheme();
  const [state, setState] = useState(false);

  return (
    <ScrollView style={{ padding: theme.spacing[4] }}>
      {/* Basic usage */}
      <ExampleSection title="Basic Usage">
        <YourComponent />
      </ExampleSection>

      {/* Variants */}
      <ExampleSection title="Variants">
        <YourComponent variant="primary" />
        <YourComponent variant="secondary" />
      </ExampleSection>

      {/* Interactive states */}
      <ExampleSection title="Interactive">
        <YourComponent 
          active={state}
          onPress={() => setState(!state)}
        />
      </ExampleSection>
    </ScrollView>
  );
};
```