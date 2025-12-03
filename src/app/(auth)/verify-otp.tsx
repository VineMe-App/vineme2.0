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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuthButton } from '@/components/auth/AuthButton';
import { Text } from '@/components/ui/Text';
import { AuthHeroLogo } from '@/components/auth/AuthHeroLogo';
import { useAuthStore } from '@/stores/auth';
import { safeGoBack } from '@/utils/navigation';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { verifyOtp, isLoading, signUpWithPhone, signInWithPhone, signInWithEmail } = useAuthStore();

  const phoneOrEmail = (params.phoneOrEmail as string) || '';
  const type = (params.type as 'sms' | 'email') || 'sms';
  const onSuccessRoute = (params.onSuccessRoute as string) || '/(auth)/onboarding-loader';
  const resendFunction = params.resendFunction as 'signUpWithPhone' | 'signInWithPhone' | 'signInWithEmail' | undefined;

  const [code, setCode] = useState('');
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

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    const result = await verifyOtp(phoneOrEmail, code, type);

    if (result.success) {
      router.replace(onSuccessRoute as any);
    } else {
      Alert.alert('Verification Failed', result.error || 'Invalid code');
    }
  };

  const handleResendCode = async () => {
    if (resendFunction === 'signUpWithPhone') {
      const result = await signUpWithPhone(phoneOrEmail);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to resend code');
      }
    } else if (resendFunction === 'signInWithPhone') {
      const result = await signInWithPhone(phoneOrEmail);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to resend code');
      }
    } else if (resendFunction === 'signInWithEmail') {
      const result = await signInWithEmail(phoneOrEmail);
      if (result.success) {
        Alert.alert('Verification Sent', 'A new verification has been sent to your email.');
      } else {
        Alert.alert('Error', result.error || 'Failed to resend verification');
      }
    }
  };

  const displayText = phoneOrEmail || 'your phone or email';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.screen}>
            <View
              style={[
                styles.body,
                isKeyboardVisible && styles.bodyKeyboardVisible,
              ]}
            >
              {!isKeyboardVisible && (
                <View style={styles.logoContainer}>
                  <AuthHeroLogo
                    logoSize={108}
                    subtitle={`Sent to ${displayText}`}
                    subtitleMaxWidth={329}
                    subtitleFontSize={18}
                    subtitleStyle={{ marginTop: -12 }}
                  />
                </View>
              )}
              {isKeyboardVisible && (
                <View style={styles.keyboardHeader}>
                  <Text
                    variant="bodyLarge"
                    color="primary"
                    align="center"
                    style={styles.subtitle}
                  >
                    Sent to {displayText}
                  </Text>
                </View>
              )}

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
                  accessibilityLabel="Verification code"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  importantForAutofill="yes"
                  inputMode="numeric"
                  blurOnSubmit={false}
                />
              </View>

              <View style={[
                styles.actionsSection,
                isKeyboardVisible && styles.actionsSectionKeyboardVisible
              ]}>
                <AuthButton
                  title="Verify"
                  onPress={handleVerify}
                  loading={isLoading}
                  disabled={code.length !== 6}
                  fullWidth={false}
                  style={styles.verifyButton}
                />
                <TouchableOpacity
                  onPress={() => safeGoBack(router)}
                  accessibilityRole="button"
                  style={styles.backButton}
                >
                  <Text variant="body" align="center" style={styles.backText}>
                    Back
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={isLoading || !resendFunction}
                  accessibilityRole="button"
                  style={styles.resendContainer}
                >
                  <Text style={styles.resendText}>
                    Didn't receive a code? <Text style={styles.resendLink}>Resend</Text>
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/phone-login')}
                  accessibilityRole="link"
                  style={styles.emailLinkContainer}
                >
                  <Text style={styles.emailLink}>Sign in with email</Text>
                </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 34,
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
  subtitle: {
    color: '#2C2235',
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.36,
    maxWidth: 329,
  },
  logoContainer: {
    width: '100%',
    alignItems: 'center',
  },
  otpSection: {
    width: '100%',
    marginTop: 13,
    marginBottom: 0,
    alignItems: 'center',
  },
  otpInput: {
    width: 326,
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    paddingVertical: 0,
    height: 70,
    fontSize: 30,
    color: '#2C2235',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 15,
    fontWeight: '700',
  },
  actionsSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 200,
    marginBottom: 0,
  },
  actionsSectionKeyboardVisible: {
    marginTop: 180, // Much smaller margin when keyboard is visible
  },
  verifyButton: {
    width: 278,
  },
  backButton: {
    marginTop: 16,
    marginBottom: 32,
  },
  backText: {
    color: '#999999',
    fontSize: 16,
    letterSpacing: -0.8,
  },
  resendContainer: {
    marginTop: 0,
    alignItems: 'center',
  },
  resendText: {
    color: '#2C2235',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: -0.28,
    lineHeight: 24,
    textAlign: 'center',
  },
  resendLink: {
    color: '#007DFF',
  },
  emailLinkContainer: {
    marginTop: 0,
    alignItems: 'center',
  },
  emailLink: {
    color: '#007DFF',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: -0.28,
    lineHeight: 24,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
