import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Keyboard, Platform, TouchableWithoutFeedback } from 'react-native';
import type { OnboardingStepProps } from '@/types/app';
import { useAuthStore } from '@/stores/auth';
import { AuthHero } from '@/components/auth/AuthHero';
import { AuthButton } from '@/components/auth/AuthButton';
import { Text } from '@/components/ui/Text';

export default function EmailStep({
  data,
  onNext,
  onBack,
  canGoBack,
  isLoading,
}: OnboardingStepProps) {
  const { user, linkEmail } = useAuthStore();
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
    // Validate email format
    const trimmedEmail = email.trim();
    const validationError = validateEmail(trimmedEmail);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check if email is already linked to this user
    // If it matches the current user's email, skip linking but still update marketing preference
    if (user?.email && trimmedEmail.toLowerCase() === user.email.toLowerCase()) {
      // Email already linked, but we still need to save marketing preference
      setError(null);
      try {
        // Directly update marketing preference since email is already linked
        const { updateUserProfile, user: currentUser } = useAuthStore.getState();
        if (currentUser?.id) {
          await updateUserProfile({ marketing_opt_in: newsletterOptIn });
        }
        onNext({});
      } catch (profileError) {
        // If updating profile fails, try using linkEmail as fallback
        // This handles the case where profile doesn't exist yet
        const result = await linkEmail(trimmedEmail, {
          marketingOptIn: newsletterOptIn,
        });
        if (result.success) {
          onNext({});
        } else {
          // If both fail, just proceed - preference will be saved during profile creation
          console.warn('Failed to update marketing preference, will be saved during profile creation:', profileError);
          onNext({});
        }
      }
      return;
    }

    // Link the email to the user account
    setError(null);
    const result = await linkEmail(trimmedEmail, {
      marketingOptIn: newsletterOptIn,
    });

    if (result.success) {
      // Email successfully linked, proceed to next step
      onNext({});
    } else {
      // Show error from linkEmail
      setError(result.error || 'Failed to link email. Please try again.');
    }
  };

  const disableContinue = isLoading || !email.trim() || !!validateEmail(email.trim());

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
      <View style={[
        styles.content,
        isKeyboardVisible && styles.contentKeyboardVisible
      ]}>
        {!isKeyboardVisible && (
          <AuthHero
            title="What's your email?"
            subtitle="We use your email for account recovery and updates."
            containerStyle={styles.heroSpacing}
          />
        )}
        {isKeyboardVisible && (
          <View style={styles.keyboardHeader}>
            <Text variant="h4" weight="black" align="center" style={styles.title}>
              What's your email?
            </Text>
            <Text variant="bodyLarge" color="secondary" align="center" style={styles.subtitle}>
              We use your email for account recovery and updates.
            </Text>
          </View>
        )}
        <View style={styles.inputGroup}>
          <Text variant="labelSmall" color="secondary" style={styles.label}>
            Email address
          </Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (error) setError(null);
            }}
            placeholder="you@example.com"
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

      <View style={styles.footer}>
        <View style={styles.footerSpacer} />
        <AuthButton
          title="Next"
          onPress={handleNext}
          loading={isLoading}
          disabled={disableContinue}
        />
        <TouchableOpacity onPress={onBack} accessibilityRole="button">
          <Text variant="body" color="secondary" align="center">
            Back
          </Text>
        </TouchableOpacity>
      </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 40,
  },
  contentKeyboardVisible: {
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  heroSpacing: {
    marginBottom: 32,
  },
  keyboardHeader: {
    marginBottom: 32,
  },
  title: {
    color: '#2C2235',
    marginBottom: 12,
    letterSpacing: -1.5,
    fontWeight: '900',
  },
  subtitle: {
    color: '#2C2235',
    lineHeight: 24,
    letterSpacing: -0.2,
    maxWidth: 320,
    marginTop: 4,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#2C2235',
  },
  input: {
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#2C2235',
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
    marginTop: 16,
    marginBottom: 32,
  },
  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
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
    fontSize: 12,
    color: '#2C2235',
    letterSpacing: -0.6,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    width: '100%',
  },
  footerSpacer: {
    height: 32,
  },
});

