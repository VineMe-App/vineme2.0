import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import {
  Form,
  FormField,
  Input,
  Select,
  Card,
  Button,
  useFormContext,
  Checkbox,
} from '../ui';
import { LocationPicker } from './LocationPicker';

const MEETING_DAYS = [
  { label: 'Sunday', value: 'sunday' },
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
];

export interface GroupEditorLocation {
  address?: string;
  coordinates?: { latitude: number; longitude: number } | null;
}

export interface GroupEditorValues {
  title: string;
  description: string;
  meeting_day: string;
  meeting_time: string;
  location: GroupEditorLocation;
  whatsapp_link?: string | null;
  image_url?: string | null;
}

interface GroupEditorFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<GroupEditorValues>;
  onSubmit: (values: GroupEditorValues) => Promise<void>;
  onUploadImage?: (localUri: string) => Promise<string>;
  submitLabel?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
  headerTitle?: string;
  subTitle?: string;
}

type LocalImageState = {
  uri: string;
  uploaded: boolean;
} | null;

const defaultInitials: GroupEditorValues = {
  title: '',
  description: '',
  meeting_day: '',
  meeting_time: '',
  location: {},
  whatsapp_link: '',
  image_url: undefined,
};

const formatTime = (date: Date): string =>
  date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const parseTimeString = (value?: string): Date => {
  if (!value) return new Date();

  const trimmed = value.trim();
  const timeParts = trimmed.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i
  );
  if (timeParts) {
    let hour = parseInt(timeParts[1], 10);
    const minute = parseInt(timeParts[2], 10);
    const meridiem = timeParts[4]?.toUpperCase();
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;

    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date;
  }

  // Attempt to parse ISO-style HH:MM or HH:MM:SS
  const colonParts = trimmed.split(':');
  if (colonParts.length >= 2) {
    const hour = parseInt(colonParts[0], 10);
    const minute = parseInt(colonParts[1], 10);
    if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      return date;
    }
  }

  return new Date();
};

