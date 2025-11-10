import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import type { OnboardingStepProps } from '@/types/app';
import { Text } from '@/components/ui/Text';
import { AuthButton } from '@/components/auth/AuthButton';

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
        <Text variant="h3" weight="black" align="center" style={styles.title}>
          What’s your name?
        </Text>
        <Text variant="bodyLarge" color="secondary" align="center" style={styles.subtitle}>
          Share your first and last name so your church community can recognize you.
        </Text>

        <View style={styles.inputGroup}>
          <View style={styles.inputContainer}>
            <Text variant="labelSmall" color="secondary" style={styles.label}>
              First name
            </Text>
            <TextInput
              style={[styles.input, firstNameError ? styles.inputError : null]}
              value={firstName}
              onChangeText={handleFirstChange}
              placeholder="First name"
              placeholderTextColor="#B4B4B4"
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              editable={!isLoading}
              maxLength={50}
            />
            {firstNameError && (
              <Text variant="bodySmall" color="error" style={styles.errorText}>
                {firstNameError}
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text variant="labelSmall" color="secondary" style={styles.label}>
              Last name
            </Text>
            <TextInput
              style={[styles.input, lastNameError ? styles.inputError : null]}
              value={lastName}
              onChangeText={handleLastChange}
              placeholder="Last name"
              placeholderTextColor="#B4B4B4"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isLoading}
              maxLength={50}
            />
            {lastNameError && (
              <Text variant="bodySmall" color="error" style={styles.errorText}>
                {lastNameError}
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerSpacer} />
        <AuthButton
          title="Next"
          onPress={handleContinue}
          loading={isLoading}
          disabled={disableContinue}
        />
        <TouchableOpacity
          onPress={onBack}
          accessibilityRole="button"
          style={styles.backButton}
        >
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
  title: {
    color: '#2C2235',
    marginBottom: 12,
  },
  subtitle: {
    color: '#2C2235',
    marginBottom: 32,
    lineHeight: 24,
  },
  inputGroup: {
    gap: 24,
  },
  inputContainer: {
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
  backButton: {
    marginTop: 16,
  },
});
