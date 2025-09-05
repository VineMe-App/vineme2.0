# Migration Guide: Adopting the Styling System

Guide for migrating existing components to use the new theme-based styling system.

## 🎯 Migration Strategy

### Phase 1: Wrap App with ThemeProvider ✅
Already completed - ThemeProvider is in the root layout.

### Phase 2: Migrate Core Components
Update frequently used components first for maximum impact.

### Phase 3: Migrate Screens
Update screens to use themed components and tokens.

### Phase 4: Clean Up
Remove old styling patterns and unused code.

## 🔄 Component Migration Pattern

### Before (Old Pattern)
```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const OldButton = ({ title, onPress, primary }) => (
  <TouchableOpacity 
    style={[styles.button, primary && styles.primaryButton]}
    onPress={onPress}
  >
    <Text style={[styles.text, primary && styles.primaryText]}>
      {title}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  text: {
    fontSize: 16,
    color: '#374151',
  },
  primaryText: {
    color: '#ffffff',
  },
});
```

### After (New Pattern)
```tsx
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/theme/provider';

const NewButton = ({ title, onPress, variant = 'secondary' }) => {
  const { colors, spacing, typography, borderRadius } = useTheme();
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary[500],
          color: colors.white,
        };
      case 'secondary':
      default:
        return {
          backgroundColor: colors.neutral[100],
          color: colors.text.primary,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <TouchableOpacity 
      style={{
        padding: spacing[3],
        borderRadius: borderRadius.md,
        backgroundColor: variantStyles.backgroundColor,
      }}
      onPress={onPress}
    >
      <Text style={{
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.medium,
        color: variantStyles.color,
      }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};
```

## 📋 Migration Checklist

### ✅ Component Migration Steps

1. **Add Theme Hook**
   ```tsx
   import { useTheme } from '@/theme/provider';
   const { colors, spacing, typography } = useTheme();
   ```

2. **Replace Hard-coded Values**
   ```tsx
   // Before
   padding: 16,
   fontSize: 18,
   color: '#374151',
   
   // After  
   padding: spacing[4],
   fontSize: typography.fontSize.lg,
   color: colors.text.primary,
   ```

3. **Add Variant Support**
   ```tsx
   type ComponentVariant = 'primary' | 'secondary' | 'outline';
   
   const getVariantStyles = (variant: ComponentVariant) => {
     // Return appropriate styles
   };
   ```

4. **Update Props Interface**
   ```tsx
   interface ComponentProps {
     variant?: ComponentVariant;
     size?: 'sm' | 'md' | 'lg';
     // Remove old style props, use variants instead
   }
   ```

5. **Add Accessibility**
   ```tsx
   <TouchableOpacity
     accessibilityRole="button"
     accessibilityLabel={accessibilityLabel}
     accessibilityHint={accessibilityHint}
   >
   ```

### 🎨 Screen Migration Steps

1. **Import Themed Components**
   ```tsx
   import { Button, Card, Text, Input } from '@/components/ui';
   ```

2. **Replace StyleSheet with Theme Tokens**
   ```tsx
   // Before
   const styles = StyleSheet.create({
     container: {
       padding: 20,
       backgroundColor: '#ffffff',
     },
   });
   
   // After
   const { colors, spacing } = useTheme();
   const containerStyle = {
     padding: spacing[5],
     backgroundColor: colors.background.primary,
   };
   ```

3. **Use Semantic Colors**
   ```tsx
   // Before: Hard-coded colors
   backgroundColor: '#f3f4f6',
   color: '#111827',
   
   // After: Semantic colors
   backgroundColor: colors.background.secondary,
   color: colors.text.primary,
   ```

## 🔧 Common Migration Patterns

### Color Migration
```tsx
// Old hard-coded colors → New semantic colors
'#ffffff' → colors.white
'#000000' → colors.black  
'#f3f4f6' → colors.neutral[100]
'#374151' → colors.neutral[700]
'#3b82f6' → colors.primary[500]
'#ef4444' → colors.error[500]
'#10b981' → colors.success[500]
```

