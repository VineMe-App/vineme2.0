/**
 * Simple badge that shows whether the app is running in Expo Go or Dev Client mode
 * Useful for debugging and development
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { isExpoGo, hasNativeFeatures } from '../../utils/expoGoDetection';

interface ExpoModeBadgeProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showOnlyInDev?: boolean;
}

export const ExpoModeBadge: React.FC<ExpoModeBadgeProps> = ({
  position = 'top-right',
  showOnlyInDev = true,
}) => {
  const inExpoGo = isExpoGo();
  const nativeFeatures = hasNativeFeatures();

  // Only show in development mode if requested
  if (showOnlyInDev && !__DEV__) {
    return null;
  }

  const positionStyles = {
    'top-left': { top: 50, left: 10 },
    'top-right': { top: 50, right: 10 },
    'bottom-left': { bottom: 50, left: 10 },
    'bottom-right': { bottom: 50, right: 10 },
  };

  return (
    <View
      style={[
        styles.badge,
        positionStyles[position],
        inExpoGo ? styles.badgeExpoGo : styles.badgeDevClient,
      ]}
    >
      <Text style={styles.modeText}>
        {inExpoGo ? '📱 Expo Go' : '🚀 Dev Client'}
      </Text>
      <Text style={styles.featureText}>Maps: {nativeFeatures ? '✓' : '✗'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
  },
  badgeExpoGo: {
    backgroundColor: '#4630EB', // Expo blue
  },
  badgeDevClient: {
    backgroundColor: '#00B383', // Green for dev client
  },
  modeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureText: {
    color: '#fff',
    fontSize: 9,
    opacity: 0.9,
  },
});
