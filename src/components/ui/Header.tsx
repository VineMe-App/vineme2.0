import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from './Text';
import { useTheme } from '../../theme/provider/useTheme';

export interface HeaderProps {
  /**
   * Title text for the header
   */
  title: string;

  /**
   * Subtitle text (optional)
   */
  subtitle?: string;

  /**
   * Whether to show back button
   */
  showBackButton?: boolean;

  /**
   * Custom back button handler (defaults to router.back())
   */
  onBackPress?: () => void;

  /**
   * Right side actions/components
   */
  rightActions?: React.ReactNode;

  /**
   * Whether to use SafeAreaView (defaults to true)
   */
  useSafeArea?: boolean;

  /**
   * Custom styles for the container
   */
  style?: ViewStyle;

  /**
   * Custom styles for the header content
   */
  contentStyle?: ViewStyle;

  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * Standardized Header component for consistent header styling across the app
 */
export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBackButton = true,
  onBackPress,
  rightActions,
  useSafeArea = true,
  style,
  contentStyle,
  testID,
}) => {
  const router = useRouter();
  const { theme } = useTheme();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const headerContent = (
    <View style={[styles.header, contentStyle]}>
      <View style={styles.leftSection}>
        {showBackButton && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            testID={testID ? `${testID}-back-button` : undefined}
          >
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.centerSection}>
        <Text variant="h5" weight="semiBold" style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="bodySmall" color="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {rightActions && (
        <View style={styles.rightSection}>
          {rightActions}
        </View>
      )}
    </View>
  );

  if (useSafeArea) {
    return (
      <SafeAreaView style={[styles.safeArea, style]} edges={['top']} testID={testID}>
        {headerContent}
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      {headerContent}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
  },
  container: {
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  leftSection: {
    marginRight: 16,
  },
  backButton: {
    padding: 4,
  },
  centerSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerTitle: {
    // Typography handled by Text component variant
  },
  rightSection: {
    marginLeft: 16,
    alignItems: 'flex-end',
  },
});

