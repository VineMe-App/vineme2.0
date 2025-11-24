import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authService } from '../../services/auth';
import { useAuthStore } from '../../stores/auth';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Text';
import { Ionicons } from '@expo/vector-icons';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { initialize } = useAuthStore();

  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);

  useEffect(() => {
    handleEmailVerification();
  }, []);

  const handleEmailVerification = async () => {
    try {
      // Extract tokens from URL parameters
      const accessToken = params.access_token as string;
      const refreshToken = params.refresh_token as string;

      if (!accessToken || !refreshToken) {
        setVerificationResult({
          success: false,
          error: 'Invalid verification link. Missing authentication tokens.',
        });
        setIsVerifying(false);
        return;
      }

      // Handle the email verification
      const result = await authService.handleEmailVerification(
        accessToken,
        refreshToken
      );

      setVerificationResult(result);

      if (result.success) {
        // Reinitialize auth state to reflect the verified user
        await initialize();

        // Show success message briefly before redirecting
        setTimeout(() => {
          router.replace('/(auth)/onboarding');
        }, 2000);
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setVerificationResult({
        success: false,
        error: 'An unexpected error occurred during verification.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      const result = await authService.resendVerificationEmail();

      if (result.success) {
        Alert.alert(
          'Email Sent',
          'A new verification email has been sent. Please check your inbox.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          result.error || 'Failed to resend verification email.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to resend verification email. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleReturnToSignIn = () => {
    router.replace('/(auth)/sign-in');
  };

  if (isVerifying) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <View style={styles.content}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.title}>Verifying Your Email</Text>
            <Text style={styles.message}>
              Please wait while we verify your email address...
            </Text>
          </View>
        </Card>
      </View>
    );
  }

  if (verificationResult?.success) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#ff0083" />
            </View>
            <Text style={styles.title}>Email Verified!</Text>
            <Text style={styles.message}>
              Your email has been successfully verified. You'll be redirected to
              complete your profile setup.
            </Text>
          </View>
        </Card>
      </View>
    );
  }

  // Verification failed
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={64} color="#FF3B30" />
          </View>
          <Text style={styles.title}>Verification Failed</Text>
          <Text style={styles.message}>
            {verificationResult?.error ||
              'Unable to verify your email address.'}
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              title="Resend Verification Email"
              onPress={handleResendEmail}
              style={styles.button}
            />
            <Button
              title="Return to Sign In"
              onPress={handleReturnToSignIn}
              variant="outline"
              style={styles.button}
            />
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  },
});
