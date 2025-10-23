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
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
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
  { label: 'Sunday', value: 'Sunday' },
  { label: 'Monday', value: 'Monday' },
  { label: 'Tuesday', value: 'Tuesday' },
  { label: 'Wednesday', value: 'Wednesday' },
  { label: 'Thursday', value: 'Thursday' },
  { label: 'Friday', value: 'Friday' },
  { label: 'Saturday', value: 'Saturday' },
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

const formatTime = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const paddedMinutes = String(minutes).padStart(2, '0');
  return `${hour12}:${paddedMinutes} ${meridiem}`;
};

const formatTimeForDatabase = (displayTime: string): string => {
  // Convert "7:01 PM" format to "HH:MM:SS" format for database
  const trimmed = displayTime.trim();
  const timeParts = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (timeParts) {
    let hour = parseInt(timeParts[1], 10);
    const minute = parseInt(timeParts[2], 10);
    const meridiem = timeParts[3]?.toUpperCase();

    // Convert to 24-hour format
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;

    const paddedHour = String(hour).padStart(2, '0');
    const paddedMinute = String(minute).padStart(2, '0');
    return `${paddedHour}:${paddedMinute}:00`;
  }

  // If already in HH:MM or HH:MM:SS format, ensure it has seconds
  const colonParts = trimmed.split(':');
  if (colonParts.length === 2) {
    return `${trimmed}:00`;
  }
  if (colonParts.length === 3) {
    return trimmed;
  }

  // Fallback: return as is
  return displayTime;
};

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

  const [selectedTime, setSelectedTime] = useState<Date>(() => {
    const parsed = parseTimeString(initialValues?.meeting_time);
    // If no initial time, set to 2:00 PM to ensure AM/PM is visible
    if (!initialValues?.meeting_time) {
      const defaultTime = new Date();
      defaultTime.setHours(14, 0, 0, 0); // 2:00 PM
      return defaultTime;
    }
    return parsed;
  });
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');
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
    setShowTimePicker(Platform.OS === 'ios');
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
      meeting_time: formatTimeForDatabase(String(values.meeting_time)),
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

      <View style={styles.topSpacing} />

      <Form config={formConfig} onSubmit={handleValidatedSubmit}>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Group Information</Text>
          <FormField name="title">
            {({ value, error, onChange, onBlur }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.inputLabel}>
                  Group Name
                  <Text style={styles.requiredAsterisk}> *</Text>
                </Text>
                <Text style={styles.exampleText}>e.g. Hammersmith Connect</Text>
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={error}
                  inputStyle={styles.textInput}
                  required
                />
              </View>
            )}
          </FormField>
          <FormField name="description">
            {({ value, error, onChange, onBlur }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.inputLabel}>
                  Description
                  <Text style={styles.requiredAsterisk}> *</Text>
                </Text>
                <Text style={styles.exampleText}>
                  What can people expect from your group?
                </Text>
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={error}
                  inputStyle={StyleSheet.flatten([
                    styles.textInput,
                    styles.textAreaInput,
                  ])}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  required
                />
              </View>
            )}
          </FormField>
          <FormField name="whatsapp_link">
            {({ value, error, onChange, onBlur }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.inputLabel}>WhatsApp Group Link</Text>
                <Text style={styles.exampleText}>Optional</Text>
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={error}
                />
              </View>
            )}
          </FormField>
          <FormField name="meeting_day">
            {({ value, error, onChange }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.inputLabel}>
                  Group Day
                  <Text style={styles.requiredAsterisk}> *</Text>
                </Text>
                <Text style={styles.exampleText}>Select a day of the week</Text>
                <Select
                  options={MEETING_DAYS}
                  value={value}
                  onSelect={(opt) => onChange(opt.value)}
                  error={error}
                  placeholder=""
                  variant="dropdown"
                />
              </View>
            )}
          </FormField>
          <FormField name="meeting_time">
            {({ value, error, onChange }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.inputLabel}>
                  Group Time
                  <Text style={styles.requiredAsterisk}> *</Text>
                </Text>
                <View style={styles.timePickerSpacing} />
                {Platform.OS === 'android' ? (
                  <>
                    <TouchableOpacity
                      style={StyleSheet.flatten([
                        styles.androidTimeButton,
                        error && styles.androidTimeButtonError,
                      ])}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Text style={styles.androidTimeButtonText}>
                        {value || formatTime(selectedTime)}
                      </Text>
                    </TouchableOpacity>
                    {showTimePicker && (
                      <DateTimePicker
                        value={selectedTime}
                        mode="time"
                        display="spinner"
                        is24Hour={false}
                        onChange={(event: DateTimePickerEvent, date?: Date) => {
                          if (event.type === 'dismissed') {
                            setShowTimePicker(false);
                            return;
                          }
                          if (date) {
                            setSelectedTime(date);
                            onChange(formatTime(date));
                          }
                          setShowTimePicker(false);
                        }}
                      />
                    )}
                  </>
                ) : (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    locale="en_US"
                    display="spinner"
                    onChange={(_, date) => {
                      if (date) {
                        setSelectedTime(date);
                        onChange(formatTime(date));
                      }
                    }}
                    style={styles.timePicker}
                  />
                )}
                {error && <Text style={styles.errorText}>{error}</Text>}
              </View>
            )}
          </FormField>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Meeting Location</Text>
          <Text style={styles.sectionSubtitle}>
            Search for a location by typing an address, place, or postcode, or
            pinch and drag the map to move the pin.
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
              labelStyle={styles.checkboxLabel}
              checkedIcon="x"
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

        {mode === 'create' && (
          <Text style={styles.verificationText}>
            All groups on VineMe are verified before they go live. Submit your
            request and your clergy member will review your group application.
          </Text>
        )}
        <SubmitButton
          isSubmitting={isSubmitting || uploadingImage}
          submitLabel={
            submitLabel ||
            (mode === 'create' ? 'Submit Request' : 'Save Changes')
          }
          onValidatedSubmit={handleValidatedSubmit}
        />

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
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
  verificationText: {
    fontSize: 12,
    color: '#666',
    marginTop: 0,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 16,
  },
  exampleText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  topSpacing: {
    height: 12,
  },
  fieldContainer: {
    marginBottom: 20,
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
    marginTop: 0,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  timePickerSpacing: {
    height: 8,
  },
  timePicker: {
    width: '100%',
    marginTop: -22,
    marginBottom: 8,
  },
  androidTimeButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  androidTimeButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  androidTimeButtonError: {
    borderColor: '#ff3b30',
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
  checkboxLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 8,
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
