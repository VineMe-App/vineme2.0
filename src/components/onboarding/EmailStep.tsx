import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
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

  useEffect(() => {
    // Pre-fill email if exists on auth user
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  const validateEmail = (value: string): string | null => {
    if (!value.trim()) return 'Email is required';
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(value.trim())) return 'Enter a valid email';
    return null;
  };

  const handleNext = async () => {
    const v = validateEmail(email);
    if (v) {
      setError(v);
      return;
    }

    const trimmed = email.trim().toLowerCase();

    // If email hasn't changed, just proceed
    if (
      user?.email &&
      user.email.toLowerCase() === trimmed
    ) {
      onNext({});
      return;
    }

    setError(null);

    // Link email to the existing authenticated user account
    // This updates the current user's email instead of creating a new user
    const result = await linkEmail(trimmed, {
      emailRedirectTo: 'vineme://auth/verify-email',
      marketingOptIn: newsletterOptIn,
    });

    if (!result.success) {
      // Handle error messages
      const errorMsg = result.error || 'Failed to link email';
      if (
        errorMsg.toLowerCase().includes('already') ||
        errorMsg.toLowerCase().includes('in use')
      ) {
        setError('This email is already in use by another account');
      } else {
        setError(errorMsg);
      }
      return;
    }

    // Email successfully linked - Supabase automatically sends verification email
    // The user will need to verify the email, but we can proceed with onboarding
    onNext({});
  };

  const disableContinue = !email.trim() || isLoading;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <AuthHero
          title="What’s your email?"
          subtitle="We use your email for account recovery and updates."
          containerStyle={styles.heroSpacing}
        />
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
  },
  heroSpacing: {
    marginBottom: 32,
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

