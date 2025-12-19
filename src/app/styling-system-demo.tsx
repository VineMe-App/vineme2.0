/**
 * Styling System Demo Screen
 * Demonstrates core theme functionality and component integration
 */

import React, { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Alert,
  Switch,
  Text as RNText,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/provider/useTheme';

// Simple themed components for demo
const ThemedText = ({ children, style, variant = 'body', ...props }: any) => {
  const { colors, typography } = useTheme();

  const getVariantStyle = () => {
    switch (variant) {
      case 'h1':
        return {
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
        };
      case 'h2':
        return {
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semiBold,
          color: colors.text.primary,
        };
      case 'caption':
        return {
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
        };
      default:
        return {
          fontSize: typography.fontSize.base,
          color: colors.text.primary,
        };
    }
  };

  return (
    <RNText style={[getVariantStyle(), style]} {...props}>
      {children}
    </RNText>
  );
};

const ThemedButton = ({
  title,
  variant = 'primary',
  onPress,
  disabled,
  style,
  ...props
}: any) => {
  const { colors, spacing, borderRadius } = useTheme();

  const getButtonStyle = () => {
    const baseStyle = {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    };

    if (disabled) {
      return {
        ...baseStyle,
        backgroundColor: colors.neutral[300],
        opacity: 0.6,
      };
    }

    switch (variant) {
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: colors.secondary[500],
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.primary[500],
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: colors.error[500],
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: colors.primary[500],
        };
    }
  };

  const getTextStyle = () => {
    if (variant === 'outline' || variant === 'ghost') {
      return { color: colors.primary[500] };
    }
    return { color: '#fff', fontWeight: '600' };
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      {...props}
    >
      <RNText style={getTextStyle()}>{title}</RNText>
    </TouchableOpacity>
  );
};

const ThemedCard = ({
  children,
  variant = 'default',
  style,
  ...props
}: any) => {
  const { colors, spacing, borderRadius, shadows } = useTheme();

  const getCardStyle = () => {
    const baseStyle = {
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.md,
    };

    switch (variant) {
      case 'outlined':
        return {
          ...baseStyle,
          backgroundColor: colors.surface.primary,
          borderWidth: 1,
          borderColor: colors.border.primary,
        };
      case 'elevated':
        return {
          ...baseStyle,
          backgroundColor: colors.surface.primary,
          ...shadows.md,
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: colors.surface.primary,
        };
    }
  };

  return (
    <View style={[getCardStyle(), style]} {...props}>
      {children}
    </View>
  );
};

const ThemedInput = ({
  label,
  error,
  success,
  disabled,
  style,
  ...props
}: any) => {
  const { colors, spacing, borderRadius, typography } = useTheme();

  const getInputStyle = () => {
    const baseStyle = {
      borderWidth: 1,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: typography.fontSize.base,
      color: colors.text.primary,
      backgroundColor: colors.surface.primary,
      minHeight: 44,
    };

    if (disabled) {
      return {
        ...baseStyle,
        backgroundColor: colors.neutral[100],
        borderColor: colors.neutral[300],
        color: colors.text.disabled,
      };
    }

    if (error) {
      return {
        ...baseStyle,
        borderColor: colors.error[500],
      };
    }

    if (success) {
      return {
        ...baseStyle,
        borderColor: colors.success[500],
      };
    }

    return {
      ...baseStyle,
      borderColor: colors.border.primary,
    };
  };

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label && (
        <ThemedText variant="caption" style={{ marginBottom: spacing.xs }}>
          {label}
        </ThemedText>
      )}
      <TextInput
        style={[getInputStyle(), style]}
        editable={!disabled}
        placeholderTextColor={colors.text.secondary}
        {...props}
      />
      {error && (
        <ThemedText
          variant="caption"
          style={{ color: colors.error[500], marginTop: spacing.xs }}
        >
          {error}
        </ThemedText>
      )}
    </View>
  );
};

