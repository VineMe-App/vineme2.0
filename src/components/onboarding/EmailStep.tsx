import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { OnboardingStepProps } from '@/types/app';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/services/supabase';

export default function EmailStep({
  data,
  onNext,
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

    setError(null);
    // Link email to auth.user; auth enforces global uniqueness
    if (
      !user?.email ||
      user.email.toLowerCase() !== email.trim().toLowerCase()
    ) {
      const { error: linkErr } = await supabase.auth.updateUser({
        email: email.trim(),
      });
      if (linkErr) {
        // Surface a friendlier message for uniqueness
        const msg = linkErr.message.toLowerCase();
        if (
          msg.includes('already') ||
          msg.includes('exists') ||
          msg.includes('registered')
        ) {
          setError('This email is already in use');
        } else {
          setError(linkErr.message);
        }
        return;
      }
    }

    onNext({});
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>What's your email?</Text>
        <Text style={styles.subtitle}>
          We use your email for account recovery and updates
        </Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (error) setError(null);
            }}
            placeholder="you@example.com"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          (!email.trim() || isLoading) && styles.buttonDisabled,
        ]}
        onPress={handleNext}
        disabled={!email.trim() || isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Please wait...' : 'Continue'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', padding: 24 },
  content: { flex: 1, justifyContent: 'center' },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 22,
  },
  inputContainer: { marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    backgroundColor: '#f9f9f9',
    textAlign: 'center',
  },
  inputError: { borderColor: '#ff4444' },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
