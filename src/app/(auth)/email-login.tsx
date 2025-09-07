import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TextInput, 
  Alert, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useRouter, Link } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { Ionicons } from '@expo/vector-icons';
import { OtpInput } from '@/components/ui/OtpInput';

export default function EmailLoginScreen() {
  const router = useRouter();
  const { signInWithEmail, verifyOtp, isLoading } = useAuthStore();
  
  const [step, setStep] = useState<'enter-email' | 'verify-options'>('enter-email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const handleSendVerification = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    const result = await signInWithEmail(email.trim());
    
    if (result.success) {
      setStep('verify-options');
    } else if (result.userNotFound) {
      Alert.alert('Email Not Found', result.error);
    } else {
      Alert.alert('Error', result.error || 'Failed to send verification');
    }
  };

  const handleVerifyCode = async () => {
    const result = await verifyOtp(email, code, 'email');
    
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Verification Failed', result.error || 'Invalid code');
    }
  };

  const handleResendVerification = async () => {
    const result = await signInWithEmail(email);
    if (result.success) {
      Alert.alert('Verification Sent', 'A new verification has been sent to your email.');
    } else {
      Alert.alert('Error', result.error || 'Failed to resend verification');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="h2" weight="bold" style={styles.title}>Sign in with Email</Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            {step === 'enter-email' 
              ? 'Enter your email address to receive verification'
              : 'Choose how to verify your email'
            }
          </Text>
        </View>

        <View style={styles.form}>
          {step === 'enter-email' ? (
            <>
              <Text variant="label" style={styles.label}>Email Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                placeholder="Enter your email"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <Button 
                title="Send Verification" 
                onPress={handleSendVerification} 
                loading={isLoading}
                style={styles.button}
              />
            </>
          ) : (
            <>
              <View style={styles.verificationContainer}>
                <Text variant="h3" weight="bold" style={styles.verificationTitle}>Verification Sent!</Text>
                <Text variant="body" color="secondary" style={styles.verificationMessage}>
                  We've sent verification to{'\n'}
                  <Text variant="body" weight="semiBold" color="primary" style={styles.emailAddress}>{email}</Text>
                </Text>
              </View>

              {/* Magic Link Option */}
              <View style={styles.optionContainer}>
                <View style={styles.optionHeader}>
                  <Ionicons name="mail" size={24} color="#007AFF" />
                  <Text variant="bodyLarge" weight="semiBold" style={styles.optionTitle}>Option 1: Magic Link</Text>
                </View>
                <Text variant="body" color="secondary" style={styles.optionDescription}>
                  Click the link in your email to sign in automatically
                </Text>
              </View>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text variant="body" color="secondary" style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* OTP Option */}
              <View style={styles.optionContainer}>
                <View style={styles.optionHeader}>
                  <Ionicons name="keypad" size={24} color="#007AFF" />
                  <Text variant="bodyLarge" weight="semiBold" style={styles.optionTitle}>Option 2: Enter Code</Text>
                </View>
                <Text variant="body" color="secondary" style={styles.optionDescription}>
                  Enter the 6-digit code from your email
                </Text>
                <OtpInput 
                  value={code} 
                  onChange={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))} 
                  length={6} 
                />
                <Button 
                  title="Verify Code" 
                  onPress={handleVerifyCode} 
                  loading={isLoading}
                  style={styles.verifyButton}
                />
              </View>

              <View style={styles.resendContainer}>
                <TouchableOpacity onPress={handleResendVerification} disabled={isLoading}>
                  <Text variant="body" color="primary" style={styles.resendText}>Didn't receive anything? Resend</Text>
                </TouchableOpacity>
              </View>

              <Button 
                title="Try Different Email" 
                onPress={() => {
                  setStep('enter-email');
                  setCode('');
                }}
                variant="secondary"
                style={styles.button}
              />
            </>
          )}

          <View style={styles.footer}>
            <Text variant="body" color="secondary" style={styles.footerText}>Prefer phone? </Text>
            <Link href="/(auth)/phone-login" asChild>
              <TouchableOpacity>
                <Text variant="body" color="primary" style={styles.linkText}>Sign in with phone</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <View style={styles.footer}>
            <Text variant="body" color="secondary" style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/phone-signup" asChild>
              <TouchableOpacity>
                <Text variant="body" color="primary" style={styles.linkText}>Sign up with phone</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  emailDisplay: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
  },
  linkText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  verificationContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  verificationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  verificationMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  emailAddress: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  optionContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e5e5',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  verifyButton: {
    marginTop: 8,
  },
});