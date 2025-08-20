import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Form,
  FormField,
  Input,
  Select,
  Button,
  Card,
  useFormContext,
} from '../../components/ui';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuthStore } from '../../stores';
import { useErrorHandler } from '../../hooks';
import { groupCreationService } from '../../services/groupCreation';
import type { CreateGroupData } from '../../services/admin';
import { LocationPicker } from '../../components/groups/LocationPicker';

const MEETING_DAYS = [
  { label: 'Sunday', value: 'sunday' },
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
];

export default function CreateGroupPage() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const { handleError } = useErrorHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [locationValue, setLocationValue] = useState<{
    address?: string;
    coordinates?: { latitude: number; longitude: number } | null;
  }>({});

  const formConfig = {
    title: {
      rules: { required: true, minLength: 3, maxLength: 100 },
      initialValue: '',
    },
    description: {
      rules: { required: true, minLength: 10, maxLength: 500 },
      initialValue: '',
    },
    meeting_day: {
      rules: { required: true },
      initialValue: '',
    },
    meeting_time: {
      rules: { required: true },
      initialValue: '',
    },
  } as const;

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleSubmit = async (values: Record<string, any>) => {
    if (
      !userProfile?.id ||
      !userProfile?.church_id ||
      !userProfile?.service_id
    ) {
      Alert.alert(
        'Error',
        'Please complete your profile before creating a group.'
      );
      return;
    }

    if (!locationValue.address && !locationValue.coordinates) {
      Alert.alert(
        'Location Required',
        'Please choose a location on the map or search for one.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const groupData: CreateGroupData = {
        title: String(values.title).trim(),
        description: String(values.description).trim(),
        meeting_day: String(values.meeting_day),
        meeting_time: String(values.meeting_time),
        location: {
          address: locationValue.address || 'Pinned Location',
          ...(locationValue.coordinates && {
            coordinates: locationValue.coordinates,
          }),
        },
        service_id: userProfile.service_id,
        church_id: userProfile.church_id,
      };

      const result = await groupCreationService.createGroupRequest(
        groupData,
        userProfile.id
      );
      if (result.error) throw result.error;

      Alert.alert(
        'Group Request Submitted! 🎉',
        'Your group creation request has been submitted for approval by your church admin. You will be notified once it has been reviewed.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      const err = error as Error;
      // Friendlier message for RLS errors
      if (err.message && /RLS policy violation/i.test(err.message)) {
        Alert.alert(
          'Permission Required',
          'You do not have permission to create a group in this church. Please ensure you are signed in and your profile is connected to this church. If the issue persists, contact a church admin.'
        );
      }
      handleError(err, {
        context: { action: 'create_group', userId: userProfile.id },
        showAlert: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Create New Group</Text>
      <Text style={styles.pageSubtitle}>
        Share the key details and set your meeting location on the map.
      </Text>

      <Form config={formConfig} onSubmit={handleSubmit}>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
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
              />
            )}
          </FormField>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Meeting Schedule</Text>
          <FormField name="meeting_day">
            {({ value, error, onChange }) => (
              <Select
                label="Meeting Day"
                options={MEETING_DAYS}
                value={value}
                onSelect={(opt) => onChange(opt.value)}
                error={error}
                placeholder="Select a day of the week"
              />
            )}
          </FormField>
          <FormField name="meeting_time">
            {({ value, error, onChange }) => (
              <View>
                <Text style={styles.inputLabel}>Meeting Time *</Text>
                <TouchableOpacity
                  style={[
                    styles.timePickerButton,
                    error && styles.timePickerButtonError,
                  ]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text
                    style={[
                      styles.timePickerText,
                      !value && styles.timePickerPlaceholder,
                    ]}
                  >
                    {value || 'Select meeting time'}
                  </Text>
                </TouchableOpacity>
                {error && <Text style={styles.errorText}>{error}</Text>}
                {showTimePicker && (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={(event, date) => {
                      if (Platform.OS !== 'ios') setShowTimePicker(false);
                      if (date) {
                        setSelectedTime(date);
                        onChange(formatTime(date));
                      }
                    }}
                  />
                )}
              </View>
            )}
          </FormField>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Meeting Location</Text>
          <LocationPicker
            value={{
              address: locationValue.address,
              coordinates: locationValue.coordinates || undefined,
            }}
            onChange={setLocationValue}
          />
        </Card>

        <SubmitButton
          isSubmitting={isSubmitting}
          onValidatedSubmit={handleSubmit}
        />
      </Form>
    </ScrollView>
  );
}

const SubmitButton: React.FC<{
  isSubmitting: boolean;
  onValidatedSubmit: (values: Record<string, any>) => void;
}> = ({ isSubmitting, onValidatedSubmit }) => {
  const { validateForm, values } = useFormContext();
  const handlePress = () => {
    const ok = validateForm();
    if (!ok) return;
    onValidatedSubmit(values);
  };
  return (
    <Button
      title={isSubmitting ? 'Submitting…' : 'Submit Request'}
      onPress={handlePress}
      variant="primary"
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#f8f9fa',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  timePickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  timePickerButtonError: {
    borderColor: '#ff3b30',
  },
  timePickerText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  timePickerPlaceholder: {
    color: '#999',
  },
  errorText: {
    fontSize: 14,
    color: '#ff3b30',
    marginTop: 4,
  },
});
