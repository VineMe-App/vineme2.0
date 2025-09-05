import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../provider/useTheme';

/**
 * Font Example Component
 * Demonstrates the Manrope font family across different weights and sizes
 */
export function FontExample() {
  const { theme } = useTheme();

  const fontWeights = [
    { key: 'regular', label: 'Regular (400)', fontFamily: theme.typography.fontFamily.regular },
    { key: 'medium', label: 'Medium (500)', fontFamily: theme.typography.fontFamily.medium },
    { key: 'semiBold', label: 'SemiBold (600)', fontFamily: theme.typography.fontFamily.semiBold },
    { key: 'bold', label: 'Bold (700)', fontFamily: theme.typography.fontFamily.bold },
  ];

  const fontSizes = [
    { key: 'xs', label: 'Extra Small (12px)', size: theme.typography.fontSize.xs },
    { key: 'sm', label: 'Small (14px)', size: theme.typography.fontSize.sm },
    { key: 'base', label: 'Base (16px)', size: theme.typography.fontSize.base },
    { key: 'lg', label: 'Large (18px)', size: theme.typography.fontSize.lg },
    { key: 'xl', label: 'Extra Large (20px)', size: theme.typography.fontSize.xl },
    { key: '2xl', label: '2XL (24px)', size: theme.typography.fontSize['2xl'] },
    { key: '3xl', label: '3XL (30px)', size: theme.typography.fontSize['3xl'] },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manrope Font Family</Text>
        <Text style={styles.description}>
          This example demonstrates the Manrope font family across different weights and sizes.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Font Weights</Text>
        {fontWeights.map((weight) => (
          <View key={weight.key} style={styles.fontExample}>
            <Text style={styles.fontLabel}>{weight.label}</Text>
            <Text style={[styles.fontText, { fontFamily: weight.fontFamily }]}>
              The quick brown fox jumps over the lazy dog
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Font Sizes</Text>
        {fontSizes.map((size) => (
          <View key={size.key} style={styles.fontExample}>
            <Text style={styles.fontLabel}>{size.label}</Text>
            <Text style={[styles.fontText, { fontSize: size.size }]}>
              The quick brown fox jumps over the lazy dog
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Typography Variants</Text>
        
        <View style={styles.fontExample}>
          <Text style={styles.fontLabel}>Display 1</Text>
          <Text style={[styles.fontText, { fontFamily: theme.typography.fontFamily.bold, fontSize: 48 }]}>
            Display Heading
          </Text>
        </View>

        <View style={styles.fontExample}>
          <Text style={styles.fontLabel}>Heading 1</Text>
          <Text style={[styles.fontText, { fontFamily: theme.typography.fontFamily.bold, fontSize: 36 }]}>
            Main Heading
          </Text>
        </View>

        <View style={styles.fontExample}>
          <Text style={styles.fontLabel}>Heading 2</Text>
          <Text style={[styles.fontText, { fontFamily: theme.typography.fontFamily.semiBold, fontSize: 30 }]}>
            Section Heading
          </Text>
        </View>

        <View style={styles.fontExample}>
          <Text style={styles.fontLabel}>Body Text</Text>
          <Text style={[styles.fontText, { fontFamily: theme.typography.fontFamily.regular, fontSize: 16 }]}>
            This is body text using the Manrope font family. It provides excellent readability and a modern appearance.
          </Text>
        </View>

        <View style={styles.fontExample}>
          <Text style={styles.fontLabel}>Button Text</Text>
          <Text style={[styles.fontText, { fontFamily: theme.typography.fontFamily.semiBold, fontSize: 16 }]}>
            Button Text
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    fontFamily: 'Manrope-Bold',
  },
  description: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    marginBottom: 16,
    fontFamily: 'Manrope-Regular',
  },
  fontExample: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  fontLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    fontFamily: 'Manrope-Medium',
  },
  fontText: {
    color: '#1a1a1a',
    lineHeight: 24,
    fontFamily: 'Manrope-Regular',
  },
});
