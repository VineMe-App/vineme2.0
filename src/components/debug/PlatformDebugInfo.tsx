import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { getPlatformInfo, testPlatformFeatures, logPlatformInfo } from '../../utils/platformTesting';

export const PlatformDebugInfo: React.FC = () => {
  const platformInfo = getPlatformInfo();
  const { supportedFeatures } = testPlatformFeatures();

  const handleLogInfo = () => {
    logPlatformInfo();
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Platform:</Text>
          <Text style={styles.value}>{platformInfo.platform}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Device Type:</Text>
          <Text style={styles.value}>{platformInfo.deviceType}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Screen Size:</Text>
          <Text style={styles.value}>{platformInfo.screenSize}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>OS Version:</Text>
          <Text style={styles.value}>{platformInfo.osVersion}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Model:</Text>
          <Text style={styles.value}>{platformInfo.modelName || 'Unknown'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Is Device:</Text>
          <Text style={[styles.value, platformInfo.isDevice ? styles.success : styles.warning]}>
            {platformInfo.isDevice ? 'Yes' : 'No (Simulator)'}
          </Text>
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Support</Text>
        {Object.entries(supportedFeatures).map(([feature, supported]) => (
          <View key={feature} style={styles.infoRow}>
            <Text style={styles.label}>{feature}:</Text>
            <Text style={[styles.value, supported ? styles.success : styles.error]}>
              {supported ? '✅ Supported' : '❌ Not Supported'}
            </Text>
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Debug Actions</Text>
        <Button
          title="Log Platform Info to Console"
          onPress={handleLogInfo}
          variant="secondary"
        />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  section: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  success: {
    color: '#28a745',
  },
  warning: {
    color: '#ffc107',
  },
  error: {
    color: '#dc3545',
  },
});