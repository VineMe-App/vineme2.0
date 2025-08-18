import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Modal } from '../ui/Modal';
import { Form, FormField, FormConfig, useFormContext } from '../ui/Form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Theme } from '../../utils/theme';

export interface ReferralFormData {
  email: string;
  phone: string;
  note: string;
  firstName?: string;
  lastName?: string;
}

interface ReferralFormModalProps {
  visible: boolean;
  onClose: () => void;
  groupId?: string; // Optional for group-specific referrals
  onSubmit: (data: ReferralFormData) => Promise<void>;
  groupName?: string; // For display purposes in group referrals
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ReferralFormModal: React.FC<ReferralFormModalProps> = ({
  visible,
  onClose,
  groupId,
  onSubmit,
  groupName,
}) => {
  const isGroupReferral = !!groupId;

  // Form configuration with validation rules
  const formConfig: FormConfig = {
    firstName: {
      initialValue: '',
      rules: {
        maxLength: 50,
      },
    },
    lastName: {
      initialValue: '',
      rules: {
        maxLength: 50,
      },
    },
    email: {
      initialValue: '',
      rules: {
        required: true,
        pattern: EMAIL_REGEX,
        custom: (value: string) => {
          if (value && !EMAIL_REGEX.test(value)) {
            return 'Please enter a valid email address';
          }
          return undefined;
        },
      },
    },
    phone: {
      initialValue: '',
      rules: {
        required: true,
        custom: (value: string) => {
          if (!value) return 'Phone number is required';

          // Remove all non-digit characters for validation
          const cleanPhone = value.replace(/\D/g, '');

          if (cleanPhone.length < 10) {
            return 'Phone number must be at least 10 digits';
          }

          if (cleanPhone.length > 15) {
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
        const formData: ReferralFormData = {
          email: values.email.trim(),
          phone: values.phone.trim(),
          note: values.note.trim(),
          firstName: values.firstName?.trim() || undefined,
          lastName: values.lastName?.trim() || undefined,
        };

        await onSubmit(formData);
        onClose();
      } catch (error) {
        console.error('Error submitting referral:', error);
        Alert.alert(
          'Error',
          'There was an error submitting the referral. Please try again.',
          [{ text: 'OK' }]
        );
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
                    placeholder="Optional"
                    autoCapitalize="words"
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
                    placeholder="Optional"
                    autoCapitalize="words"
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

          <FormField name="phone">
            {({ value, error, onChange, onBlur }) => (
              <Input
                label="Phone Number"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={error}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
                required
                testID="referral-phone-input"
              />
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
                style={styles.noteInput}
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
  nameRow: {
    flexDirection: 'row',
    gap: Theme.spacing.base,
  },
  nameField: {
    flex: 1,
  },
  noteInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: Theme.spacing.md,
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
});