export default function StylingSystemDemo() {
  const { theme, isDark, toggleTheme, colors, spacing } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [switchValue, setSwitchValue] = useState(false);

  const styles = createStyles(colors, spacing);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        testID="scroll-view"
      >
        {/* Header Section */}
        <View style={styles.section}>
          <ThemedText variant="h1" style={styles.title}>
            Styling System Demo
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Comprehensive showcase of theme features and components
          </ThemedText>
        </View>

        {/* Theme Controls */}
        <ThemedCard variant="elevated" style={styles.section}>
          <ThemedText variant="h2">Theme Controls</ThemedText>
          <View style={styles.themeControls}>
            <ThemedText>Current Theme: {isDark ? 'Dark' : 'Light'}</ThemedText>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{
                false: colors.neutral[300],
                true: colors.primary[500],
              }}
              thumbColor={isDark ? colors.primary[200] : colors.neutral[50]}
              testID="theme-toggle"
            />
          </View>
          <ThemedText variant="caption">
            Toggle between light and dark themes to see real-time updates
          </ThemedText>
        </ThemedCard>

        {/* Typography Section */}
        <ThemedCard variant="outlined">
          <ThemedText variant="h2">Typography Variants</ThemedText>
          <View style={styles.typographyGrid}>
            <ThemedText variant="h1">Heading 1</ThemedText>
            <ThemedText variant="h2">Heading 2</ThemedText>
            <ThemedText variant="body">Body Text - Regular content</ThemedText>
            <ThemedText variant="caption">
              Caption - Metadata and hints
            </ThemedText>
          </View>
        </ThemedCard>

        {/* Button Variants */}
        <ThemedCard>
          <ThemedText variant="h2">Button Variants</ThemedText>
          <View style={styles.buttonGrid}>
            <ThemedButton
              title="Primary"
              variant="primary"
              onPress={() => Alert.alert('Primary', 'Primary button pressed')}
            />
            <ThemedButton
              title="Secondary"
              variant="secondary"
              onPress={() =>
                Alert.alert('Secondary', 'Secondary button pressed')
              }
            />
            <ThemedButton
              title="Outline"
              variant="outline"
              onPress={() => Alert.alert('Outline', 'Outline button pressed')}
            />
            <ThemedButton
              title="Ghost"
              variant="ghost"
              onPress={() => Alert.alert('Ghost', 'Ghost button pressed')}
            />
            <ThemedButton
              title="Danger"
              variant="danger"
              onPress={() => Alert.alert('Danger', 'Danger button pressed')}
            />
            <ThemedButton
              title="Disabled"
              variant="primary"
              disabled
              onPress={() => {}}
            />
          </View>
        </ThemedCard>

        {/* Form Components */}
        <ThemedCard>
          <ThemedText variant="h2">Form Components</ThemedText>
          <View style={styles.formContainer}>
            <ThemedInput
              label="Full Name"
              placeholder="Enter your full name"
              value={inputValue}
              onChangeText={setInputValue}
            />

            <ThemedInput
              label="Email Address"
              placeholder="Enter your email"
              keyboardType="email-address"
              error="Please enter a valid email address"
            />

            <ThemedInput
              label="Success State"
              placeholder="This input shows success state"
              success
            />

            <ThemedInput
              label="Disabled Input"
              placeholder="This input is disabled"
              disabled
            />

            <View style={styles.switchRow}>
              <Switch
                value={switchValue}
                onValueChange={setSwitchValue}
                trackColor={{
                  false: colors.neutral[300],
                  true: colors.primary[500],
                }}
                thumbColor={
                  switchValue ? colors.primary[200] : colors.neutral[50]
                }
              />
              <ThemedText style={styles.switchLabel}>
                Enable notifications
              </ThemedText>
            </View>
          </View>
        </ThemedCard>

        {/* Accessibility Features */}
        <ThemedCard variant="elevated">
          <ThemedText variant="h2">Accessibility Features</ThemedText>
          <ThemedText>
            All components include proper accessibility labels, roles, and
            keyboard navigation support.
          </ThemedText>

          <View style={styles.accessibilityGrid}>
            <ThemedButton
              title="High Contrast Test"
              variant="primary"
              onPress={() =>
                Alert.alert(
                  'Accessibility',
                  'This button meets WCAG contrast requirements'
                )
              }
              accessibilityHint="Tests high contrast accessibility compliance"
            />

            <ThemedInput
              label="Screen Reader Test"
              placeholder="Try with screen reader enabled"
              accessibilityLabel="Screen reader test input field"
              accessibilityHint="This input demonstrates proper screen reader support"
            />
          </View>
        </ThemedCard>

        {/* Color Showcase */}
        <ThemedCard>
          <ThemedText variant="h2">Color System</ThemedText>
          <ThemedText>Theme-aware color system with hex values</ThemedText>

          <View style={styles.colorGrid}>
            <View
              style={[
                styles.colorSwatch,
                { backgroundColor: colors.primary[500] },
              ]}
            >
              <ThemedText style={styles.colorLabel}>Primary</ThemedText>
              <ThemedText style={styles.colorHex}>
                {colors.primary[500]}
              </ThemedText>
            </View>
            <View
              style={[
                styles.colorSwatch,
                { backgroundColor: colors.secondary[500] },
              ]}
            >
              <ThemedText style={styles.colorLabel}>Secondary</ThemedText>
              <ThemedText style={styles.colorHex}>
                {colors.secondary[500]}
              </ThemedText>
            </View>
            <View
              style={[
                styles.colorSwatch,
                { backgroundColor: colors.blue[500] },
              ]}
            >
              <ThemedText style={styles.colorLabel}>Blue</ThemedText>
              <ThemedText style={styles.colorHex}>
                {colors.blue[500]}
              </ThemedText>
            </View>
            <View
              style={[
                styles.colorSwatch,
                { backgroundColor: colors.green[500] },
              ]}
            >
              <ThemedText style={styles.colorLabel}>Green</ThemedText>
              <ThemedText style={styles.colorHex}>
                {colors.green[500]}
              </ThemedText>
            </View>
            <View
              style={[
                styles.colorSwatch,
                { backgroundColor: colors.orange[500] },
              ]}
            >
              <ThemedText style={styles.colorLabel}>Orange</ThemedText>
              <ThemedText style={styles.colorHex}>
                {colors.orange[500]}
              </ThemedText>
            </View>
            <View
              style={[styles.colorSwatch, { backgroundColor: colors.red[500] }]}
            >
              <ThemedText style={styles.colorLabel}>Red</ThemedText>
              <ThemedText style={styles.colorHex}>{colors.red[500]}</ThemedText>
            </View>
          </View>
        </ThemedCard>

        {/* Spacing System */}
        <ThemedCard>
          <ThemedText variant="h2">Spacing System</ThemedText>
          <ThemedText>
            Consistent spacing scale with pixel measurements
          </ThemedText>

          <View style={styles.spacingGrid}>
            <View style={[styles.spacingExample, { padding: spacing[1] }]}>
              <ThemedText style={styles.spacingLabel}>
                spacing[1] = {spacing[1]}px
              </ThemedText>
            </View>
            <View style={[styles.spacingExample, { padding: spacing[2] }]}>
              <ThemedText style={styles.spacingLabel}>
                spacing[2] = {spacing[2]}px
              </ThemedText>
            </View>
            <View style={[styles.spacingExample, { padding: spacing[4] }]}>
              <ThemedText style={styles.spacingLabel}>
                spacing[4] = {spacing[4]}px
              </ThemedText>
            </View>
            <View style={[styles.spacingExample, { padding: spacing[6] }]}>
              <ThemedText style={styles.spacingLabel}>
                spacing[6] = {spacing[6]}px
              </ThemedText>
            </View>
            <View style={[styles.spacingExample, { padding: spacing[8] }]}>
              <ThemedText style={styles.spacingLabel}>
                spacing[8] = {spacing[8]}px
              </ThemedText>
            </View>
            <View style={[styles.spacingExample, { padding: spacing[12] }]}>
              <ThemedText style={styles.spacingLabel}>
                spacing[12] = {spacing[12]}px
              </ThemedText>
            </View>
          </View>
        </ThemedCard>

        {/* Interactive Demo */}
        <ThemedCard variant="outlined">
          <ThemedText variant="h2">Interactive Components</ThemedText>
          <ThemedText variant="caption">
            Interactive elements showcase with proper theming and accessibility.
          </ThemedText>

          <ThemedButton
            title="Interactive Demo"
            variant="outline"
            onPress={() =>
              Alert.alert('Interactive', 'Interactive component demo')
            }
            style={styles.modalButton}
          />
        </ThemedCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, spacing: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    section: {
      marginBottom: spacing.lg,
    },
    title: {
      textAlign: 'center',
      marginTop: spacing.md,
    },
    subtitle: {
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    themeControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: spacing.md,
    },
    typographyGrid: {
      gap: spacing.sm,
    },
    buttonGrid: {
      gap: spacing.sm,
    },
    formContainer: {
      gap: spacing.md,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginVertical: spacing.sm,
    },
    switchLabel: {
      flex: 1,
    },
    modalButton: {
      marginTop: spacing.md,
    },
    accessibilityGrid: {
      gap: spacing.md,
      marginTop: spacing.md,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    colorSwatch: {
      width: 80,
      height: 80,
      borderRadius: spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xs,
    },
    colorLabel: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#fff',
      textAlign: 'center',
      marginBottom: 2,
    },
    colorHex: {
      fontSize: 8,
      color: '#fff',
      textAlign: 'center',
      opacity: 0.9,
    },
    spacingGrid: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    spacingExample: {
      backgroundColor: colors.primary[100],
      borderRadius: spacing.sm,
      borderWidth: 1,
      borderColor: colors.primary[300],
      borderStyle: 'dashed',
      marginBottom: spacing.sm,
    },
    spacingLabel: {
      fontSize: 12,
      color: colors.primary[700],
      textAlign: 'center',
      fontWeight: '600',
    },
  });
