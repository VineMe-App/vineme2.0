import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isConnected, isInternetReachable, type } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-50));

  const isOffline = !isConnected || !isInternetReachable;

  useEffect(() => {
    if (isOffline) {
      // Slide down when offline
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setShowReconnected(false);
    } else {
      if (showReconnected) {
        // Show reconnected message briefly
        setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -50,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, 2000);
      } else {
        // Hide immediately if we were never offline
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [isOffline, showReconnected, slideAnim]);

  useEffect(() => {
    // Show reconnected message when coming back online
    if (!isOffline && slideAnim._value === 0) {
      setShowReconnected(true);
    }
  }, [isOffline, slideAnim._value]);

  const getMessage = () => {
    if (!isConnected) {
      return 'No internet connection';
    }
    if (!isInternetReachable) {
      return `Connected to ${type} but no internet access`;
    }
    if (showReconnected) {
      return 'Back online';
    }
    return 'No internet connection';
  };

  const getBackgroundColor = () => {
    if (showReconnected) {
      return '#48bb78'; // Green for reconnected
    }
    return '#f56565'; // Red for offline
  };

  const handleRetry = async () => {
    // Force a network check - NetInfo will automatically update our state
    try {
      const NetInfo = await import('@react-native-community/netinfo');
      await NetInfo.default.refresh();
    } catch (error) {
      console.warn('Failed to refresh network status:', error);
    }
  };

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: getBackgroundColor(),
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.text}>{getMessage()}</Text>
        {isOffline && (
          <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  retryButton: {
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  retryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
