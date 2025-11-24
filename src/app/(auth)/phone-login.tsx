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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { AuthHero } from '@/components/auth/AuthHero';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { CountryCodePicker } from '@/components/ui/CountryCodePicker';
import { OtpInput } from '@/components/ui/OtpInput';
import { tertiaryColors } from '@/theme/tokens';

type AuthMethod = 'phone' | 'email' | null;
type Step = 'enter-credentials' | 'enter-code';

export default function PhoneLoginScreen() {
  const router = useRouter();
  const { signInWithPhone, signInWithEmail, verifyOtp, isLoading } = useAuthStore();

  const [step, setStep] = useState<Step>('enter-credentials');
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null);
  const [countryCode, setCountryCode] = useState('+44');
  const [localNumber, setLocalNumber] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [fullPhone, setFullPhone] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState(''); // For displaying on code screen

  const sanitizedLocalNumber = localNumber.replace(/\D/g, '');
  const isUk = countryCode === '+44';
  const isPhoneValid = isUk
    ? sanitizedLocalNumber.length === 10 || sanitizedLocalNumber.length === 11
    : sanitizedLocalNumber.length >= 6 && sanitizedLocalNumber.length <= 15;
  const isEmailValid = /\S+@\S+\.\S+/.test(email.trim());
  const canSubmit = isPhoneValid || isEmailValid;

  const handleSubmit = async () => {
    if (isLoading) return;

    // Prioritize phone if both are filled
    if (isPhoneValid) {
      try {
        let processedNumber = sanitizedLocalNumber;
        if (isUk && processedNumber.length === 11 && processedNumber.startsWith('0')) {
          processedNumber = processedNumber.slice(1);
        }
        
        const phone = `${countryCode}${processedNumber}`;
        setFullPhone(phone);
        setEmailOrPhone(phone);
        setAuthMethod('phone');

        const result = await signInWithPhone(phone);

        if (result.success) {
          setStep('enter-code');
        } else if (result.userNotFound) {
          Alert.alert('Phone Not Found', result.error);
        } else {
          Alert.alert('Error', result.error || 'Failed to send verification code.');
        }
      } catch (error) {
        console.error('Login send code error', error);
        Alert.alert(
          'Network Error',
          'Unable to send the verification code right now. Please check your connection and try again.'
        );
      }
    } else if (isEmailValid) {
      const trimmedEmail = email.trim();
      setEmailOrPhone(trimmedEmail);
      setAuthMethod('email');

      const result = await signInWithEmail(trimmedEmail);

      if (result.success) {
        setStep('enter-code');
      } else if (result.userNotFound) {
        Alert.alert('Email Not Found', result.error);
      } else {
        Alert.alert('Error', result.error || 'Failed to send verification.');
      }
    } else {
      if (!isPhoneValid && !isEmailValid) {
        Alert.alert('Invalid Input', 'Please enter a valid phone number or email address.');
      }
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    const result = await verifyOtp(
      authMethod === 'phone' ? fullPhone : emailOrPhone,
      code,
      authMethod === 'phone' ? 'sms' : 'email'
    );

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Verification Failed', result.error || 'Invalid code');
    }
  };

  const handleResendCode = async () => {
    if (authMethod === 'phone') {
      const result = await signInWithPhone(fullPhone);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to resend code');
      }
    } else if (authMethod === 'email') {
      const result = await signInWithEmail(emailOrPhone);
      if (result.success) {
        Alert.alert('Verification Sent', 'A new verification has been sent to your email.');
      } else {
        Alert.alert('Error', result.error || 'Failed to resend verification');
      }
    }
  };

  const handleBackToCredentials = () => {
    setStep('enter-credentials');
    setCode('');
    setAuthMethod(null);
  };

  const displayPhone = fullPhone || `${countryCode}${sanitizedLocalNumber}`;

  const renderEnterCredentialsStep = () => (
    <View style={styles.screen}>
      <View style={styles.body}>
        <AuthHero
          title="Sign in"
          subtitle="Enter your phone number to get started"
          containerStyle={styles.heroSpacing}
        />

        <View style={styles.inputSection}>
          {/* Phone Number Input */}
          <View style={styles.phoneField}>
            <CountryCodePicker
              value={countryCode}
              onChange={setCountryCode}
              hideLabel
              renderTrigger={({ selected, open }) => (
                <TouchableOpacity
                  style={styles.countryTrigger}
                  onPress={open}
                  accessibilityRole="button"
                  accessibilityLabel="Select country code"
                >
                  <Text style={styles.countryFlag}>{selected.flag}</Text>
                  <Text weight="semiBold" style={styles.countryCodeText}>
                    {selected.code}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <View style={styles.phoneDivider} />
            <TextInput
              value={localNumber}
              onChangeText={(text) => setLocalNumber(text.replace(/\D/g, ''))}
              style={styles.phoneInput}
              keyboardType="phone-pad"
              placeholder="7123456789"
              placeholderTextColor="#939393"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!isLoading}
              accessibilityLabel="Phone number"
            />
          </View>

          {/* Or Divider */}
          <View style={styles.orContainer}>
            <Text variant="body" color="secondary" style={styles.orText}>
              or
            </Text>
          </View>

          {/* Email Input */}
          <View style={styles.emailField}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.emailInput}
              keyboardType="email-address"
              placeholder="Please enter your email"
              placeholderTextColor="#939393"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!isLoading}
              accessibilityLabel="Email address"
            />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.actions}>
          <Button
            title="Submit"
            variant="primary"
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={isLoading}
            fullWidth
            style={styles.authButton}
          />
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/phone-signup')}
          accessibilityRole="link"
          style={styles.signUpLink}
        >
          <Text variant="body" style={styles.signUpText}>
            Don't have an account? <Text style={styles.signUpLinkText}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEnterCodeStep = () => (
    <View style={styles.screen}>
      <View style={styles.body}>
        <AuthHero
          subtitle={`Sent to ${emailOrPhone}`}
          containerStyle={styles.heroSpacing}
        />

        <View style={styles.otpSection}>
          <OtpInput
            value={code}
            onChange={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
            length={6}
          />
        </View>
      </View>
      <View style={styles.footer}>
        <View style={styles.footerSpacer} />
        <Button
          title="Verify"
          variant="primary"
          onPress={handleVerify}
          loading={isLoading}
          disabled={code.length !== 6}
          fullWidth
          style={styles.authButton}
        />
        <TouchableOpacity
          onPress={handleBackToCredentials}
          accessibilityRole="button"
          style={styles.backButton}
        >
          <Text variant="body" color="secondary" align="center">
            Back
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleResendCode}
          disabled={isLoading}
          accessibilityRole="button"
        >
          <Text variant="body" weight="semiBold" style={styles.resendText}>
            Didn't receive a code? <Text style={styles.resendLink}>Resend</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            step === 'enter-credentials' ? styles.primaryScroll : styles.secondaryScroll,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'enter-credentials' ? renderEnterCredentialsStep() : renderEnterCodeStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  primaryScroll: {
    paddingHorizontal: 34,
    paddingTop: 100,
    paddingBottom: 24,
  },
  secondaryScroll: {
    paddingHorizontal: 32,
    paddingTop: 100,
    paddingBottom: 32,
  },
  screen: {
    flex: 1,
    justifyContent: 'space-between',
  },
  body: {
    flex: 1,
    width: '100%',
  },
  heroSpacing: {
    marginTop: 0,
    marginBottom: 0,
  },
  inputSection: {
    width: '100%',
    marginTop: 32,
  },
  otpSection: {
    width: '100%',
    marginTop: 32,
  },
  footerSpacer: {
    height: 32,
  },
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    height: 50,
  },
  countryTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: '100%',
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 8,
  },
  countryCodeText: {
    fontSize: 18,
    color: tertiaryColors[500],
    fontWeight: '400',
  },
  phoneDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#EAEAEA',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 18,
    color: tertiaryColors[500],
  },
  orContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  orText: {
    fontSize: 14,
    color: tertiaryColors[500],
    letterSpacing: -0.14,
  },
  emailField: {
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    height: 50,
  },
  emailInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    color: tertiaryColors[500],
    letterSpacing: -0.28,
  },
  resendText: {
    color: tertiaryColors[500],
    marginTop: 32,
    textAlign: 'center',
  },
  authButton: {
    marginBottom: 16,
  },
  resendLink: {
    color: '#1082FF',
  },
  backButton: {
    marginTop: 16,
  },
  footer: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 12,
    marginTop: 32,
  },
  actions: {
    width: '100%',
  },
  signUpLink: {
    marginTop: 16,
  },
  signUpText: {
    fontSize: 14,
    color: tertiaryColors[500],
    letterSpacing: -0.14,
    textAlign: 'center',
  },
  signUpLinkText: {
    color: '#1082FF',
  },
});
