import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ComingSoonBannerProps {
  title?: string;
  message?: string;
  onPress?: () => void;
}

export function ComingSoonBanner({
  title = 'Coming Soon!',
  message = 'This feature is coming soon. Stay tuned for updates!',
  onPress,
}: ComingSoonBannerProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      Alert.alert(
        'Coming Soon',
        'This feature is currently under development and will be available in a future update.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="construct" size={24} color="#f59e0b" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </View>
      </View>
      <View style={styles.overlay} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: '#a16207',
    lineHeight: 18,
  },
  arrowContainer: {
    marginLeft: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    pointerEvents: 'none',
  },
});