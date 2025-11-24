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
   * Optional accessory displayed inline with the title
   */
  titleAccessory?: React.ReactNode;

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
  titleAccessory,
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
  const iconColor = theme.colors.text.primary;

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const headerContent = (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.background.primary,
          borderBottomColor: theme.colors.border.primary,
        },
        contentStyle,
      ]}
    >
      <View style={styles.leftSection}>
        {showBackButton && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={testID ? `${testID}-back-button` : undefined}
          >
            <Ionicons name="arrow-back" size={22} color={iconColor} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.centerSection}>
        <View style={styles.titleRow}>
          <Text
            variant="h5"
            weight="semiBold"
            style={styles.headerTitle}
            numberOfLines={1}
          >
            {title}
          </Text>
          {titleAccessory ? (
            <View style={styles.titleAccessory}>{titleAccessory}</View>
          ) : null}
        </View>
        {subtitle && (
          <Text variant="bodySmall" color="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightSection}>{rightActions}</View>
    </View>
  );

  if (useSafeArea) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: theme.colors.background.primary },
          style,
        ]}
        edges={['top']}
        testID={testID}
      >
        {headerContent}
      </SafeAreaView>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
        style,
      ]}
      testID={testID}
    >
      {headerContent}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'transparent',
  },
  container: {
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 64,
  },
  leftSection: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 4,
  },
  centerSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleAccessory: {
    marginLeft: 8,
  },
  headerTitle: {
    // Typography handled by Text component variant
  },
  rightSection: {
    minWidth: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
