/**
 * Logo Component
 * Displays brand logo with variant support and theme awareness
 */

import React from 'react';
import { Image, ImageStyle, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../../theme/provider/useTheme';
import { assetManager, LogoVariant } from '../../../assets';

export interface LogoProps {
  /**
   * Logo variant to display
   */
  variant?: keyof LogoVariant;
  /**
   * Theme variant for logo selection
   */
  theme?: 'light' | 'dark' | 'auto';
  /**
   * Size of the logo
   */
  size?: number | 'small' | 'medium' | 'large';
  /**
   * Custom style for the logo image
   */
  style?: ImageStyle;
  /**
   * Custom style for the container
   */
  containerStyle?: ViewStyle;
  /**
   * Accessibility label
   */
  accessibilityLabel?: string;
  /**
   * Test ID for testing
   */
  testID?: string;
  /**
   * Resize mode for the image
   */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

const LOGO_SIZES = {
  small: 24,
  medium: 48,
  large: 96,
} as const;

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  theme = 'auto',
  size = 'medium',
  style,
  containerStyle,
  accessibilityLabel = 'VineMe Logo',
  testID = 'logo',
  resizeMode = 'contain',
}) => {
  const { isDark } = useTheme();

  // Determine the actual variant to use based on theme
  const getLogoVariant = (): keyof LogoVariant => {
    if (theme === 'auto') {
      // Auto-select based on current theme
      if (variant === 'full' || variant === 'icon') {
        return isDark ? 'dark' : 'light';
      }
      return variant;
    }

    if (theme === 'light') {
      return variant === 'full'
        ? 'light'
        : variant === 'icon'
          ? 'light'
          : variant;
    }

    if (theme === 'dark') {
      return variant === 'full'
        ? 'dark'
        : variant === 'icon'
          ? 'dark'
          : variant;
    }

    return variant;
  };

  // Get the logo size
  const getLogoSize = (): number => {
    if (typeof size === 'number') {
      return size;
    }
    return LOGO_SIZES[size];
  };

  const logoVariant = getLogoVariant();
  const logoSize = getLogoSize();

  let logoSource;
  try {
    logoSource = assetManager.getLogo(logoVariant);
  } catch (error) {
    console.warn('Failed to load logo asset:', error);
    // Use a fallback or default source
    logoSource = { uri: 'fallback-logo.png' };
  }

  const logoStyle: ImageStyle = [
    styles.logo,
    {
      width: logoSize,
      height: logoSize,
    },
    style,
  ].filter(Boolean) as ImageStyle;

  return (
    <View
      style={[styles.container, containerStyle]}
      testID={`${testID}-container`}
    >
      <Image
        source={logoSource}
        style={logoStyle}
        resizeMode={resizeMode}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
        testID={testID}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    // Base logo styles
  },
});

export default Logo;
