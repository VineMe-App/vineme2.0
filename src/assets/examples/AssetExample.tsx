/**
 * Asset Management Example
 * Demonstrates how to use the brand asset management system
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Logo } from '../../components/brand/Logo';
import { useTheme } from '../../theme/provider/useTheme';

export const AssetExample: React.FC = () => {
  const { isDark, updateAssets } = useTheme();

  const handleUpdateAssets = () => {
    // Example of updating assets dynamically
    updateAssets({
      logos: {
        custom: { uri: 'https://example.com/custom-logo.png' },
      },
      icons: {
        newIcon: { uri: 'https://example.com/new-icon.png' },
      },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Brand Asset Management Example</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Logo Variants</Text>

        <View style={styles.logoRow}>
          <View style={styles.logoContainer}>
            <Logo variant="full" size="small" />
            <Text style={styles.logoLabel}>Full (Small)</Text>
          </View>

          <View style={styles.logoContainer}>
            <Logo variant="icon" size="medium" />
            <Text style={styles.logoLabel}>Icon (Medium)</Text>
          </View>

          <View style={styles.logoContainer}>
            <Logo variant="full" size="large" />
            <Text style={styles.logoLabel}>Full (Large)</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Theme-Aware Logos</Text>

        <View style={styles.logoRow}>
          <View style={styles.logoContainer}>
            <Logo variant="full" theme="auto" size="medium" />
            <Text style={styles.logoLabel}>
              Auto ({isDark ? 'Dark' : 'Light'})
            </Text>
          </View>

          <View style={styles.logoContainer}>
            <Logo variant="full" theme="light" size="medium" />
            <Text style={styles.logoLabel}>Force Light</Text>
          </View>

          <View style={styles.logoContainer}>
            <Logo variant="full" theme="dark" size="medium" />
            <Text style={styles.logoLabel}>Force Dark</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom Sizes</Text>

        <View style={styles.logoRow}>
          <View style={styles.logoContainer}>
            <Logo size={32} />
            <Text style={styles.logoLabel}>32px</Text>
          </View>

          <View style={styles.logoContainer}>
            <Logo size={64} />
            <Text style={styles.logoLabel}>64px</Text>
          </View>

          <View style={styles.logoContainer}>
            <Logo size={128} />
            <Text style={styles.logoLabel}>128px</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Asset Management</Text>
        <Text style={styles.description}>
          The asset management system provides centralized control over brand
          assets with fallback mechanisms and theme-aware selection.
        </Text>

        <Text style={styles.features}>Features:</Text>
        <Text style={styles.feature}>• Centralized asset configuration</Text>
        <Text style={styles.feature}>
          • Multiple logo variants (full, icon, light, dark)
        </Text>
        <Text style={styles.feature}>
          • Automatic theme-based asset selection
        </Text>
        <Text style={styles.feature}>
          • Fallback mechanisms for missing assets
        </Text>
        <Text style={styles.feature}>• Dynamic asset updates</Text>
        <Text style={styles.feature}>• TypeScript type safety</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    padding: 10,
  },
  logoLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  features: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  feature: {
    fontSize: 14,
    color: '#444',
    marginBottom: 5,
    paddingLeft: 10,
  },
});

export default AssetExample;
