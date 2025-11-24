import React, { useMemo } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { AuthHero } from '@/components/auth/AuthHero';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/provider/useTheme';

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.background.primary}
      />
      <View style={styles.content}>
        <View style={styles.body}>
          <AuthHero
            title="Welcome to VineMe"
            subtitle="Connect with your church community and grow together in faith."
          />
        </View>

        <View style={styles.actions}>
          <Button
            title="Sign up"
            variant="primary"
            onPress={() => router.push('/(auth)/phone-signup')}
            style={styles.primaryButton}
            fullWidth
          />
          <Button
            title="Sign in"
            variant="secondary"
            onPress={() => router.push('/(auth)/phone-login')}
            style={styles.secondaryButton}
            fullWidth
          />
        </View>

        <Text
          variant="caption"
          color="secondary"
          align="center"
          style={styles.footerText}
        >
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: 32,
      paddingVertical: 24,
      justifyContent: 'space-between',
    },
    body: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actions: {
      width: '100%',
      marginBottom: 32,
    },
    primaryButton: {
      marginBottom: 16,
    },
    secondaryButton: {
      marginBottom: 0,
    },
    footerText: {
      color: '#999',
      marginBottom: 12,
      lineHeight: 18,
    },
  });
