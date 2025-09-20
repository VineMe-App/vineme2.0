import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Form,
  FormField,
  Input,
  Select,
  Button,
  Card,
  useFormContext,
  Checkbox,
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

const formatTime = (date: Date): string =>
  date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const formatTimeForDatabase = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

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
  const [locationSafetyConfirmed, setLocationSafetyConfirmed] = useState(false);

  useEffect(() => {
    setLocationSafetyConfirmed(false);
  }, [
    locationValue?.coordinates?.latitude,
    locationValue?.coordinates?.longitude,
    locationValue?.address,
  ]);

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

    if (!locationSafetyConfirmed) {
      Alert.alert(
        'Safety Check Required',
        'Please confirm that the selected location is not set to your exact home address.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const groupData: CreateGroupData = {
        title: String(values.title).trim(),
        description: String(values.description).trim(),
        meeting_day: String(values.meeting_day),
        meeting_time: formatTimeForDatabase(selectedTime),
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
        if (__DEV__) console.warn('[CreateGroup] RLS policy violation', err);
        return;
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
    <>
      <Stack.Screen options={{ title: 'Create New Group' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Form config={formConfig} onSubmit={handleSubmit}>
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <FormField name="title">
              {({ value, error, onChange, onBlur }) => (
                <Input
                  label="Group Name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={error}
                  placeholder="e.g. Hammersmith Connect"
                  inputStyle={styles.textInput}
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
                  placeholder="What can people expect from your group?"
                  inputStyle={[styles.textInput, styles.textAreaInput]}
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
                <View>
                  <Text style={styles.inputLabel}>
                    Meeting Day
                    <Text style={styles.requiredAsterisk}> *</Text>
                  </Text>
                  <Select
                    options={MEETING_DAYS}
                    value={value}
                    onSelect={(opt) => onChange(opt.value)}
                    error={error}
                    placeholder="Select a day of the week"
                    variant="dropdown"
                  />
                </View>
              )}
            </FormField>
            <FormField name="meeting_time">
              {({ value, error, onChange }) => (
                <View>
                  <Text style={styles.inputLabel}>
                    Meeting Time
                    <Text style={styles.requiredAsterisk}> *</Text>
                  </Text>
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
            <Text style={styles.sectionSubtitle}>
              Search for a location, or pinch and drag the map to move the pin
            </Text>
            <LocationPicker
              value={{
                address: locationValue.address,
                coordinates: locationValue.coordinates || undefined,
              }}
              onChange={setLocationValue}
            />
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Safety Reminder</Text>
              <Text style={styles.warningCopy}>
                For safeguarding purposes, please avoid placing the pin directly on your home address.
              </Text>
              <Checkbox
                checked={locationSafetyConfirmed}
                label="I confirm this location is not my exact home address"
                onPress={() => setLocationSafetyConfirmed((prev) => !prev)}
              />
            </View>
          </Card>

          <SubmitButton
            isSubmitting={isSubmitting}
            onValidatedSubmit={handleSubmit}
          />
          <Text style={styles.submitHint}>
            All groups on VineMe are verified before they're live. Submit
            request and your clergy will approve your group.
          </Text>
        </Form>
      </ScrollView>
    </>
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
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#4a4a4a',
    marginTop: -4,
    marginBottom: 12,
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
  textInput: {
    paddingHorizontal: 12,
  },
  textAreaInput: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  warningBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff7e6',
    borderWidth: 1,
    borderColor: '#ffd591',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b36b00',
    marginBottom: 8,
  },
  warningCopy: {
    fontSize: 13,
    color: '#8c5400',
    marginBottom: 12,
  },
  submitHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
  },
  requiredAsterisk: {
    color: '#ff3b30',
  },
});
