import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Keyboard,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { AuthButton } from '@/components/auth/AuthButton';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { CountryCodePicker } from '@/components/ui/CountryCodePicker';
import { AuthHeroLogo } from '@/components/auth/AuthHeroLogo';

export default function PhoneSignUpScreen() {
  const router = useRouter();
  const { signUpWithPhone, isLoading } = useAuthStore();

  const [countryCode, setCountryCode] = useState('+44');
  const [localNumber, setLocalNumber] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const sanitizedLocalNumber = localNumber.replace(/\D/g, '');
  // Validate UK numbers as 10–11 digits (allow leading 0 in local part), otherwise use a general E.164-style length check (6–15 digits)
  const isUk = countryCode === '+44';
  const isPhoneValid = isUk
    ? sanitizedLocalNumber.length === 10 || sanitizedLocalNumber.length === 11
    : sanitizedLocalNumber.length >= 6 && sanitizedLocalNumber.length <= 15;

  const handleSendCode = async () => {
    if (!isPhoneValid || isLoading) {
      if (!isPhoneValid) {
        const msg = isUk
          ? 'Enter a valid UK phone number (10–11 digits).'
          : 'Enter a valid phone number (6–15 digits).';
        Alert.alert('Invalid Number', msg);
      }
      return;
    }

    try {
      // If UK number (+44) and 11 digits starting with 0, remove the leading 0
      let processedNumber = sanitizedLocalNumber;
      if (isUk && processedNumber.length === 11 && processedNumber.startsWith('0')) {
        processedNumber = processedNumber.slice(1); // Remove leading 0
      }
      
      const phone = `${countryCode}${processedNumber}`;

      const result = await signUpWithPhone(phone);
      if (result.success) {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: {
            phoneOrEmail: phone,
            type: 'sms',
            onSuccessRoute: '/(auth)/onboarding-loader',
            resendFunction: 'signUpWithPhone',
          },
        });
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



  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        contentContainerStyle={styles.primaryScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.screen}>
            <View style={[
              styles.body,
              isKeyboardVisible && styles.bodyKeyboardVisible
            ]}>
              {!isKeyboardVisible && (
                <AuthHeroLogo
                  logoSize={109}
                  title="Create account"
                  subtitle="Enter your phone number to get started"
                  subtitleMaxWidth={326}
                />
              )}
              {isKeyboardVisible && (
                <View style={styles.keyboardHeader}>
                  <Text variant="h4" weight="extraBold" align="center" style={styles.title}>
                    Create account
                  </Text>
                  <Text
                    variant="bodyLarge"
                    color="primary"
                    align="center"
                    style={styles.subtitle}
                  >
                    Enter your phone number to get started
                  </Text>
                </View>
              )}

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
                      <Text style={styles.countryCodeText}>
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
                  blurOnSubmit={false}
                  editable={!isLoading}
                  accessibilityLabel="Phone number"
                />
              </View>
            </View>

              <View style={styles.actionsSection}>
                <AuthButton
                  title="Sign up"
                  onPress={handleSendCode}
                  disabled={!isPhoneValid}
                  loading={isLoading}
                  fullWidth={false}
                  style={styles.signUpButton}
                />
                <View style={styles.signInPrompt}>
                  <Text style={styles.signInPromptText}>
                    Already have an account?{' '}
                    <Text style={styles.signInLink} onPress={() => router.push('/(auth)/phone-login')}>
                      Sign in
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  primaryScroll: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 100,
    paddingBottom: 100,
  },
  screen: {
    width: '100%',
    minHeight: '100%',
  },
  body: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  bodyKeyboardVisible: {
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  keyboardHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    color: '#2C2235',
    fontSize: 30,
    letterSpacing: -0.6,
    lineHeight: 40,
    marginBottom: 15,
  },
  subtitle: {
    color: '#2C2235',
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: -0.32,
    maxWidth: 326,
  },
  heroSpacing: {
    marginTop: 0,
  },
  inputSection: {
    width: '100%',
    marginTop: 32,
    alignItems: 'center',
    marginBottom: 130,
  },
  actionsSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 56,
  },
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    height: 50,
    width: 326,
    alignSelf: 'center',
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
    color: '#000000',
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
    color: '#000000',
  },
  signUpButton: {
    width: 278,
  },
  signInPrompt: {
    marginTop: 16,
    alignItems: 'center',
  },
  signInPromptText: {
    fontSize: 14,
    fontWeight: '400', // Regular
    color: '#2C2235',
    textAlign: 'center',
    letterSpacing: -0.14,
    lineHeight: 22,
    includeFontPadding: false,
    paddingVertical: 3,
  },
  signInLink: {
    color: '#1082ff',
  },
});
