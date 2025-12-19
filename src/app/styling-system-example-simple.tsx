/**
 * Styling System Example Screen - Simple Version
 * Demonstrates core theme functionality without problematic dependencies
 */

import React, { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Alert,
  Switch,
  Text as RNText,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/provider/useTheme';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

// Simple themed text components
const ThemedText = ({ children, style, ...props }: any) => {
  const { colors } = useTheme();
  return (
    <RNText style={[{ color: colors.text.primary }, style]} {...props}>
      {children}
    </RNText>
  );
};

const Heading1 = ({ children, style, ...props }: any) => {
  const { colors, typography } = useTheme();
  return (
    <RNText
      style={[
        {
          color: colors.text.primary,
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};

const Heading2 = ({ children, style, ...props }: any) => {
  const { colors, typography } = useTheme();
  return (
    <RNText
      style={[
        {
          color: colors.text.primary,
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semiBold,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};

const BodyText = ({ children, style, ...props }: any) => {
  const { colors, typography } = useTheme();
  return (
    <RNText
      style={[
        {
          color: colors.text.primary,
          fontSize: typography.fontSize.base,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};

const Caption = ({ children, style, ...props }: any) => {
  const { colors, typography } = useTheme();
  return (
    <RNText
      style={[
        {
          color: colors.text.secondary,
          fontSize: typography.fontSize.sm,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};

export default function StylingSystemExampleSimple() {
  const { theme, isDark, toggleTheme, colors, spacing } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [switchValue, setSwitchValue] = useState(false);

  const styles = createStyles(colors, spacing, isDark);

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
          <Heading1 style={styles.title}>Styling System Demo</Heading1>
          <BodyText style={styles.subtitle}>
            Comprehensive showcase of theme features and components
          </BodyText>
        </View>

        {/* Theme Controls */}
        <Card variant="elevated" style={styles.section}>
          <Heading2>Theme Controls</Heading2>
          <View style={styles.themeControls}>
            <BodyText>Current Theme: {isDark ? 'Dark' : 'Light'}</BodyText>
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
          <Caption>
            Toggle between light and dark themes to see real-time updates
          </Caption>
        </Card>

        {/* Typography Section */}
        <Card variant="outlined" style={styles.section}>
          <Heading2>Typography Variants</Heading2>
          <View style={styles.typographyGrid}>
            <Heading1>Heading 1</Heading1>
            <Heading2>Heading 2</Heading2>
            <BodyText>Body Text - Regular content</BodyText>
            <Caption>Caption - Metadata and hints</Caption>
          </View>
        </Card>

        {/* Button Variants */}
        <Card style={styles.section}>
          <Heading2>Button Variants</Heading2>
          <View style={styles.buttonGrid}>
            <Button
              title="Primary"
              variant="primary"
              onPress={() => Alert.alert('Primary', 'Primary button pressed')}
            />
            <Button
              title="Secondary"
              variant="secondary"
              onPress={() =>
                Alert.alert('Secondary', 'Secondary button pressed')
              }
            />
            <Button
              title="Outline"
              variant="outline"
              onPress={() => Alert.alert('Outline', 'Outline button pressed')}
            />
            <Button
              title="Ghost"
              variant="ghost"
              onPress={() => Alert.alert('Ghost', 'Ghost button pressed')}
            />
            <Button
              title="Error"
              variant="error"
              onPress={() => Alert.alert('Error', 'Error button pressed')}
            />
            <Button
              title="Disabled"
              variant="primary"
              disabled
              onPress={() => {}}
            />
          </View>
        </Card>

        {/* Form Components */}
        <Card style={styles.section}>
          <Heading2>Form Components</Heading2>
          <View style={styles.formContainer}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={inputValue}
              onChangeText={setInputValue}
            />

            <Input
              label="Email Address"
              placeholder="Enter your email"
              keyboardType="email-address"
              error="Please enter a valid email address"
            />

            <Input
              label="Success State"
              placeholder="This input shows success state"
              validationState="success"
            />

            <Input
              label="Disabled Input"
              placeholder="This input is disabled"
              editable={false}
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
              <BodyText style={styles.switchLabel}>
                Enable notifications
              </BodyText>
            </View>
          </View>
        </Card>

        {/* Interactive Components */}
        <Card variant="outlined" style={styles.section}>
          <Heading2>Interactive Components</Heading2>

          <View style={styles.interactiveGrid}>
            <Caption>Interactive elements showcase</Caption>
            <BodyText>
              This section demonstrates various interactive components with
              proper theming and accessibility.
            </BodyText>
          </View>

          <Button
            title="Interactive Demo"
            variant="outline"
            onPress={() =>
              Alert.alert('Interactive', 'Interactive component demo')
            }
            style={styles.modalButton}
          />
        </Card>

        {/* Accessibility Features */}
        <Card variant="elevated" style={styles.section}>
          <Heading2>Accessibility Features</Heading2>
          <BodyText>
            All components include proper accessibility labels, roles, and
            keyboard navigation support.
          </BodyText>

          <View style={styles.accessibilityGrid}>
            <Button
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

            <Input
              label="Screen Reader Test"
              placeholder="Try with screen reader enabled"
              accessibilityLabel="Screen reader test input field"
              accessibilityHint="This input demonstrates proper screen reader support"
            />
          </View>
        </Card>

        {/* Color Showcase */}
        <Card style={styles.section}>
          <Heading2>Color System</Heading2>
          <BodyText>
            Theme-aware color system with semantic naming and hex values
          </BodyText>

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
            <View
              style={[
                styles.colorSwatch,
                { backgroundColor: colors.purple[500] },
              ]}
            >
              <ThemedText style={styles.colorLabel}>Purple</ThemedText>
              <ThemedText style={styles.colorHex}>
                {colors.purple[500]}
              </ThemedText>
            </View>
            <View
              style={[
                styles.colorSwatch,
                { backgroundColor: colors.neutral[500] },
              ]}
            >
              <ThemedText style={styles.colorLabel}>Neutral</ThemedText>
              <ThemedText style={styles.colorHex}>
                {colors.neutral[500]}
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Spacing System */}
        <Card style={styles.section}>
          <Heading2>Spacing System</Heading2>
          <BodyText>Consistent spacing scale with pixel measurements</BodyText>

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
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, spacing: any, isDark: boolean) =>
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
      color: colors.text.primary,
    },
    subtitle: {
      textAlign: 'center',
      marginTop: spacing.sm,
      color: colors.text.secondary,
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
    interactiveGrid: {
      gap: spacing.md,
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
