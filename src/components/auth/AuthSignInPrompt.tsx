import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Link } from 'expo-router';
import { Text } from '@/components/ui/Text';

export interface AuthSignInPromptProps {
  message?: string;
  linkLabel?: string;
  href?: string;
  style?: ViewStyle;
}

export const AuthSignInPrompt: React.FC<AuthSignInPromptProps> = ({
  message = 'Already have an account?',
  linkLabel = 'Sign in',
  href = '/(auth)/phone-login',
  style,
}) => (
  <View style={[styles.container, style]}>
    <Text variant="body" color="secondary">
      {message + ' '}
    </Text>
    <Link href={href} asChild>
      <Text variant="body" weight="semiBold" style={styles.link} accessibilityRole="link">
        {linkLabel}
      </Text>
    </Link>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  link: {
    color: '#1082FF',
  },
});

export default AuthSignInPrompt;

