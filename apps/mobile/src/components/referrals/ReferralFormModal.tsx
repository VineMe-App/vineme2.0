import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Modal } from '../ui/Modal';
import { Form, FormField, FormConfig, useFormContext } from '../ui/Form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Select, SelectOption } from '../ui/Select';
import { Theme } from '../../utils/theme';
import { validateReferralForm } from '../../utils/referralValidation';

export interface ReferralFormModalData {
  email: string;
  phone: string;
  note: string;
  firstName?: string;
  lastName?: string;
}

interface FormError {
  title: string;
  message: string;
  suggestions?: string[];
  retryable: boolean;
}

interface ReferralFormModalProps {
  visible: boolean;
  onClose: () => void;
  groupId?: string; // Optional for group-specific referrals
  onSubmit: (data: ReferralFormModalData) => Promise<void>;
  groupName?: string; // For display purposes in group referrals
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Country options for the dropdown
const COUNTRY_OPTIONS: SelectOption[] = [
  { label: '🇬🇧 United Kingdom (+44)', value: '+44' },
  { label: '🇺🇸 United States (+1)', value: '+1' },
  { label: '🇦🇺 Australia (+61)', value: '+61' },
  { label: '🇳🇿 New Zealand (+64)', value: '+64' },
  { label: '🇨🇦 Canada (+1)', value: '+1' },
  { label: '🇩🇪 Germany (+49)', value: '+49' },
  { label: '🇫🇷 France (+33)', value: '+33' },
  { label: '🇪🇸 Spain (+34)', value: '+34' },
  { label: '🇮🇹 Italy (+39)', value: '+39' },
  { label: '🇮🇳 India (+91)', value: '+91' },
  { label: '🇸🇬 Singapore (+65)', value: '+65' },
  { label: '🇿🇦 South Africa (+27)', value: '+27' },
  { label: '🇧🇷 Brazil (+55)', value: '+55' },
  { label: '🇳🇬 Nigeria (+234)', value: '+234' },
  { label: '🇵🇭 Philippines (+63)', value: '+63' },
  { label: '🇵🇰 Pakistan (+92)', value: '+92' },
];

export const ReferralFormModal: React.FC<ReferralFormModalProps> = ({
  visible,
  onClose,
  groupId,
  onSubmit,
  groupName,
}) => {
  const isGroupReferral = !!groupId;
  const [formError, setFormError] = useState<FormError | null>(null);
  const [warnings, setWarnings] = useState<Record<string, string>>({});

  // Form configuration with validation rules
  const formConfig: FormConfig = {
    firstName: {
      initialValue: '',
      rules: {
        required: true,
        custom: (value: string) => {
          const trimmed = value?.trim() || '';
          if (!trimmed) return 'First name is required';
          if (trimmed.length > 50) {
            return 'First name must be 50 characters or less';
          }
          if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmed)) {
            return 'First name contains invalid characters';
          }
          return undefined;
        },
      },
    },
    lastName: {
      initialValue: '',
      rules: {
        required: true,
        custom: (value: string) => {
          const trimmed = value?.trim() || '';
          if (!trimmed) return 'Last name is required';
          if (trimmed.length > 50) {
            return 'Last name must be 50 characters or less';
          }
          if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmed)) {
            return 'Last name contains invalid characters';
          }
          return undefined;
        },
      },
    },
    email: {
      initialValue: '',
      rules: {
        required: true,
        pattern: EMAIL_REGEX,
        custom: (value: string) => {
          if (!value) return 'Email address is required';

          const validation = validateReferralForm({
            email: value,
            phone: '',
            note: '',
          });

          return validation.errors.email || undefined;
        },
      },
    },
    countryCode: {
      initialValue: '+44',
      rules: {
        required: true,
      },
    },
    localNumber: {
      initialValue: '',
      rules: {
        required: true,
        custom: (value: string) => {
          if (!value) return 'Phone number is required';

          // Basic validation - just check if it's a reasonable length
          const digitsOnly = value.replace(/\D/g, '');
          if (digitsOnly.length < 7) {
            return 'Phone number must be at least 7 digits';
          } else if (digitsOnly.length > 15) {
            return 'Phone number must be no more than 15 digits';
          }

          return undefined;
        },
      },
    },
    note: {
      initialValue: '',
      rules: {
        maxLength: 500,
      },
    },
  };

  const handleSubmit = useCallback(
    async (values: any) => {
      try {
        // Clear previous errors and warnings
        setFormError(null);
        setWarnings({});

        const trimmedFirst = values.firstName?.trim() || '';
        const trimmedLast = values.lastName?.trim() || '';

        const formData: ReferralFormModalData = {
          email: values.email.trim(),
          phone: `${values.countryCode}${values.localNumber.replace(/\D/g, '')}`,
          note: values.note.trim(),
          firstName: trimmedFirst,
          lastName: trimmedLast,
        };

        // Client-side validation
        const validation = validateReferralForm(formData);

        if (!validation.isValid) {
          const firstError = Object.entries(validation.errors)[0];
          setFormError({
            title: 'Invalid Information',
            message: firstError[1],
            retryable: true,
            suggestions: [
              'Please check the highlighted fields and correct any errors',
              'Make sure the email address is valid and spelled correctly',
              'Ensure the phone number includes area code',
            ],
          });
          return;
        }

        // Set warnings if any
        if (validation.warnings) {
          setWarnings(validation.warnings);
        }

        await onSubmit(formData);
        onClose();
      } catch (error: any) {
        console.error('Error submitting referral:', error);

        // Handle different types of errors
        if (error.errorDetails) {
          setFormError({
            title:
              error.errorDetails.type === 'rate_limit'
                ? 'Too Many Referrals'
                : error.errorDetails.type === 'duplicate'
                  ? 'Already Referred'
                  : error.errorDetails.type === 'validation'
                    ? 'Invalid Information'
                    : error.errorDetails.type === 'network'
                      ? 'Connection Problem'
                      : 'Referral Failed',
            message: error.errorDetails.message,
            retryable: error.errorDetails.retryable,
            suggestions: error.errorDetails.suggestions,
          });
        } else {
          setFormError({
            title: 'Referral Failed',
            message:
              error.message ||
              'There was an error submitting the referral. Please try again.',
            retryable: true,
            suggestions: [
              'Please try again in a few moments',
              'Check that all information is correct',
              'Contact support if the problem continues',
            ],
          });
        }
      }
    },
    [onSubmit, onClose]
  );

  const getTitle = () => {
    if (isGroupReferral && groupName) {
      return `Refer a friend to ${groupName}`;
    }
    return isGroupReferral
      ? 'Refer a friend to group'
      : 'Refer someone to VineMe';
  };

  const getDescription = () => {
    if (isGroupReferral) {
      return "Help someone join this group by providing their contact information. They'll receive an email to set up their account and can then join the group.";
    }
    return "Help someone join the VineMe community. They'll receive an email to set up their account and can explore groups that fit their interests.";
  };

  return (
    <Modal
      isVisible={visible}
      onClose={onClose}
      title={getTitle()}
      size="medium"
      scrollable
      avoidKeyboard
      testID="referral-form-modal"
    >
      <View style={styles.container}>
        <Text style={styles.description}>{getDescription()}</Text>

        {formError && (
          <View style={styles.errorContainer}>
            <ErrorMessage
              error={formError.message}
              onRetry={
                formError.retryable ? () => setFormError(null) : undefined
              }
            />
          </View>
        )}

        {Object.keys(warnings).length > 0 && (
          <View style={styles.warningContainer}>
            {Object.entries(warnings).map(([field, warning]) => (
              <Text key={field} style={styles.warningText}>
                ⚠️ {warning}
              </Text>
            ))}
          </View>
        )}

        <Form config={formConfig} onSubmit={handleSubmit}>
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <FormField name="firstName">
                {({ value, error, onChange, onBlur }) => (
                  <Input
                    label="First Name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={error}
                    placeholder="Enter first name"
                    autoCapitalize="words"
                    required
                    testID="referral-first-name-input"
                  />
                )}
              </FormField>
            </View>

            <View style={styles.nameField}>
              <FormField name="lastName">
                {({ value, error, onChange, onBlur }) => (
                  <Input
                    label="Last Name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={error}
                    placeholder="Enter last name"
                    autoCapitalize="words"
                    required
                    testID="referral-last-name-input"
                  />
                )}
              </FormField>
            </View>
          </View>

          <FormField name="email">
            {({ value, error, onChange, onBlur }) => (
              <Input
                label="Email Address"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={error}
                placeholder="their.email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                required
                testID="referral-email-input"
              />
            )}
          </FormField>

          <FormField name="countryCode">
            {({ value, onChange }) => (
              <Select
                options={COUNTRY_OPTIONS}
                value={value}
                onSelect={(option) => onChange(option.value)}
                label="Country"
                variant="dropdown"
                testID="referral-country-select"
              />
            )}
          </FormField>

          <FormField name="localNumber">
            {({ value, error, onChange, onBlur }) => (
              <View style={styles.phoneInputContainer}>
                <Text style={styles.phoneLabel}>Phone Number</Text>
                <TextInput
                  value={value}
                  onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
                  onBlur={onBlur}
                  style={[
                    styles.phoneInput,
                    error ? styles.phoneInputError : null,
                  ]}
                  keyboardType="phone-pad"
                  placeholder="7123456789"
                  autoCapitalize="none"
                  testID="referral-phone-input"
                />
                {error && <Text style={styles.phoneErrorText}>{error}</Text>}
              </View>
            )}
          </FormField>

          <FormField name="note">
            {({ value, error, onChange, onBlur }) => (
              <Input
                label="Note (Optional)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={error}
                placeholder="Why do you think they'd be a good fit? Any context that would help..."
                multiline
                numberOfLines={4}
                helperText={`${value.length}/500 characters`}
                testID="referral-note-input"
              />
            )}
          </FormField>

          <FormSubmitButton onCancel={onClose} />
        </Form>
      </View>
    </Modal>
  );
};

