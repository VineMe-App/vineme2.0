import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useTheme } from '../../theme/provider/useTheme';

export function OfflineBanner() {
  const { isConnected, isInternetReachable, type } = useNetworkStatus();
  const { theme } = useTheme();
  const [showReconnected, setShowReconnected] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-50));
  const [isRendered, setIsRendered] = useState(() =>
    !isConnected || !isInternetReachable
  );
  const hasBeenOfflineRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOffline = !isConnected || !isInternetReachable;
  const shouldShowBanner = useMemo(
    () => isOffline || showReconnected,
    [isOffline, showReconnected]
  );

  useEffect(() => {
    if (shouldShowBanner) {
      setIsRendered(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -60,
        duration: 250,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIsRendered(false);
        }
      });
    }
  }, [shouldShowBanner, slideAnim]);

  useEffect(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (isOffline) {
      hasBeenOfflineRef.current = true;
      setShowReconnected(false);
      return;
    }

    if (hasBeenOfflineRef.current) {
      setShowReconnected(true);
      reconnectTimerRef.current = setTimeout(() => {
        setShowReconnected(false);
        hasBeenOfflineRef.current = false;
      }, 2000);
    }

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [isOffline]);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

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
      return theme.name === 'dark'
        ? 'rgba(255, 0, 131, 0.3)' // Primary pink for reconnected (dark theme)
        : 'rgba(255, 0, 131, 0.3)'; // Primary pink for reconnected (light theme)
    }
    return theme.name === 'dark'
      ? 'rgba(245, 101, 101, 0.3)' // Red for offline (dark theme)
      : 'rgba(245, 101, 101, 0.3)'; // Red for offline (light theme)
  };

  const handleRetry = async () => {
    // Force a network check - NetInfo will automatically update our state
    try {
      await NetInfo.refresh();
    } catch (error) {
      console.warn('Failed to refresh network status:', error);
    }
  };

  if (!isRendered) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [{ translateY: slideAnim }],
          elevation: Platform.OS === 'android' ? 8 : 0,
          shadowColor: theme.name === 'dark' ? '#000000' : '#000000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: theme.name === 'dark' ? 0.3 : 0.1,
          shadowRadius: 4,
        },
      ]}
    >
      <BlurView
        intensity={Platform.OS === 'ios' ? 80 : 100}
        tint={theme.name === 'dark' ? 'dark' : 'light'}
        experimentalBlurMethod={
          Platform.OS === 'android' ? 'dimezisBlurView' : undefined
        }
        style={[
          styles.blurContainer,
          {
            backgroundColor: getBackgroundColor(),
          },
        ]}
      >
        <View style={styles.content}>
          <Text style={[styles.text, { color: theme.colors.text.primary }]}>
            {getMessage()}
          </Text>
          {isOffline && (
            <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
              <Text
                style={[styles.retryText, { color: theme.colors.text.primary }]}
              >
                Retry
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  blurContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
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
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
