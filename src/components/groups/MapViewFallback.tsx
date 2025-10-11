/**
 * Fallback component shown when MapView is not available (e.g., in Expo Go)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MapViewFallbackProps {
  message?: string;
  height?: number;
}

export const MapViewFallback: React.FC<MapViewFallbackProps> = ({
  message = 'Map view is not available in Expo Go. Please use a development build to see the map.',
  height = 300,
}) => {
  return (
    <View style={[styles.container, { height }]}>
      <Ionicons name="map-outline" size={48} color="#ccc" />
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.hint}>
        Run with a development build to enable maps
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 20,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
