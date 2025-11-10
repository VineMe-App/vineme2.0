import React from 'react';
import { View, Image, StyleSheet, ImageSourcePropType, ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';

const defaultLogo = require('../../../assets/figma-105-1538/47c97a3de297c8957bfbc742d3e4396bccd0d31a.png');

export interface AuthHeroProps {
  title?: string;
  subtitle?: string;
  logoSource?: ImageSourcePropType;
  containerStyle?: ViewStyle;
}

export const AuthHero: React.FC<AuthHeroProps> = ({
  title,
  subtitle,
  logoSource = defaultLogo,
  containerStyle,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Image source={logoSource} style={styles.logo} resizeMode="contain" />
      {title ? (
        <Text variant="h4" weight="black" align="center" style={styles.title}>
          {title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text
          variant="bodyLarge"
          color="secondary"
          align="center"
          style={[styles.subtitle, !title && styles.subtitleOnly]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: 32,
  },
  title: {
    color: '#2C2235',
    marginBottom: 12,
    letterSpacing: -1.5,
  },
  subtitle: {
    color: '#2C2235',
    lineHeight: 24,
    letterSpacing: -0.2,
    maxWidth: 320,
    marginTop: 4,
  },
  subtitleOnly: {
    marginTop: 16,
  },
});

export default AuthHero;

