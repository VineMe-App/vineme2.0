import React from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity,
  SafeAreaView,
  Image
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useRouter, Link } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="h1" weight="bold" style={styles.title}>Welcome to VineMe</Text>
          <Text variant="bodyLarge" color="secondary" style={styles.subtitle}>
            Connect with your church community and grow together in faith
          </Text>
        </View>

        <View style={styles.actions}>
          <Button 
            title="Sign up with Phone" 
            onPress={() => router.push('/(auth)/phone-signup')}
            style={styles.primaryButton}
          />
          
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text variant="body" color="secondary" style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button 
            title="Sign in with Phone" 
            onPress={() => router.push('/(auth)/phone-login')}
            variant="secondary"
            style={styles.secondaryButton}
          />

          <Button 
            title="Sign in with Email" 
            onPress={() => router.push('/(auth)/email-login')}
            variant="secondary"
            style={styles.secondaryButton}
          />
        </View>

        <View style={styles.footer}>
          <Text variant="caption" color="secondary" style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
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
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 16,
  },
  actions: {
    width: '100%',
  },
  primaryButton: {
    marginBottom: 16,
  },
  secondaryButton: {
    marginBottom: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e5e5',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 16,
    color: '#666',
  },
  footer: {
    paddingTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});