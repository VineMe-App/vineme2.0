import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { AuthHero } from '@/components/auth/AuthHero';
import { AuthButton } from '@/components/auth/AuthButton';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.content}>
        <View style={styles.body}>
          <AuthHero
            title="Welcome to VineMe"
            subtitle="Connect with your church community and grow together in faith."
          />
        </View>

        <View style={styles.actions}>
          <AuthButton
            title="Sign up"
            onPress={() => router.push('/(auth)/phone-signup')}
            style={styles.primaryButton}
          />
          <AuthButton
            title="Sign in"
            variant="secondary"
            onPress={() => router.push('/(auth)/phone-login')}
            style={styles.secondaryButton}
          />
        </View>

        <Text variant="caption" color="secondary" align="center" style={styles.footerText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
