import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
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
        <View
          style={[
            styles.content,
            isKeyboardVisible && styles.contentKeyboardVisible,
          ]}
        >
          {!isKeyboardVisible && (
            <View style={styles.header}>
              <Text variant="h4" weight="extraBold" align="center" style={styles.title}>
                What's your name?
              </Text>
              <Text
                variant="bodyLarge"
                color="primary"
                align="center"
                style={styles.subtitle}
              >
                Share your first and last name so your church community can recognize you.
              </Text>
            </View>
          )}
          {isKeyboardVisible && (
            <View style={styles.keyboardHeader}>
              <Text variant="h4" weight="extraBold" align="center" style={styles.title}>
                What's your name?
              </Text>
              <Text
                variant="bodyLarge"
                color="primary"
                align="center"
                style={styles.subtitle}
              >
                Share your first and last name so your church community can recognize you.
              </Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <View style={styles.inputWrapper}>
              <Text variant="labelSmall" color="primary" style={styles.label}>
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
                editable={!isLoading}
                maxLength={50}
              />
              {firstNameError && (
                <Text variant="bodySmall" color="error" style={styles.errorText}>
                  {firstNameError}
                </Text>
              )}
            </View>

            <View style={styles.inputWrapper}>
              <Text variant="labelSmall" color="primary" style={styles.label}>
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
              onPress={handleContinue}
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
    justifyContent: 'center',
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
    marginBottom: 20, // Spacing to subtitle (160px to 220px = 60px, minus 40px line height = 20px)
  },
  subtitle: {
    color: '#2C2235',
    fontSize: 16, // Figma: 16px
    lineHeight: 22, // Figma: 22px
    letterSpacing: -0.32, // Figma: -0.32px
    maxWidth: 326, // Figma: 326px
    marginTop: 0,
  },
  inputGroup: {
    gap: 19, // Figma: Last name label (413px) - First input bottom (344px + 50px = 394px) = 19px
    marginBottom: 24,
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
    paddingVertical: 0, // Use height instead of padding
    paddingHorizontal: 14, // 67px - 53px = 14px from Figma
    fontSize: 18, // Figma: 18px (input text, not placeholder)
    lineHeight: 24, // Figma: 24px
    letterSpacing: -0.36, // Figma: -0.36px
    backgroundColor: '#FFFFFF',
    color: '#2C2235',
    textAlignVertical: 'center', // Center text vertically in the 50px height
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
    marginBottom: 95, // Match welcome page actions marginBottom
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
