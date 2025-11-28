import React from 'react';
import { View, Image, StyleSheet, ImageSourcePropType, ViewStyle, TextStyle } from 'react-native';
import { Text } from '@/components/ui/Text';

const defaultLogo = require('../../../assets/figma-105-1538/47c97a3de297c8957bfbc742d3e4396bccd0d31a.png');

export interface AuthHeroLogoProps {
  title?: string;
  subtitle?: string;
  logoSource?: ImageSourcePropType;
  logoSize?: number; // 108 or 109
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  titleMarginBottom?: number; // 13 or 15
  subtitleMaxWidth?: number; // 272, 313, or 326
  subtitleFontSize?: number; // 16 or 18
  subtitleLineHeight?: number; // 26 or 28
  subtitleLetterSpacing?: number; // -0.32 or -0.36
  showLogo?: boolean; // Default true
}

export const AuthHeroLogo: React.FC<AuthHeroLogoProps> = ({
  title,
  subtitle,
  logoSource = defaultLogo,
  logoSize = 108,
  containerStyle,
  titleStyle,
  subtitleStyle,
  titleMarginBottom = 15,
  subtitleMaxWidth,
  subtitleFontSize,
  subtitleLineHeight,
  subtitleLetterSpacing,
  showLogo = true,
}) => {
  // Determine subtitle styling based on fontSize prop or defaults
  const getSubtitleStyles = () => {
    const baseStyles: TextStyle = {
      fontSize: subtitleFontSize || 16,
      fontWeight: '400',
      color: '#2C2235',
      textAlign: 'center',
      letterSpacing: subtitleLetterSpacing || -0.32,
      lineHeight: subtitleLineHeight || 28,
    };

    if (subtitleMaxWidth) {
      baseStyles.maxWidth = subtitleMaxWidth;
    }

    return [baseStyles, subtitleStyle];
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {showLogo && (
        <Image
          source={logoSource}
          style={[styles.logo, { width: logoSize, height: logoSize }]}
          resizeMode="contain"
        />
      )}
      {title && (
        <Text
          style={[
            styles.title,
            { marginBottom: titleMarginBottom },
            titleStyle,
          ]}
        >
          {title}
        </Text>
      )}
      {subtitle && (
        <Text style={getSubtitleStyles()}>{subtitle}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: '800', // ExtraBold
    color: '#2C2235',
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 40,
  },
});

export default AuthHeroLogo;