### Spacing Migration
```tsx
// Old pixel values → New spacing tokens
padding: 8   → padding: spacing[2]
padding: 12  → padding: spacing[3] 
padding: 16  → padding: spacing[4]
padding: 20  → padding: spacing[5]
padding: 24  → padding: spacing[6]
margin: 32   → margin: spacing[8]
```

### Typography Migration
```tsx
// Old font styles → New typography tokens
fontSize: 14 → fontSize: typography.fontSize.sm
fontSize: 16 → fontSize: typography.fontSize.base
fontSize: 18 → fontSize: typography.fontSize.lg
fontSize: 24 → fontSize: typography.fontSize.xl

fontWeight: '500' → fontWeight: typography.fontWeight.medium
fontWeight: '600' → fontWeight: typography.fontWeight.semibold
fontWeight: '700' → fontWeight: typography.fontWeight.bold
```

## 🧪 Testing Migration

### 1. Visual Testing
- Test component in both light and dark themes
- Verify all variants render correctly
- Check responsive behavior on different screen sizes

### 2. Accessibility Testing
```tsx
import { getContrastRatio, isAccessibleContrast } from '@/utils/colors';

// Test color contrast
const contrast = getContrastRatio(textColor, backgroundColor);
expect(isAccessibleContrast(contrast)).toBe(true);
```

### 3. Performance Testing
```tsx
// Monitor theme switching performance
import { StylePerformanceDebugger } from '@/utils/performanceStyleUtils';

// Check for performance regressions
const report = StylePerformanceDebugger.generateReport();
```

## 🚨 Common Pitfalls

### ❌ Don't Do This
```tsx
// Don't use theme object directly in styles
const theme = useTheme();
<View style={{ backgroundColor: theme.colors.primary[500] }} />

// Don't mix old and new patterns
<View style={[oldStyles.container, { backgroundColor: colors.primary[500] }]} />

// Don't hard-code values alongside tokens
<View style={{ 
  padding: spacing[4],
  margin: 20, // ❌ Hard-coded
}} />
```

### ✅ Do This Instead
```tsx
// Destructure needed values
const { colors, spacing } = useTheme();
<View style={{ backgroundColor: colors.primary[500] }} />

// Use consistent token-based approach
<View style={{
  padding: spacing[4],
  margin: spacing[5], // ✅ Token-based
}} />

// Create memoized styles for performance
const styles = useMemo(() => ({
  container: {
    backgroundColor: colors.background.primary,
    padding: spacing[4],
  },
}), [colors.background.primary, spacing]);
```

## 📈 Migration Progress Tracking

### High Priority Components
- [ ] Button
- [ ] Input  
- [ ] Card
- [ ] Text
- [ ] Modal

### Medium Priority Components  
- [ ] Avatar
- [ ] Badge
- [ ] Spinner
- [ ] Checkbox
- [ ] Select

### Low Priority Components
- [ ] Divider
- [ ] Backdrop
- [ ] Portal
- [ ] Overlay

### Screens
- [ ] Auth screens
- [ ] Main tab screens  
- [ ] Profile screens
- [ ] Admin screens

## 🎉 Migration Benefits

After migration, you'll have:
- **Consistent Design**: All components follow the same design language
- **Theme Support**: Automatic light/dark mode switching
- **Better Performance**: Optimized style generation and caching
- **Accessibility**: WCAG compliant colors and patterns
- **Developer Experience**: Type-safe tokens and better debugging tools
- **Maintainability**: Centralized design tokens, easier to update

## 🆘 Need Help?

1. **Check Examples**: Look at `src/components/ui/__examples__/`
2. **Use DevTools**: Access style guide via 🐞 → Styles tab
3. **Read Docs**: `src/theme/README.md` and `src/theme/QUICK_REFERENCE.md`
4. **Run Tests**: `npm run test:styling-system` to verify changes