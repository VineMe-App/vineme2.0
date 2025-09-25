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
import { CountryCodePicker } from '@/components/ui/CountryCodePicker';
import { OtpInput } from '@/components/ui/OtpInput';

export default function PhoneLoginScreen() {
  const router = useRouter();
  const { signInWithPhone, verifyOtp, isLoading } = useAuthStore();
  
  const [step, setStep] = useState<'enter-phone' | 'enter-code'>('enter-phone');
  const [countryCode, setCountryCode] = useState('+44');
  const [localNumber, setLocalNumber] = useState('');
  const [code, setCode] = useState('');
  const [fullPhone, setFullPhone] = useState('');

  const handleSendCode = async () => {
    const phone = `${countryCode}${localNumber.replace(/\D/g, '')}`;
    setFullPhone(phone);
    
    const result = await signInWithPhone(phone);
    
    if (result.success) {
      setStep('enter-code');
    } else if (result.userNotFound) {
      Alert.alert('Phone Not Found', result.error);
    } else {
      Alert.alert('Error', result.error || 'Failed to send code');
    }
  };

  const handleVerify = async () => {
    const result = await verifyOtp(fullPhone, code, 'sms');
    
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Verification Failed', result.error || 'Invalid code');
    }
  };

  const handleResendCode = async () => {
    const result = await signInWithPhone(fullPhone);
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
          <Text variant="h2" weight="bold" style={styles.title}>Sign in with Phone</Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            {step === 'enter-phone' 
              ? 'Enter your phone number to receive a verification code'
              : 'Enter the 4-digit code sent to your phone'
            }
          </Text>
        </View>

        <View style={styles.form}>
          {step === 'enter-phone' ? (
            <>
              <CountryCodePicker 
                value={countryCode} 
                onChange={setCountryCode} 
                label="Country" 
              />
              <Text variant="label" style={[styles.label, { marginTop: 16 }]}>Phone Number</Text>
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
          ) : (
            <>
              <Text variant="body" color="secondary" style={styles.phoneDisplay}>Sent to {fullPhone}</Text>
              <OtpInput 
                value={code} 
                onChange={(text) => setCode(text.replace(/\D/g, '').slice(0, 4))} 
                length={4} 
              />
              <Button 
                title="Verify" 
                onPress={handleVerify} 
                loading={isLoading}
                style={styles.button}
              />
              <View style={styles.resendContainer}>
                <TouchableOpacity onPress={handleResendCode} disabled={isLoading}>
                  <Text variant="body" color="primary" style={styles.resendText}>Didn't receive code? Resend</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={styles.footer}>
            <Text variant="body" color="secondary" style={styles.footerText}>Prefer email? </Text>
            <Link href="/(auth)/email-login" asChild>
              <TouchableOpacity>
                <Text variant="body" color="primary" style={styles.linkText}>Sign in with email</Text>
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


