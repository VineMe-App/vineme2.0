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
import { AuthButton } from '@/components/auth/AuthButton';
import { AuthSignInPrompt } from '@/components/auth/AuthSignInPrompt';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { CountryCodePicker } from '@/components/ui/CountryCodePicker';

export default function PhoneSignUpScreen() {
  const router = useRouter();
  const { signUpWithPhone, verifyOtp, isLoading } = useAuthStore();

  const [step, setStep] = useState<'enter-phone' | 'enter-code'>('enter-phone');
  const [countryCode, setCountryCode] = useState('+44');
  const [localNumber, setLocalNumber] = useState('');
  const [code, setCode] = useState('');
  const [fullPhone, setFullPhone] = useState('');

  const sanitizedLocalNumber = localNumber.replace(/\D/g, '');
  const isPhoneValid =
    sanitizedLocalNumber.length === 10 || sanitizedLocalNumber.length === 11;

  const handleSendCode = async () => {
    if (!isPhoneValid || isLoading) {
      if (!isPhoneValid) {
        Alert.alert('Invalid Number', 'Enter a valid UK phone number (10-11 digits).');
      }
      return;
    }

    try {
      // If UK number (+44) and 11 digits starting with 0, remove the leading 0
      let processedNumber = sanitizedLocalNumber;
      if (countryCode === '+44' && processedNumber.length === 11 && processedNumber.startsWith('0')) {
        processedNumber = processedNumber.slice(1); // Remove leading 0
      }
      
      const phone = `${countryCode}${processedNumber}`;
      setFullPhone(phone);

      const result = await signUpWithPhone(phone);

      if (result.success) {
        setStep('enter-code');
      } else {
        Alert.alert('Error', result.error || 'Failed to send verification code.');
      }
    } catch (error) {
      console.error('Send code error', error);
      Alert.alert(
        'Network Error',
        'Unable to send the verification code right now. Please check your connection and try again.'
      );
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    const result = await verifyOtp(fullPhone, code, 'sms');

    if (result.success) {
      router.replace('/(auth)/onboarding-loader');
    } else {
      Alert.alert('Verification Failed', result.error || 'Invalid code');
    }
  };

  const handleResendCode = async () => {
    const result = await signUpWithPhone(fullPhone);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to resend code');
    }
  };

  const handleBackToPhone = () => {
    setStep('enter-phone');
    setCode('');
  };

  const handleSignInWithEmail = () => {
    router.push('/(auth)/email-login');
  };

  const displayPhone = fullPhone || `${countryCode}${sanitizedLocalNumber}`;

  const renderEnterPhoneStep = () => (
    <View style={styles.screen}>
      <View style={styles.body}>
        <AuthHero
          title="Create account"
          subtitle="Enter your phone number to get started"
          containerStyle={styles.heroSpacing}
        />

        <View style={styles.inputSection}>
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
              placeholderTextColor="#B4B4B4"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSendCode}
              editable={!isLoading}
              accessibilityLabel="Phone number"
            />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.actions}>
          <AuthButton
            title="Sign up"
            onPress={handleSendCode}
            disabled={!isPhoneValid}
            loading={isLoading}
          />
        </View>
        <AuthSignInPrompt />
      </View>
    </View>
  );

  const renderEnterCodeStep = () => (
    <View style={styles.screen}>
      <View style={styles.body}>
        <AuthHero subtitle={`Sent to ${displayPhone}`} containerStyle={styles.heroSpacing} />

        <View style={styles.otpSection}>
          <TextInput
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
            style={styles.otpInput}
            keyboardType="number-pad"
            placeholder="123456"
            placeholderTextColor="#C0C0C3"
            maxLength={6}
            textAlign="center"
            autoFocus
            accessibilityLabel="Verification code"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            importantForAutofill="yes"
            inputMode="numeric"
            returnKeyType="done"
          />
        </View>
      </View>
      <View style={styles.footer}>
        <View style={styles.footerSpacer} />
        <AuthButton
          title="Verify"
          onPress={handleVerify}
          loading={isLoading}
          disabled={code.length !== 6}
        />
        <TouchableOpacity
          onPress={handleBackToPhone}
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
        <TouchableOpacity onPress={handleSignInWithEmail} accessibilityRole="link">
          <Text variant="body" style={styles.signInEmail}>
            Sign in with email
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 'enter-phone':
        return renderEnterPhoneStep();
      case 'enter-code':
        return renderEnterCodeStep();
      default:
        return renderEnterPhoneStep();
    }
  };

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
            step === 'enter-phone' ? styles.primaryScroll : styles.secondaryScroll,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
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
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  secondaryScroll: {
    paddingHorizontal: 32,
    paddingVertical: 32,
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
    marginTop: 16,
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
    borderWidth: 1,
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
    fontSize: 16,
    color: '#2C2235',
  },
  phoneDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#EAEAEA',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#2C2235',
  },
  otpInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    paddingVertical: 16,
    height: 70,
    fontSize: 30,
    color: '#2C2235',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 12,
    fontWeight: '700',
  },
  resendText: {
    color: '#2C2235',
    marginTop: 32,
    textAlign: 'center',
  },
  resendLink: {
    color: '#1082FF',
  },
  signInEmail: {
    color: '#1082FF',
    marginTop: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
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
});
