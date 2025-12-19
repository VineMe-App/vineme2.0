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

type AuthMethod = 'phone' | 'email' | null;

export default function PhoneLoginScreen() {
  const router = useRouter();
  const { signInWithPhone, signInWithEmail, isLoading } = useAuthStore();

  const [countryCode, setCountryCode] = useState('+44');
  const [localNumber, setLocalNumber] = useState('');
  const [email, setEmail] = useState('');
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

        const result = await signInWithPhone(phone);
        if (result.success) {
          router.push({
            pathname: '/(auth)/verify-otp',
            params: {
              phoneOrEmail: phone,
              type: 'sms',
              onSuccessRoute: '/(tabs)',
              resendFunction: 'signInWithPhone',
            },
          });
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

      const result = await signInWithEmail(trimmedEmail);
      if (result.success) {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: {
            phoneOrEmail: trimmedEmail,
            type: 'email',
            onSuccessRoute: '/(tabs)',
            resendFunction: 'signInWithEmail',
          },
        });
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


  const renderEnterCredentialsStep = () => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.screen}>
        <View style={[
          styles.body,
          isKeyboardVisible && styles.bodyKeyboardVisible
        ]}>
          {!isKeyboardVisible && (
            <AuthHeroLogo
              logoSize={109}
              title="Sign in"
              subtitle="Enter your phone number to get started"
              subtitleFontSize={18}
              subtitleLetterSpacing={-0.36}
              subtitleMaxWidth={313}
            />
          )}
          {isKeyboardVisible && (
            <View style={styles.keyboardHeader}>
              <Text variant="h4" weight="extraBold" align="center" style={styles.title}>
                Sign in
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
              blurOnSubmit={false}
              editable={!isLoading}
              accessibilityLabel="Phone number"
            />
          </View>

          {/* Or Divider */}
          <View style={styles.orContainer}>
            <Text style={styles.orText}>
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
              blurOnSubmit={false}
              editable={!isLoading}
              accessibilityLabel="Email address"
            />
          </View>
        </View>

          <View style={styles.actionsSection}>
            <AuthButton
              title="Sign in"
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={isLoading}
              fullWidth={false}
              style={styles.signInButton}
            />
            <TouchableOpacity
              onPress={() => router.push('/(auth)/phone-signup')}
              accessibilityRole="link"
              style={styles.signUpLink}
            >
              <Text style={styles.signUpText}>
                Don't have an account? <Text style={styles.signUpLinkText}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        contentContainerStyle={styles.primaryScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        {renderEnterCredentialsStep()}
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
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.36,
    maxWidth: 313,
  },
  inputSection: {
    width: '100%',
    marginTop: 32,
    alignItems: 'center',
    marginBottom: 30,
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
  orContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  orText: {
    fontSize: 14,
    color: '#2C2235',
    letterSpacing: -0.14,
    lineHeight: 28,
  },
  emailField: {
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    height: 50,
    width: 326,
    alignSelf: 'center',
  },
  emailInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 0,
    fontSize: 16,
    color: '#2C2235',
    letterSpacing: -0.32,
    fontWeight: '500', // Medium
  },
  resendText: {
    color: '#2C2235',
    marginTop: 32,
    textAlign: 'center',
  },
  resendLink: {
    color: '#1082FF',
  },
  backButton: {
    marginTop: 16,
  },
  signInButton: {
    width: 278,
  },
  signUpLink: {
    marginTop: 16,
  },
  signUpText: {
    fontSize: 14,
    fontWeight: '400', // Regular
    color: '#2C2235',
    letterSpacing: -0.14,
    lineHeight: 22,
    textAlign: 'center',
    includeFontPadding: false,
    paddingVertical: 3,
  },
  signUpLinkText: {
    color: '#1082FF',
  },
});