export const GroupEditorForm: React.FC<GroupEditorFormProps> = ({
  mode,
  initialValues,
  onSubmit,
  onUploadImage,
  submitLabel,
  onCancel,
  isSubmitting = false,
  headerTitle,
  subTitle,
}) => {
  const mergedInitials = useMemo(() => {
    const base = { ...defaultInitials, ...initialValues };
    const parsedTime = base.meeting_time
      ? formatTime(parseTimeString(base.meeting_time))
      : '';
    return {
      ...base,
      meeting_day: base.meeting_day ? base.meeting_day.toLowerCase() : '',
      meeting_time: parsedTime,
      whatsapp_link: base.whatsapp_link ?? '',
    } as GroupEditorValues;
  }, [initialValues]);

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date>(
    parseTimeString(initialValues?.meeting_time)
  );
  const [locationValue, setLocationValue] = useState<GroupEditorLocation>(
    mergedInitials.location || {}
  );
  const [locationSafetyConfirmed, setLocationSafetyConfirmed] = useState(false);
  const [imageState, setImageState] = useState<LocalImageState>(() =>
    mergedInitials.image_url
      ? {
          uri: mergedInitials.image_url,
          uploaded: true,
        }
      : null
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    setSelectedTime(parseTimeString(initialValues?.meeting_time));
    setLocationValue(initialValues?.location || {});
    setImageState(
      initialValues?.image_url
        ? {
            uri: initialValues.image_url,
            uploaded: true,
          }
        : null
    );
  }, [initialValues]);

  useEffect(() => {
    setLocationSafetyConfirmed(false);
  }, [
    locationValue?.coordinates?.latitude,
    locationValue?.coordinates?.longitude,
    locationValue?.address,
  ]);

  const formConfig = useMemo(
    () => ({
      title: {
        rules: { required: true, minLength: 3, maxLength: 100 },
        initialValue: mergedInitials.title,
      },
      description: {
        rules: { required: true, minLength: 10, maxLength: 500 },
        initialValue: mergedInitials.description,
      },
      meeting_day: {
        rules: { required: true },
        initialValue: mergedInitials.meeting_day,
      },
      meeting_time: {
        rules: { required: true },
        initialValue: mergedInitials.meeting_time,
      },
      whatsapp_link: {
        rules: {},
        initialValue: mergedInitials.whatsapp_link || '',
      },
    }),
    [mergedInitials]
  );

  const handlePickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please allow photo library access to select a group photo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        setImageState({ uri: result.assets[0].uri, uploaded: false });
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to select image'
      );
    }
  };

  const handleRemoveImage = () => {
    setImageState(null);
  };

  const handleValidatedSubmit = async (values: Record<string, any>) => {
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

    let imageUrl: string | null | undefined =
      initialValues?.image_url ?? undefined;

    if (imageState && !imageState.uploaded) {
      if (!onUploadImage) {
        Alert.alert(
          'Upload Not Supported',
          'Image uploads are not available right now.'
        );
        return;
      }
      try {
        setUploadingImage(true);
        imageUrl = await onUploadImage(imageState.uri);
        setImageState({ uri: imageUrl, uploaded: true });
      } catch (error) {
        Alert.alert(
          'Upload Failed',
          error instanceof Error
            ? error.message
            : 'Unable to upload group photo. Please try again.'
        );
        return;
      } finally {
        setUploadingImage(false);
      }
    } else if (!imageState && initialValues?.image_url) {
      imageUrl = null; // photo removed
    } else if (imageState && imageState.uploaded) {
      imageUrl = imageState.uri;
    }

    const payload: GroupEditorValues = {
      title: String(values.title).trim(),
      description: String(values.description).trim(),
      meeting_day: String(values.meeting_day),
      meeting_time: String(values.meeting_time),
      location: locationValue,
      whatsapp_link: values.whatsapp_link
        ? String(values.whatsapp_link).trim()
        : undefined,
      image_url: imageUrl === undefined ? undefined : imageUrl,
    };

    await onSubmit(payload);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {headerTitle && <Text style={styles.pageTitle}>{headerTitle}</Text>}
      {subTitle && <Text style={styles.pageSubtitle}>{subTitle}</Text>}

      <Form config={formConfig} onSubmit={handleValidatedSubmit}>
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
                inputStyle={StyleSheet.flatten([
                  styles.textInput,
                  styles.textAreaInput,
                ])}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                required
              />
            )}
          </FormField>
          <FormField name="whatsapp_link">
            {({ value, error, onChange, onBlur }) => (
              <Input
                label="WhatsApp Group Link"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={error}
                placeholder="Optional"
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
              Please avoid placing the pin directly on your home address for
              safety.
            </Text>
            <Checkbox
              checked={locationSafetyConfirmed}
              label="I confirm this location is not my exact home address"
              onPress={() => setLocationSafetyConfirmed((prev) => !prev)}
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Group Photo (Optional)</Text>
          {imageState ? (
            <View style={styles.imagePreviewWrapper}>
              <Image
                source={{ uri: imageState.uri }}
                style={styles.imagePreview}
              />
              <View style={styles.imageActions}>
                <Button
                  title="Change Photo"
                  onPress={handlePickImage}
                  variant="secondary"
                  disabled={uploadingImage || isSubmitting}
                />
                <Button
                  title="Remove Photo"
                  onPress={handleRemoveImage}
                  variant="error"
                  disabled={uploadingImage || isSubmitting}
                />
              </View>
            </View>
          ) : (
            <Button
              title="Upload Photo"
              onPress={handlePickImage}
              variant="secondary"
              disabled={uploadingImage || isSubmitting}
            />
          )}
          {uploadingImage && (
            <Text style={styles.uploadingText}>Uploading photo…</Text>
          )}
        </Card>

        <SubmitButton
          isSubmitting={isSubmitting || uploadingImage}
          submitLabel={
            submitLabel ||
            (mode === 'create' ? 'Submit Request' : 'Save Changes')
          }
          onValidatedSubmit={handleValidatedSubmit}
        />
        {mode === 'create' && (
          <Text style={styles.submitHint}>
            All groups on VineMe are verified before they're live. Submit
            request and your clergy will approve your group.
          </Text>
        )}

        {onCancel && (
          <Button
            title="Cancel"
            onPress={onCancel}
            variant="secondary"
            style={styles.cancelButton}
            disabled={isSubmitting || uploadingImage}
          />
        )}
      </Form>
    </ScrollView>
  );
};

const SubmitButton: React.FC<{
  isSubmitting: boolean;
  submitLabel: string;
  onValidatedSubmit: (values: Record<string, any>) => Promise<void>;
}> = ({ isSubmitting, submitLabel, onValidatedSubmit }) => {
  const { validateForm, values } = useFormContext();

  const handlePress = async () => {
    const ok = validateForm();
    if (!ok) return;
    await onValidatedSubmit(values);
  };

  return (
    <Button
      title={isSubmitting ? 'Submitting…' : submitLabel}
      onPress={handlePress}
      variant="primary"
      disabled={isSubmitting}
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
  imagePreviewWrapper: {
    alignItems: 'flex-start',
    gap: 12,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  imageActions: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadingText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  cancelButton: {
    marginTop: 12,
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
  requiredAsterisk: {
    color: '#ff3b30',
  },
  textInput: {
    paddingHorizontal: 12,
  },
  textAreaInput: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  submitHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
  },
});

export default GroupEditorForm;
