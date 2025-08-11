import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { OnboardingStepProps } from '@/types/app';

export default function NameStep({
  data,
  onNext,
  isLoading,
}: OnboardingStepProps) {
  const [name, setName] = useState(data.name || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(data.name || '');
  }, [data.name]);

  const validateName = (value: string): string | null => {
    if (!value.trim()) {
      return 'Name is required';
    }
    if (value.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    if (value.trim().length > 50) {
      return 'Name must be less than 50 characters';
    }
    return null;
  };

  const handleNext = () => {
    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onNext({ name: name.trim() });
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (error) {
      setError(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>What's your name?</Text>
        <Text style={styles.subtitle}>
          This will help your church community recognize you
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={name}
            onChangeText={handleNameChange}
            placeholder="Enter your full name"
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            editable={!isLoading}
            maxLength={50}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          (!name.trim() || isLoading) && styles.buttonDisabled,
        ]}
        onPress={handleNext}
        disabled={!name.trim() || isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Please wait...' : 'Continue'}
        </Text>
      </TouchableOpacity>
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
    marginBottom: 48,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    backgroundColor: '#f9f9f9',
    textAlign: 'center',
  },
  inputError: {
    borderColor: '#ff4444',
  },
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
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
