import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Keyboard, Platform, TouchableWithoutFeedback } from 'react-native';
import type { OnboardingStepProps } from '@/types/app';
import { useAuthStore } from '@/stores/auth';
import { AuthButton } from '@/components/auth/AuthButton';
import { Text } from '@/components/ui/Text';

export default function EmailStep({
  data,
  onNext,
  onBack,
  canGoBack,
  isLoading,
}: OnboardingStepProps) {
  const { user, linkEmail, updateUserProfile } = useAuthStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // Pre-fill email if exists on auth user
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

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

  const validateEmail = (value: string): string | null => {
    if (!value.trim()) return 'Email is required';
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(value.trim())) return 'Enter a valid email';
    return null;
  };

  const handleNext = async () => {
    setError(null);

    // Validate email format
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedExistingEmail = user?.email?.toLowerCase().trim();

      // Link email if user doesn't have one, or update if different (case-insensitive comparison)
      if (!user?.email || normalizedExistingEmail !== normalizedEmail) {
        const result = await linkEmail(email.trim(), {
          marketingOptIn: newsletterOptIn,
        });

        if (!result.success) {
          setError(result.error || 'Failed to link email. Please try again.');
          return;
        }
      } else if (user) {
        // Email already linked (same email, case-insensitive), just update newsletter preference
        const updateSuccess = await updateUserProfile({
          marketing_opt_in: newsletterOptIn,
        });

        if (!updateSuccess) {
          const latestError =
            useAuthStore.getState().error || 'Failed to update preferences. Please try again.';
          setError(latestError);
          return;
        }
      }

      onNext({});
    } catch (err: any) {
      setError(err?.message || 'Failed to save email. Please try again.');
    }
  };

  const disableContinue = isLoading || !email.trim() || !!validateEmail(email);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View
          style={[
            styles.content,
            isKeyboardVisible && styles.contentKeyboardVisible,
          ]}
        >
          {!isKeyboardVisible && (
            <View style={styles.header}>
              <Text variant="h4" weight="extraBold" align="center" style={styles.title}>
                What's your email?
              </Text>
              <Text
                variant="bodyLarge"
                color="primary"
                align="center"
                style={styles.subtitle}
              >
                We use your email for account recovery and updates
              </Text>
            </View>
          )}
          {isKeyboardVisible && (
            <View style={styles.keyboardHeader}>
              <Text variant="h4" weight="extraBold" align="center" style={styles.title}>
                What's your email?
              </Text>
              <Text
                variant="bodyLarge"
                color="primary"
                align="center"
                style={styles.subtitle}
              >
                We use your email for account recovery and updates
              </Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <View style={styles.inputWrapper}>
              <Text variant="labelSmall" color="primary" style={styles.label}>
                Enter email
              </Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) setError(null);
                }}
                placeholder="name@email.com"
                placeholderTextColor="#B4B4B4"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="done"
                textContentType="emailAddress"
              />
              {error && (
                <Text variant="bodySmall" color="error" style={styles.errorText}>
                  {error}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setNewsletterOptIn(!newsletterOptIn)}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <View style={[styles.checkbox, newsletterOptIn && styles.checkboxChecked]}>
                {newsletterOptIn && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                Send me news and updates.
              </Text>
            </TouchableOpacity>
          </View>

          {isKeyboardVisible && (
            <View style={styles.keyboardFooter}>
              <AuthButton
                title="Next"
                onPress={handleNext}
                loading={isLoading}
                disabled={disableContinue}
              />
              <TouchableOpacity
                onPress={onBack}
                accessibilityRole="button"
                style={styles.backButton}
              >
                <Text variant="body" align="center" style={styles.backText}>
                  Back
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!isKeyboardVisible && (
          <View style={styles.footer}>
            <AuthButton
              title="Next"
              onPress={handleNext}
              loading={isLoading}
              disabled={disableContinue}
            />
            <TouchableOpacity
              onPress={onBack}
              accessibilityRole="button"
              style={styles.backButton}
            >
              <Text variant="body" align="center" style={styles.backText}>
                Back
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 53, // Figma: left 53px
    paddingTop: 16,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
  },
  contentKeyboardVisible: {
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  keyboardHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    color: '#2C2235',
    fontSize: 26, // Figma: 26px
    lineHeight: 40, // Figma: 40px
    letterSpacing: -0.52, // Figma: -0.52px
    marginBottom: 20, // Spacing to subtitle
    marginTop: 75,
  },
  subtitle: {
    color: '#2C2235',
    fontSize: 16, // Figma: 16px
    lineHeight: 22, // Figma: 22px
    letterSpacing: -0.32, // Figma: -0.32px
    maxWidth: 326, // Match NameStep
    marginTop: 0,
  },
  inputGroup: {
    gap: 8, // Gap between inputWrapper and checkbox (matches NameStep inputWrapper gap)
    marginBottom: 24, // Match NameStep
  },
  inputWrapper: {
    gap: 8, // Visual gap between label and input
  },
  keyboardFooter: {
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
  },
  label: {
    color: '#2C2235',
    fontSize: 14, // Figma: 14px
    letterSpacing: -0.28, // Figma: -0.28px
  },
  input: {
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    height: 50, // Figma: 50px
    paddingVertical: 0,
    paddingHorizontal: 14, // 67px - 53px = 14px from Figma
    fontSize: 18, // Figma: 18px
    lineHeight: 24, // Figma: 24px
    letterSpacing: -0.36, // Figma: -0.36px
    backgroundColor: '#FFFFFF',
    color: '#2C2235',
    textAlignVertical: 'center',
    fontWeight: '500', // Medium
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
  },
  checkbox: {
    width: 19, // Figma: 19px
    height: 19, // Figma: 19px
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#939393', // Figma: #939393
    backgroundColor: '#FFFFFF',
    marginRight: 8, // Figma: spacing between checkbox and text
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2C2235',
    borderColor: '#2C2235',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 12,
    includeFontPadding: false,
  },
  checkboxLabel: {
    fontSize: 14, // Figma: 14px
    color: '#2C2235',
    letterSpacing: -0.28, // Figma: -0.28px
    lineHeight: 16, // Figma: 16px
  },
  footer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 100, // Match welcome page actions marginBottom
  },
  backButton: {
    marginTop: 16,
  },
  backText: {
    color: '#999999', // Figma: #999999
    fontSize: 16, // Figma: 16px
    letterSpacing: -0.8, // Figma: -0.8px
  },
});
