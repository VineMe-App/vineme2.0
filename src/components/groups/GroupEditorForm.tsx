import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
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
        rules: {
          required: true,
          custom: (value: string) => {
            if (!value || typeof value !== 'string') {
              return 'This field is required';
            }
            
            const trimmed = value.trim();
            if (!trimmed) {
              return 'This field is required';
            }
            
            // Check for 12-hour format with AM/PM
            const time12HourPattern = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
            const match = trimmed.match(time12HourPattern);
            
            if (!match) {
              // Check if it's 24-hour format (invalid)
              const time24HourPattern = /^(\d{1,2}):(\d{2})$/;
              if (time24HourPattern.test(trimmed)) {
                return 'Please use 12-hour format with AM or PM (e.g., 2:30 PM)';
              }
              // Check if missing AM/PM
              if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
                return 'Please select AM or PM';
              }
              return 'Invalid time format. Please use format: HH:MM AM/PM (e.g., 2:30 PM)';
            }
            
            const hour = parseInt(match[1], 10);
            const minute = parseInt(match[2], 10);
            
            // Validate hour range (1-12 for 12-hour format)
            if (hour < 1 || hour > 12) {
              return 'Hour must be between 1 and 12';
            }
            
            // Validate minute range (0-59)
            if (minute < 0 || minute > 59) {
              return 'Minutes must be between 00 and 59';
            }
            
            return undefined;
          },
        },
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
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Subtitle */}
      {subTitle && <Text style={styles.pageSubtitle}>{subTitle}</Text>}

      <Form config={formConfig} onSubmit={handleValidatedSubmit}>
        {/* Add Group Photo Section - First */}
        <View style={styles.photoSection}>
          {imageState ? (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: imageState.uri }}
                style={styles.imagePreview}
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={handleRemoveImage}
                disabled={uploadingImage || isSubmitting}
              >
                <Ionicons name="close-circle" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPhotoContainer}
              onPress={handlePickImage}
              disabled={uploadingImage || isSubmitting}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={24} color="#2C2235" />
              <Text style={styles.addPhotoText}>Add group photo</Text>
            </TouchableOpacity>
          )}
          {uploadingImage && (
            <Text style={styles.uploadingText}>Uploading photo…</Text>
          )}
        </View>

        {/* Group Name Field */}
        <FormField name="title">
          {({ value, error, onChange, onBlur }) => (
            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>
                Group name<Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={[styles.inputBorderWrapper, error && styles.inputBorderWrapperError]}>
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Give this group a name"
                  placeholderTextColor="#999999"
                  containerStyle={styles.inputContainerOverride}
                  inputStyle={styles.textInput}
                  variant="outlined"
                />
              </View>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          )}
        </FormField>

        {/* Description Field */}
        <FormField name="description">
          {({ value, error, onChange, onBlur }) => (
            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>
                Description<Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={[styles.inputBorderWrapper, styles.textAreaBorderWrapper, error && styles.inputBorderWrapperError]}>
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="What can people expect from your group"
                  placeholderTextColor="#999999"
                  containerStyle={styles.inputContainerOverride}
                  inputStyle={StyleSheet.flatten([styles.textInput, styles.textAreaInput])}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  variant="outlined"
                />
              </View>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          )}
        </FormField>

        {/* Group Day Field */}
        <FormField name="meeting_day">
          {({ value, error, onChange }) => (
            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>
                Group day<Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <Select
                options={MEETING_DAYS}
                value={value}
                onSelect={(opt) => onChange(opt.value)}
                error={error}
                placeholder="Select a day of the week"
                variant="dropdown"
                style={styles.selectContainer}
              />
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          )}
        </FormField>

        {/* Group Time Field */}
        <FormField name="meeting_time">
          {({ value, error, onChange, onBlur }) => {
            // Parse current value to extract time and AM/PM
            // Try to match complete format first
            const timeMatch = value?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
            let timeValue = '';
            let meridiem = 'AM';
            
            if (timeMatch) {
              // Complete format with colon
              timeValue = `${timeMatch[1]}:${timeMatch[2]}`;
              meridiem = timeMatch[3]?.toUpperCase() || 'AM';
            } else if (value) {
              // Extract AM/PM if present
              const meridiemMatch = value.match(/\s*(AM|PM)$/i);
              if (meridiemMatch) {
                meridiem = meridiemMatch[1].toUpperCase();
              }
              
              // Extract digits and format them
              const digitsOnly = value.replace(/[^\d]/g, '');
              if (digitsOnly.length > 0) {
                // Format: first 2 digits, then colon, then next 2 digits
                if (digitsOnly.length <= 2) {
                  timeValue = digitsOnly;
                } else {
                  timeValue = digitsOnly.substring(0, 2) + ':' + digitsOnly.substring(2, 4);
                }
              }
            }
            
            const handleTimeChange = (text: string) => {
              // Remove any non-numeric characters except colon
              let cleanText = text.replace(/[^\d:]/g, '');
              
              // Remove existing colons to rebuild format
              const digitsOnly = cleanText.replace(/:/g, '');
              
              let formatted = '';
              if (digitsOnly.length > 0) {
                // Take first 2 digits for hours
                formatted = digitsOnly.substring(0, 2);
                
                // If we have more digits, add colon and minutes
                if (digitsOnly.length > 2) {
                  formatted += ':' + digitsOnly.substring(2, 4);
                }
              }
              
              // Limit to HH:MM format (max 5 characters: "12:34")
              if (formatted.length > 5) {
                formatted = formatted.substring(0, 5);
              }
              
              // Combine with current meridiem
              const newValue = formatted ? `${formatted} ${meridiem}` : '';
              onChange(newValue);
            };

            const handleMeridiemChange = (newMeridiem: 'AM' | 'PM') => {
              if (timeValue) {
                onChange(`${timeValue} ${newMeridiem}`);
              } else {
                onChange(`12:00 ${newMeridiem}`);
              }
            };

            return (
              <View style={styles.fieldContainer}>
                <Text style={styles.inputLabel}>
                  Group time<Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={styles.timeInputRow}>
                  <View style={[styles.timeInputWrapper, error && styles.inputBorderWrapperError]}>
                    <Input
                      value={timeValue}
                      onChangeText={handleTimeChange}
                      onBlur={onBlur}
                      placeholder="12:00"
                      placeholderTextColor="#999999"
                      containerStyle={styles.timeInputContainer}
                      inputStyle={styles.timeInputText}
                      variant="outlined"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.meridiemContainer}>
                    <TouchableOpacity
                      style={[
                        styles.meridiemButton,
                        meridiem === 'AM' && styles.meridiemButtonActive,
                      ]}
                      onPress={() => handleMeridiemChange('AM')}
                    >
                      <Text
                        style={[
                          styles.meridiemText,
                          meridiem === 'AM' && styles.meridiemTextActive,
                        ]}
                      >
                        AM
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.meridiemButton,
                        meridiem === 'PM' && styles.meridiemButtonActive,
                      ]}
                      onPress={() => handleMeridiemChange('PM')}
                    >
                      <Text
                        style={[
                          styles.meridiemText,
                          meridiem === 'PM' && styles.meridiemTextActive,
                        ]}
                      >
                        PM
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {error && <Text style={styles.errorText}>{error}</Text>}
              </View>
            );
          }}
        </FormField>

        {/* Meeting Location Section */}
        <View style={styles.fieldContainer}>
          <Text style={styles.inputLabel}>
            Meeting location<Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={styles.locationContainer}>
            <LocationPicker
              value={{
                address: locationValue.address,
                coordinates: locationValue.coordinates || undefined,
              }}
              onChange={setLocationValue}
            />
          </View>

          {/* Safety Reminder */}
          <View style={styles.safetyReminder}>
            <View style={styles.safetyReminderHeader}>
              <Ionicons name="alert-circle" size={20} color="#2C2235" />
              <Text style={styles.safetyReminderTitle}>Safety reminder</Text>
            </View>
            <Text style={styles.safetyReminderText}>
              Please avoid placing the pin directly on your home address for safety.
            </Text>
            <View style={styles.safetyCheckboxRow}>
              <Checkbox
                checked={locationSafetyConfirmed}
                onPress={() => setLocationSafetyConfirmed((prev) => !prev)}
                checkedIcon="checkmark"
              />
              <Text style={styles.safetyCheckboxLabel}>
                I confirm this location is not my exact home address.
              </Text>
            </View>
          </View>
        </View>

        {/* Submit Information */}
        {mode === 'create' && (
          <Text style={styles.verificationText}>
            All groups on VineMe are verified before they go live. Submit your
            request and your clergy member will review your group application.
          </Text>
        )}

        {/* Submit Button */}
        <SubmitButton
          isSubmitting={isSubmitting || uploadingImage}
          submitLabel={
            submitLabel ||
            (mode === 'create' ? 'Submit request' : 'Save Changes')
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
      style={styles.submitButton}
      textStyle={styles.submitButtonText}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 21,
    paddingTop: 36,
    paddingBottom: 100,
    backgroundColor: '#FFFFFF',
  },
  pageSubtitle: {
    fontSize: 14,
    fontFamily: 'Figtree-Regular',
    fontWeight: '400',
    color: '#2C2235',
    letterSpacing: -0.28,
    lineHeight: 20,
    marginBottom: 29,
    paddingHorizontal: 10,
  },
  verificationText: {
    fontSize: 14,
    fontFamily: 'Figtree-Regular',
    fontWeight: '400',
    color: '#2C2235',
    letterSpacing: -0.28,
    lineHeight: 20,
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 28,
  },
  fieldContainer: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Figtree-Medium',
    fontWeight: '500',
    color: '#2C2235',
    letterSpacing: -0.28,
    lineHeight: 15,
    marginBottom: 11,
  },
  requiredAsterisk: {
    color: '#FF0083',
  },
  inputBorderWrapper: {
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 50,
    backgroundColor: '#FFFFFF',
  },
  inputBorderWrapperError: {
    borderColor: '#FF0083',
  },
  textAreaBorderWrapper: {
    minHeight: 124,
  },
  inputContainerOverride: {
    marginTop: 0,
    marginBottom: 0,
  },
  textInput: {
    backgroundColor: 'transparent',
    paddingHorizontal: 17,
    fontSize: 16,
    fontFamily: 'Figtree-Medium',
    fontWeight: '500',
    color: '#2C2235',
    letterSpacing: -0.32,
    lineHeight: 24,
    minHeight: 50,
  },
  textAreaInput: {
    minHeight: 124,
    paddingTop: 19,
    paddingBottom: 19,
  },
  errorText: {
    fontSize: 12,
    color: '#FF0083',
    marginTop: 4,
    fontFamily: 'Figtree-Regular',
  },
  photoSection: {
    marginBottom: 30,
  },
  addPhotoContainer: {
    height: 176,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addPhotoText: {
    fontSize: 16,
    fontFamily: 'Figtree-Bold',
    fontWeight: '700',
    color: '#2C2235',
    letterSpacing: -0.32,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 176,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  locationContainer: {
    marginTop: 11,
  },
  safetyReminder: {
    marginTop: 20,
    backgroundColor: 'rgba(255, 0, 131, 0.08)',
    borderRadius: 16,
    padding: 23,
  },
  safetyReminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 9,
  },
  safetyReminderTitle: {
    fontSize: 16,
    fontFamily: 'Figtree-Bold',
    fontWeight: '700',
    color: '#2C2235',
    letterSpacing: -0.32,
    lineHeight: 20,
  },
  safetyReminderText: {
    fontSize: 14,
    fontFamily: 'Figtree-Regular',
    fontWeight: '400',
    color: '#2C2235',
    letterSpacing: -0.28,
    lineHeight: 20,
    marginBottom: 15,
  },
  safetyCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  safetyCheckboxLabel: {
    fontSize: 14,
    fontFamily: 'Figtree-Regular',
    fontWeight: '400',
    color: '#2C2235',
    letterSpacing: -0.28,
    lineHeight: 20,
    flex: 1,
  },
  selectContainer: {
    marginBottom: 0,
  },
  submitButton: {
    width: 278,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2C2235',
    alignSelf: 'center',
    marginTop: 11,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Figtree-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    marginTop: 12,
  },
  timeInputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  timeInputWrapper: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 50,
    backgroundColor: '#FFFFFF',
  },
  timeInputContainer: {
    marginTop: 0,
    marginBottom: 0,
    borderWidth: 0,
  },
  timeInputText: {
    backgroundColor: 'transparent',
    paddingHorizontal: 17,
    fontSize: 16,
    fontFamily: 'Figtree-Medium',
    fontWeight: '500',
    color: '#2C2235',
    letterSpacing: -0.32,
    lineHeight: 24,
    minHeight: 50,
  },
  meridiemContainer: {
    flexDirection: 'row',
    gap: 8,
    height: 50,
  },
  meridiemButton: {
    minWidth: 60,
    height: 50,
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  meridiemButtonActive: {
    borderColor: '#2C2235',
    backgroundColor: '#2C2235',
  },
  meridiemText: {
    fontSize: 16,
    fontFamily: 'Figtree-Medium',
    fontWeight: '500',
    color: '#2C2235',
    letterSpacing: -0.32,
    lineHeight: 24,
  },
  meridiemTextActive: {
    color: '#FFFFFF',
  },
});

export default GroupEditorForm;
