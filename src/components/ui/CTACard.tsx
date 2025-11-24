import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { Text } from './Text';
import { useTheme } from '../../theme/provider/useTheme';

export interface CTACardProps {
  /**
   * Title text for the CTA card
   */
  title: string;

  /**
   * Description/subtitle text for the CTA card
   */
  description?: string;

  /**
   * Icon to display on the left side
   */
  icon?: React.ReactNode;

  /**
   * Icon name from Ionicons (alternative to icon prop)
   */
  iconName?: keyof typeof Ionicons.glyphMap;

  /**
   * Icon color (defaults to theme primary color)
   */
  iconColor?: string;

  /**
   * Icon size (defaults to 24)
   */
  iconSize?: number;

  /**
   * Visual variant of the CTA card
   */
  variant?: 'default' | 'filled' | 'outlined';

  /**
   * Function to call when card is pressed
   */
  onPress: () => void;

  /**
   * Whether to show chevron icon on the right
   */
  showChevron?: boolean;

  /**
   * Custom styles for the container
   */
  style?: ViewStyle;

  /**
   * Custom styles for the content
   */
  contentStyle?: ViewStyle;

  /**
   * Test ID for testing
   */
  testID?: string;

  /**
   * Accessibility label
   */
  accessibilityLabel?: string;
}

/**
 * Standardized CTA Card component for consistent call-to-action styling across the app
 */
export const CTACard: React.FC<CTACardProps> = ({
  title,
  description,
  icon,
  iconName,
  iconColor,
  iconSize = 24,
  variant = 'default',
  onPress,
  showChevron = true,
  style,
  contentStyle,
  testID,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();

  // Determine card variant
  const cardVariant = variant === 'filled' ? 'filled' : variant === 'outlined' ? 'outlined' : 'default';

  // Default icon color based on variant
  const defaultIconColor = iconColor || theme.colors.primary[500];
  const chevronColor = variant === 'default' ? theme.colors.text.primary : '#6b7280';

  // Render icon
  const renderIcon = () => {
    if (icon) {
      return (
        <View style={styles.iconContainer}>
          {icon}
        </View>
      );
    }
    if (iconName) {
      return (
        <View style={[
          styles.iconContainer,
          variant === 'default' && styles.iconContainerDefault,
        ]}>
          <Ionicons
            name={iconName}
            size={iconSize}
            color={defaultIconColor}
          />
        </View>
      );
    }
    return null;
  };

  // Get card-specific styles based on variant
  const getCardStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      borderRadius: 12,
      minHeight: 96,
    };

    if (variant === 'default') {
      return {
        ...baseStyles,
        ...styles.defaultCard,
      };
    }

    // For outlined and filled variants, apply padding
    return {
      ...baseStyles,
      paddingHorizontal: 20,
      paddingVertical: 20,
    };
  };

  return (
    <Card
      variant={cardVariant}
      interactive={true}
      onPress={onPress}
      padding={undefined}
      style={[
        getCardStyles(),
        style,
      ]}
      testID={testID}
      accessibilityLabel={accessibilityLabel || title}
    >
      <View style={[styles.content, contentStyle]}>
        {renderIcon()}
        <View style={styles.textContainer}>
          <Text
            variant="body"
            weight="bold"
            style={variant === 'default' ? styles.titleDefault : undefined}
          >
            {title}
          </Text>
          {description && (
            <Text
              variant="body"
              weight="normal"
              color={variant === 'default' ? 'primary' : 'secondary'}
              style={variant === 'default' ? styles.descriptionDefault : undefined}
            >
              {description}
            </Text>
          )}
        </View>
        {showChevron && (
          <View style={styles.chevronContainer}>
            <Ionicons
              name="chevron-forward-outline"
              size={20}
              color={chevronColor}
            />
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  defaultCard: {
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 24,
    minHeight: 96,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerDefault: {
    backgroundColor: 'transparent',
    width: 'auto',
    height: 'auto',
    marginRight: 0,
  },
  textContainer: {
    flex: 1,
  },
  titleDefault: {
    color: '#2C2235',
    fontSize: 16,
    letterSpacing: -0.48,
    fontWeight: '700',
  },
  descriptionDefault: {
    color: '#2C2235',
    fontSize: 16,
    letterSpacing: -0.48,
    lineHeight: 20,
  },
  chevronContainer: {
    marginLeft: 8,
  },
});
