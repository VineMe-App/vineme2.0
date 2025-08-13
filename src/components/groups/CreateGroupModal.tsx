import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Modal, Form, FormField, Input, Select, Button } from '../ui';
import { useFormContext } from '../ui/Form';
import { groupCreationService } from '../../services/groupCreation';
import { useAuthStore } from '../../stores/auth';
import { useErrorHandler } from '../../hooks';
import type { CreateGroupData } from '../../services/admin';
import type { SelectOption } from '../ui/Select';

interface CreateGroupModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface GroupFormData {
  title: string;
  description: string;
  meeting_day: string;
  meeting_time: string;
  location: string;
}

const MEETING_DAYS: SelectOption[] = [
  { label: 'Sunday', value: 'sunday' },
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isVisible,
  onClose,
  onSuccess,
}) => {
  const { userProfile } = useAuthStore();
  const { handleError } = useErrorHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formConfig = {
    title: {
      rules: {
        required: true,
        minLength: 3,
        maxLength: 100,
      },
      initialValue: '',
    },
    description: {
      rules: {
        required: true,
        minLength: 10,
        maxLength: 500,
      },
      initialValue: '',
    },
    meeting_day: {
      rules: {
        required: true,
      },
      initialValue: '',
    },
    meeting_time: {
      rules: {
        required: true,
        pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
      initialValue: '',
    },
    location: {
      rules: {
        required: true,
        minLength: 5,
        maxLength: 200,
      },
      initialValue: '',
    },
  };

  const handleSubmit = async (values: GroupFormData) => {
    if (!userProfile?.id || !userProfile?.church_id || !userProfile?.service_id) {
      Alert.alert('Error', 'Please complete your profile before creating a group.');
      return;
    }

    setIsSubmitting(true);

    try {
      const groupData: CreateGroupData = {
        title: values.title.trim(),
        description: values.description.trim(),
        meeting_day: values.meeting_day,
        meeting_time: values.meeting_time,
        location: {
          address: values.location.trim(),
          // TODO: Add geocoding for coordinates
        },
        service_id: userProfile.service_id,
        church_id: userProfile.church_id,
      };

      const result = await groupCreationService.createGroupRequest(
        groupData,
        userProfile.id
      );

      if (result.error) {
        throw result.error;
      }

      Alert.alert(
        'Group Request Submitted',
        'Your group creation request has been submitted for approval by your church admin. You will be notified once it has been reviewed.',
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              onSuccess?.();
            },
          },
        ]
      );
    } catch (error) {
      handleError(error as Error, {
        context: { action: 'create_group', userId: userProfile.id },
        showAlert: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Modal
      isVisible={isVisible}
      onClose={handleClose}
      title="Create New Group"
      size="large"
      scrollable
      closeOnOverlayPress={!isSubmitting}
      showCloseButton={!isSubmitting}
    >
      <Form config={formConfig} onSubmit={handleSubmit}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.description}>
            Create a new Bible study group for your church community. Your request will be reviewed by a church admin before the group becomes active.
          </Text>

          <FormField name="title">
            {({ value, error, onChange, onBlur }) => (
              <Input
                label="Group Title"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={error}
                placeholder="e.g., Young Adults Bible Study"
                required
                editable={!isSubmitting}
              />
            )}
          </FormField>

          <FormField name="description">
            {({ value, error, onChange, onBlur }) => (
              <Input
                label="Description"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={error}
                placeholder="Describe your group's purpose, target audience, and what to expect..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                required
                editable={!isSubmitting}
              />
            )}
          </FormField>

          <FormField name="meeting_day">
            {({ value, error, onChange }) => (
              <Select
                label="Meeting Day"
                options={MEETING_DAYS}
                value={value}
                onSelect={(option) => onChange(option.value)}
                error={error}
                placeholder="Select a day of the week"
                disabled={isSubmitting}
              />
            )}
          </FormField>

          <FormField name="meeting_time">
            {({ value, error, onChange, onBlur }) => (
              <Input
                label="Meeting Time"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={error}
                placeholder="e.g., 19:00 (24-hour format)"
                helperText="Use 24-hour format (e.g., 19:00 for 7:00 PM)"
                required
                editable={!isSubmitting}
              />
            )}
          </FormField>

          <FormField name="location">
            {({ value, error, onChange, onBlur }) => (
              <Input
                label="Meeting Location"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={error}
                placeholder="e.g., Church Room 101, or 123 Main St, City"
                required
                editable={!isSubmitting}
              />
            )}
          </FormField>

          <View style={styles.buttonContainer}>
            <Button
              title="Cancel"
              onPress={handleClose}
              variant="secondary"
              disabled={isSubmitting}
              style={styles.cancelButton}
            />
            <SubmitButton isSubmitting={isSubmitting} />
          </View>
        </ScrollView>
      </Form>
    </Modal>
  );
};

const styles = StyleSheet.create({
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

// Submit button component that uses form context
const SubmitButton: React.FC<{ isSubmitting: boolean }> = ({ isSubmitting }) => {
  const { validateForm, values } = useFormContext();

  const handleSubmit = () => {
    validateForm();
  };

  return (
    <Button
      title="Submit Request"
      onPress={handleSubmit}
      variant="primary"
      loading={isSubmitting}
      style={styles.submitButton}
    />
  );
};