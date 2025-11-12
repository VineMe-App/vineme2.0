import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import type { OnboardingStepProps } from '@/types/app';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/services/supabase';
import { AuthHero } from '@/components/auth/AuthHero';
import { AuthButton } from '@/components/auth/AuthButton';
import { Text } from '@/components/ui/Text';

const generateTemporaryPassword = () => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export default function EmailStep({
  data,
  onNext,
  onBack,
  canGoBack,
  isLoading,
}: OnboardingStepProps) {
  const { user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  // Removed public.users email check (column deleted). We rely on auth's uniqueness.

  const handleNext = async () => {
    const v = validateEmail(email);
    if (v) {
      setError(v);
      return;
    }

    const trimmed = email.trim();

    if (
      user?.email &&
      user.email.toLowerCase() === trimmed.toLowerCase()
    ) {
      onNext({});
      return;
    }

    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmed,
      password: generateTemporaryPassword(),
      options: {
        emailRedirectTo: 'vineme://auth/verify-email',
      },
    });

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      if (
        msg.includes('already') ||
        msg.includes('exists') ||
        msg.includes('registered')
      ) {
        setError('This email is already in use');
      } else if (msg.includes('email plus password')) {
        setError('Email signups are currently disabled.');
      } else {
        setError(signUpError.message);
      }
      return;
    }

    if (!data.user) {
      setError('Error sending verification email. Please try again.');
      return;
    }

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
  footer: {
    alignItems: 'center',
    width: '100%',
  },
  footerSpacer: {
    height: 32,
  },
});