// Separate component to access form context for submit button
interface FormSubmitButtonProps {
  onCancel: () => void;
}

const FormSubmitButton: React.FC<FormSubmitButtonProps> = ({ onCancel }) => {
  const { validateForm, isSubmitting } = useFormContext();

  const handleSubmit = useCallback(() => {
    validateForm();
  }, [validateForm]);

  return (
    <View style={styles.buttonContainer}>
      <Button
        title="Cancel"
        onPress={onCancel}
        variant="outline"
        style={styles.cancelButton}
        disabled={isSubmitting}
        testID="referral-cancel-button"
      />

      <Button
        title="Send Referral"
        onPress={handleSubmit}
        variant="primary"
        style={styles.submitButton}
        loading={isSubmitting}
        testID="referral-submit-button"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  description: {
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: Theme.spacing.lg,
  },
  errorContainer: {
    marginBottom: Theme.spacing.lg,
  },
  warningContainer: {
    backgroundColor: Theme.colors.warning + '20',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.warning,
  },
  warningText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.warning,
    lineHeight: 20,
  },
  nameRow: {
    flexDirection: 'row',
    gap: Theme.spacing.base,
  },
  nameField: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.base,
    marginTop: Theme.spacing.lg,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
  phoneInputContainer: {
    marginBottom: Theme.spacing.md,
  },
  phoneLabel: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.base,
    paddingHorizontal: Theme.spacing.base,
    paddingVertical: Theme.spacing.sm,
    fontSize: Theme.typography.fontSize.base,
    backgroundColor: Theme.colors.surface,
    color: Theme.colors.textPrimary,
  },
  phoneInputError: {
    borderColor: Theme.colors.error,
  },
  phoneErrorText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.error,
    marginTop: Theme.spacing.xs,
  },
});
