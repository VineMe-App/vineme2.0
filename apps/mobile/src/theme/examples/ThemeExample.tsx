/**
 * Theme Example Component
 * Demonstrates the usage of the theme provider and context system
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../provider';

export const ThemeExample: React.FC = () => {
  const {
    theme,
    colors,
    spacing,
    typography,
    isDark,
    themeMode,
    toggleTheme,
    setThemeMode,
  } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: spacing[4],
      backgroundColor: colors.background.primary,
    },
    header: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.text.primary,
      marginBottom: spacing[6],
      textAlign: 'center',
    },
    section: {
      marginBottom: spacing[6],
      padding: spacing[4],
      backgroundColor: colors.surface.secondary,
      borderRadius: theme.borderRadius.md,
    },
    sectionTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      marginBottom: spacing[3],
    },
    infoText: {
      fontSize: typography.fontSize.base,
      color: colors.text.secondary,
      marginBottom: spacing[2],
    },
    buttonContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
    },
    button: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      backgroundColor: colors.primary[500],
      borderRadius: theme.borderRadius.md,
      marginRight: spacing[2],
      marginBottom: spacing[2],
    },
    buttonText: {
      color: colors.primary[50],
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
    },
    colorPalette: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
    },
    colorSwatch: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.sm,
      marginRight: spacing[2],
      marginBottom: spacing[2],
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Theme System Example</Text>

      {/* Theme Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Theme</Text>
        <Text style={styles.infoText}>Theme: {theme.name}</Text>
        <Text style={styles.infoText}>Mode: {themeMode}</Text>
        <Text style={styles.infoText}>Is Dark: {isDark ? 'Yes' : 'No'}</Text>
      </View>

      {/* Theme Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Theme Controls</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleTheme}>
            <Text style={styles.buttonText}>Toggle Theme</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setThemeMode('light')}
          >
            <Text style={styles.buttonText}>Light</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setThemeMode('dark')}
          >
            <Text style={styles.buttonText}>Dark</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setThemeMode('system')}
          >
            <Text style={styles.buttonText}>System</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Color Palette */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Primary Color Palette</Text>
        <View style={styles.colorPalette}>
          {Object.entries(colors.primary).map(([shade, color]) => (
            <View
              key={shade}
              style={[styles.colorSwatch, { backgroundColor: color }]}
            />
          ))}
        </View>
      </View>

      {/* Typography Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Typography Scale</Text>
        <Text style={[styles.infoText, { fontSize: typography.fontSize.xs }]}>
          Extra Small Text (xs)
        </Text>
        <Text style={[styles.infoText, { fontSize: typography.fontSize.sm }]}>
          Small Text (sm)
        </Text>
        <Text style={[styles.infoText, { fontSize: typography.fontSize.base }]}>
          Base Text (base)
        </Text>
        <Text style={[styles.infoText, { fontSize: typography.fontSize.lg }]}>
          Large Text (lg)
        </Text>
        <Text style={[styles.infoText, { fontSize: typography.fontSize.xl }]}>
          Extra Large Text (xl)
        </Text>
      </View>

      {/* Spacing Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Spacing System</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: spacing[2],
              height: 20,
              backgroundColor: colors.primary[300],
              marginRight: spacing[2],
            }}
          />
          <Text style={styles.infoText}>Spacing 2 ({spacing[2]}px)</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: spacing[4],
              height: 20,
              backgroundColor: colors.primary[400],
              marginRight: spacing[2],
            }}
          />
          <Text style={styles.infoText}>Spacing 4 ({spacing[4]}px)</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: spacing[8],
              height: 20,
              backgroundColor: colors.primary[500],
              marginRight: spacing[2],
            }}
          />
          <Text style={styles.infoText}>Spacing 8 ({spacing[8]}px)</Text>
        </View>
      </View>
    </View>
  );
};
