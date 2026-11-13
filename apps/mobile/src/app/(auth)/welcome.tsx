import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Linking } from 'react-native';
import { AuthButton } from '@/components/auth/AuthButton';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { AuthHeroLogo } from '@/components/auth/AuthHeroLogo';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.content}>
        <View style={styles.body}>
          <AuthHeroLogo
            logoSize={109}
            title="Welcome to VineMe"
            subtitle="Connect with your church community and grow together in faith."
            titleMarginBottom={13}
            subtitleMaxWidth={272}
            subtitleLineHeight={26}
          />
        </View>

        <View style={styles.actions}>
          <AuthButton
            title="Sign up"
            onPress={() => router.push('/(auth)/phone-signup')}
            style={styles.primaryButton}
            fullWidth={false}
          />
          <AuthButton
            title="Sign in"
            variant="secondary"
            onPress={() => router.push('/(auth)/phone-login')}
            style={styles.secondaryButton}
            fullWidth={false}
          />
        </View>

        <Text style={styles.footerText}>
          By continuing, you agree to our{' '}
          <Text
            style={styles.footerLink}
            onPress={() =>
              Linking.openURL(
                'https://hexagonal-aunt-16f.notion.site/VineMe-T-Cs-40a1160f674f4e87837f70e8513b558a'
              )
            }
          >
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text
            style={styles.footerLink}
            onPress={() =>
              Linking.openURL(
                'https://hexagonal-aunt-16f.notion.site/VineMe-Privacy-Policy-1b7eccb261fd4a4fa053f8c5d09bd7ca'
              )
            }
          >
            Privacy Policy
          </Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingTop: 100,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 56,
  },
  primaryButton: {
    width: 278,
    marginBottom: 8,
  },
  secondaryButton: {
    width: 278,
    marginBottom: 0,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '400', // Regular
    color: '#999999',
    textAlign: 'center',
    letterSpacing: -0.14,
    lineHeight: 16,
    maxWidth: 278,
    includeFontPadding: false,
  },
  footerLink: {
    color: '#FF0083',
    fontWeight: '400',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
