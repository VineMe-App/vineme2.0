import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import type { OnboardingStepProps } from '@/types/app';
import { Button } from '@/components/ui/Button';

export default function NameStep({
  data,
  onNext,
  onBack,
  canGoBack,
  isLoading,
}: OnboardingStepProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(data.first_name || '');
    setLastName(data.last_name || '');
  }, [data.first_name, data.last_name]);

  const validatePart = (value: string, label: string): string | null => {
    if (!value.trim()) {
      return `${label} is required`;
    }
    if (value.trim().length < 2) {
      return `${label} must be at least 2 characters`;
    }
    if (value.trim().length > 50) {
      return `${label} must be less than 50 characters`;
    }
    return null;
  };

  const handleContinue = () => {
    const firstError = validatePart(firstName, 'First name');
    const lastError = validatePart(lastName, 'Last name');

    setFirstNameError(firstError);
    setLastNameError(lastError);

    if (firstError || lastError) {
      return;
    }

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    onNext({
      first_name: trimmedFirst,
      last_name: trimmedLast,
    });
  };

  const handleFirstChange = (value: string) => {
    setFirstName(value);
    if (firstNameError) setFirstNameError(null);
  };

  const handleLastChange = (value: string) => {
    setLastName(value);
    if (lastNameError) setLastNameError(null);
  };

  const disableContinue = !firstName.trim() || !lastName.trim() || isLoading;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>What&apos;s your name?</Text>
        <Text style={styles.subtitle}>
          Share your first and last name so your church community can recognize
          you.
        </Text>

        <View style={styles.inputGroup}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              style={[styles.input, firstNameError ? styles.inputError : null]}
              value={firstName}
              onChangeText={handleFirstChange}
              placeholder="First name"
              placeholderTextColor="#666"
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              editable={!isLoading}
              maxLength={50}
            />
            {firstNameError && (
              <Text style={styles.errorText}>{firstNameError}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Last name</Text>
            <TextInput
              style={[styles.input, lastNameError ? styles.inputError : null]}
              value={lastName}
              onChangeText={handleLastChange}
              placeholder="Last name"
              placeholderTextColor="#666"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isLoading}
              maxLength={50}
            />
            {lastNameError && (
              <Text style={styles.errorText}>{lastNameError}</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Back"
          variant="ghost"
          onPress={onBack}
          disabled={!canGoBack || isLoading}
          fullWidth
        />
        <Button
          title="Continue"
          onPress={handleContinue}
          loading={isLoading}
          disabled={disableContinue}
          variant="primary"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
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
    marginBottom: 32,
    lineHeight: 22,
  },
  inputGroup: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
  },
  footer: {
    gap: 12,
  },
});
