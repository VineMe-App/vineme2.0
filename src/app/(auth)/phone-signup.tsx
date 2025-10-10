import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useRouter, Link } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { CountryCodePicker } from '@/components/ui/CountryCodePicker';

export default function PhoneSignUpScreen() {
  const router = useRouter();
  const { signUpWithPhone, verifyOtp, linkEmail, isLoading } = useAuthStore();

  const [step, setStep] = useState<'enter-phone' | 'enter-code' | 'link-email'>(
    'enter-phone'
  );
  const [countryCode, setCountryCode] = useState('+44');
  const [localNumber, setLocalNumber] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [fullPhone, setFullPhone] = useState('');

  const handleSendCode = async () => {
    const phone = `${countryCode}${localNumber.replace(/\D/g, '')}`;
    setFullPhone(phone);

    const result = await signUpWithPhone(phone);

    if (result.success) {
      setStep('enter-code');
    } else {
      Alert.alert('Error', result.error || 'Failed to send code');
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }
    
    const result = await verifyOtp(fullPhone, code, 'sms');

    if (result.success) {
      // After successful phone verification, ask for email
      setStep('link-email');
    } else {
      Alert.alert('Verification Failed', result.error || 'Invalid code');
    }
  };

  const handleLinkEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    const result = await linkEmail(email.trim());

    if (result.success) {
      Alert.alert(
        'Account Created!',
        'Your account has been created successfully with phone verification.',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/(auth)/onboarding'),
          },
        ]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to link email');
    }
  };

  const handleResendCode = async () => {
    const result = await signUpWithPhone(fullPhone);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to resend code');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            {step === 'enter-phone' && 'Enter your phone number to get started'}
            {step === 'enter-code' &&
              'Enter the 6-digit code sent to your phone'}
            {step === 'link-email' &&
              'Link your email address to complete setup'}
          </Text>
        </View>

        <View style={styles.form}>
          {step === 'enter-phone' && (
            <>
              <CountryCodePicker
                value={countryCode}
                onChange={setCountryCode}
                label="Country"
              />
              <Text style={[styles.label, { marginTop: 16 }]}>
                Phone Number
              </Text>
              <TextInput
                value={localNumber}
                onChangeText={(text) => setLocalNumber(text.replace(/\D/g, ''))}
                style={styles.input}
                keyboardType="phone-pad"
                placeholder="7123456789"
                autoCapitalize="none"
                editable={!isLoading}
              />
              <Button
                title="Send Code"
                onPress={handleSendCode}
                loading={isLoading}
                style={styles.button}
              />
            </>
          )}

          {step === 'enter-code' && (
            <>
              <Text style={styles.label}>Enter 6-digit code</Text>
              <Text style={styles.phoneDisplay}>Sent to {fullPhone}</Text>
              <TextInput
                value={code}
                onChangeText={(text) =>
                  setCode(text.replace(/\D/g, '').slice(0, 6))
                }
                style={styles.otpInput}
                keyboardType="number-pad"
                placeholder="123456"
                maxLength={6}
                textAlign="center"
                autoFocus
              />
              <Button
                title="Verify"
                onPress={handleVerify}
                loading={isLoading}
                style={styles.button}
              />
              <View style={styles.resendContainer}>
                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={isLoading}
                >
                  <Text style={styles.resendText}>
                    Didn't receive code? Resend
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 'link-email' && (
            <>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.helperText}>
                We'll use this to send you important updates and help you
                recover your account.
              </Text>
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
                title="Complete Setup"
                onPress={handleLinkEmail}
                loading={isLoading}
                style={styles.button}
              />
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/phone-login" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Sign in</Text>
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
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
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
  otpInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 8,
  },
  button: {
    marginTop: 8,
  },
  phoneDisplay: {
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
});
