/**
 * Example: Basic Component Migration
 *
 * This example shows how to migrate a simple component from legacy styles
 * to the new theme system using the migration utilities.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ComponentMigrator } from '../ComponentMigrator';
import {
  ThemeCompatibilityLayer,
  useLegacyStyles,
} from '../ThemeCompatibilityLayer';
import { useTheme } from '../../../theme/provider/useTheme';
import type { Theme } from '../../../theme/themes/types';

// ============================================================================
// BEFORE MIGRATION: Legacy Component
// ============================================================================

interface LegacyButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

function LegacyButton({ title, onPress, disabled }: LegacyButtonProps) {
  return (
    <TouchableOpacity
      style={[legacyStyles.button, disabled && legacyStyles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          legacyStyles.buttonText,
          disabled && legacyStyles.buttonTextDisabled,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const legacyStyles = StyleSheet.create({
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#ffffff',
  },
});

// ============================================================================
// AFTER MIGRATION: Theme-Aware Component
// ============================================================================

interface ThemeAwareButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

function ThemeAwareButton({ title, onPress, disabled }: ThemeAwareButtonProps) {
  const theme = useTheme();
  const styles = createThemeAwareStyles(theme);

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const createThemeAwareStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      backgroundColor: theme.colors.primary[600],
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    buttonDisabled: {
      backgroundColor: theme.colors.neutral[400],
      opacity: 0.6,
    },
    buttonText: {
      color: theme.colors.text.inverse,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semiBold,
    },
    buttonTextDisabled: {
      color: theme.colors.text.inverse,
    },
  });

// ============================================================================
// MIGRATION WITH COMPATIBILITY LAYER
// ============================================================================

interface CompatibleButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

function CompatibleButton({ title, onPress, disabled }: CompatibleButtonProps) {
  // Use compatibility layer to support both legacy and theme-aware styles
  const legacyButtonStyles = {
    button: {
      backgroundColor: '#007bff',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 44,
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600' as const,
    },
  };

  const themeAwareButtonStyles = (theme: Theme) => ({
    button: {
      backgroundColor: theme.colors.primary[600],
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 44,
    },
    buttonText: {
      color: theme.colors.text.inverse,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semiBold,
    },
  });

  const styles = useLegacyStyles(legacyButtonStyles, themeAwareButtonStyles);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// AUTOMATED MIGRATION EXAMPLE
// ============================================================================

export async function runBasicMigrationExample() {
  const migrator = new ComponentMigrator();

  // Sample component code (as string)
  const sampleComponentCode = `
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function SampleCard({ title, content }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.content}>{content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  content: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
  `;

  try {
    // Mock the file reading for this example
    const originalReadFile = (migrator as any).readFile;
    (migrator as any).readFile = jest
      .fn()
      .mockResolvedValue(sampleComponentCode);

    const result = await migrator.migrateComponent('SampleCard.tsx', {
      preserveOriginalStyles: true,
      addCompatibilityLayer: true,
      generateTypes: true,
    });

    console.log('Migration Result:');
    console.log('Success:', result.success);
    console.log('Warnings:', result.warnings);
    console.log('Errors:', result.errors);
    console.log('\nMigrated Code:');
    console.log(result.migratedCode);

    // Restore original method
    (migrator as any).readFile = originalReadFile;

    return result;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// ============================================================================
// GRADUAL MIGRATION EXAMPLE
// ============================================================================

interface GradualMigrationCardProps {
  title: string;
  content: string;
}

function GradualMigrationCard({ title, content }: GradualMigrationCardProps) {
  const theme = useTheme();

  // Legacy styles for parts not yet migrated
  const legacyStyles = {
    container: {
      backgroundColor: '#fff',
      padding: 16,
      borderRadius: 8,
      marginVertical: 8,
    },
    content: {
      fontSize: 14,
      color: '#666',
      lineHeight: 20,
    },
  };

  // Theme-aware styles for migrated parts
  const themeAwareStyles = {
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
  };

  // Use compatibility layer to merge both approaches
  const compatibleStylesFactory =
    ThemeCompatibilityLayer.createCompatibleStyles(legacyStyles, (theme) => ({
      container: {
        backgroundColor: theme.colors.background.primary,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        marginVertical: theme.spacing.sm,
        // Add theme-aware shadow
        shadowColor: theme.colors.neutral[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    }));

  const styles = StyleSheet.create({
    ...compatibleStylesFactory(theme),
    ...themeAwareStyles,
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.content}>{content}</Text>
    </View>
  );
}

// ============================================================================
// EXAMPLE USAGE COMPONENT
// ============================================================================

export function BasicMigrationExample() {
  const handlePress = () => {
    console.log('Button pressed!');
  };

  return (
    <View style={{ padding: 16, gap: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
        Migration Examples
      </Text>

      <View>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Legacy Button:
        </Text>
        <LegacyButton title="Legacy Style" onPress={handlePress} />
      </View>

      <View>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Theme-Aware Button:
        </Text>
        <ThemeAwareButton title="Theme Style" onPress={handlePress} />
      </View>

      <View>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Compatible Button:
        </Text>
        <CompatibleButton title="Compatible Style" onPress={handlePress} />
      </View>

      <View>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Gradual Migration Card:
        </Text>
        <GradualMigrationCard
          title="Sample Card"
          content="This card demonstrates gradual migration where some styles use the theme system while others remain legacy."
        />
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: '#28a745',
          padding: 12,
          borderRadius: 6,
          alignItems: 'center',
        }}
        onPress={runBasicMigrationExample}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>
          Run Automated Migration Example
        </Text>
      </TouchableOpacity>
    </View>
  );
}
