import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Keyboard, Platform, TouchableWithoutFeedback } from 'react-native';
import type { OnboardingStepProps } from '@/types/app';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { AuthButton } from '@/components/auth/AuthButton';
import { AuthHero } from '@/components/auth/AuthHero';

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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    setFirstName(data.first_name || '');
    setLastName(data.last_name || '');
  }, [data.first_name, data.last_name]);

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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={[
          styles.content,
          isKeyboardVisible && styles.contentKeyboardVisible
        ]}>
        {!isKeyboardVisible && (
          <AuthHero
            title="What's your name?"
            subtitle="Share your first and last name so your church community can recognize you."
            containerStyle={styles.heroSpacing}
          />
        )}
        {isKeyboardVisible && (
          <View style={styles.keyboardHeader}>
            <Text variant="h4" weight="black" align="center" style={styles.title}>
              What's your name?
            </Text>
            <Text variant="bodyLarge" color="secondary" align="center" style={styles.subtitle}>
              Share your first and last name so your church community can recognize you.
            </Text>
          </View>
        )}

        <View style={[
          styles.inputGroup
        ]}>
          <Input
            label="First name"
              value={firstName}
              onChangeText={handleFirstChange}
              placeholder="First name"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isLoading}
              maxLength={50}
            error={firstNameError || undefined}
            containerStyle={styles.inputContainer}
          />

          <Input
            label="Last name"
              value={lastName}
              onChangeText={handleLastChange}
              placeholder="Last name"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isLoading}
              maxLength={50}
            error={lastNameError || undefined}
            containerStyle={styles.inputContainer}
          />
        </View>

        {isKeyboardVisible && (
          <View style={styles.keyboardFooter}>
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
        )}
      </View>

      {!isKeyboardVisible && (
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
      )}
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
  },
  contentKeyboardVisible: {
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  heroSpacing: {
    marginBottom: 32,
  },
  keyboardHeader: {
    marginBottom: 24,
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
    marginBottom: 12,
  },
  inputGroup: {
    gap: 24,
    marginBottom: 24,
  },
  keyboardFooter: {
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
  },
  inputContainer: {
    marginBottom: 0,
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
