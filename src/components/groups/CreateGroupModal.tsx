import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { Modal, Form, FormField, Input, Select, Button, Card } from '../ui';
import { useFormContext } from '../ui/Form';
import { groupCreationService } from '../../services/groupCreation';
import { useAuthStore } from '../../stores/auth';
import { useErrorHandler } from '../../hooks';
import { locationService, type Coordinates } from '../../services/location';
import type { CreateGroupData } from '../../services/admin';
import type { SelectOption } from '../ui/Select';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  coordinates?: Coordinates;
}

type FormStep = 'basic' | 'schedule' | 'location' | 'review';

const MEETING_DAYS: SelectOption[] = [
  { label: 'Sunday', value: 'sunday' },
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
];

const STEP_TITLES = {
  basic: 'Basic Information',
  schedule: 'Meeting Schedule',
  location: 'Meeting Location',
  review: 'Review & Submit',
};

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isVisible,
  onClose,
  onSuccess,
}) => {
  const { userProfile } = useAuthStore();
  const { handleError } = useErrorHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<FormStep>('basic');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  const [locationCoordinates, setLocationCoordinates] = useState<Coordinates | null>(null);

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

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isVisible) {
      setCurrentStep('basic');
      setLocationCoordinates(null);
      setSelectedTime(new Date());
    }
  }, [isVisible]);

  const handleLocationGeocode = async (address: string) => {
    if (!address.trim()) {
      setLocationCoordinates(null);
      return;
    }

    setIsGeocodingLocation(true);
    try {
      const coordinates = await locationService.geocodeAddress(address);
      setLocationCoordinates(coordinates);
    } catch (error) {
      console.warn('Failed to geocode address:', error);
      setLocationCoordinates(null);
    } finally {
      setIsGeocodingLocation(false);
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setSelectedTime(selectedDate);
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const handleSubmit = async (values: GroupFormData) => {
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

    setIsSubmitting(true);

    try {
      const groupData: CreateGroupData = {
        title: values.title.trim(),
        description: values.description.trim(),
        meeting_day: values.meeting_day,
        meeting_time: values.meeting_time,
        location: {
          address: values.location.trim(),
          ...(locationCoordinates && {
            coordinates: locationCoordinates,
          }),
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
        'Group Request Submitted! 🎉',
        'Your group creation request has been submitted for approval by your church admin. You will be notified once it has been reviewed.\n\nYou can check the status of your request in your profile.',
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

  const handleNext = () => {
    const steps: FormStep[] = ['basic', 'schedule', 'location', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const steps: FormStep[] = ['basic', 'schedule', 'location', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const isFirstStep = currentStep === 'basic';
  const isLastStep = currentStep === 'review';

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const renderStepIndicator = () => {
    const steps: FormStep[] = ['basic', 'schedule', 'location', 'review'];
    const currentIndex = steps.indexOf(currentStep);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <View key={step} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                index <= currentIndex && styles.stepCircleActive,
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  index <= currentIndex && styles.stepNumberActive,
                ]}
              >
                {index + 1}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  index < currentIndex && styles.stepLineActive,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderBasicStep = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepDescription}>
        Let's start with the basic information about your group.
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
    </ScrollView>
  );

  const renderScheduleStep = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepDescription}>
        When will your group meet?
      </Text>

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
        {({ value, error, onChange }) => (
          <View>
            <Text style={styles.inputLabel}>Meeting Time *</Text>
            <TouchableOpacity
              style={[styles.timePickerButton, error && styles.timePickerButtonError]}
              onPress={() => setShowTimePicker(true)}
              disabled={isSubmitting}
            >
              <Text style={[styles.timePickerText, !value && styles.timePickerPlaceholder]}>
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
                  handleTimeChange(event, date);
                  if (date) {
                    onChange(formatTime(date));
                  }
                }}
              />
            )}
          </View>
        )}
      </FormField>
    </ScrollView>
  );

  const renderLocationStep = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepDescription}>
        Where will your group meet?
      </Text>

      <FormField name="location">
        {({ value, error, onChange, onBlur }) => (
          <View>
            <Input
              label="Meeting Location"
              value={value}
              onChangeText={(text) => {
                onChange(text);
                handleLocationGeocode(text);
              }}
              onBlur={onBlur}
              error={error}
              placeholder="e.g., Church Room 101, or 123 Main St, City"
              required
              editable={!isSubmitting}
            />
            {isGeocodingLocation && (
              <Text style={styles.geocodingText}>📍 Finding location...</Text>
            )}
            {locationCoordinates && (
              <View style={styles.locationConfirmation}>
                <Text style={styles.locationConfirmationText}>
                  ✅ Location found and will be shown on the map
                </Text>
              </View>
            )}
          </View>
        )}
      </FormField>
    </ScrollView>
  );

  const renderReviewStep = () => {
    const { values } = useFormContext();
    
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.stepDescription}>
          Please review your group details before submitting.
        </Text>

        <Card style={styles.reviewCard}>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Group Title:</Text>
            <Text style={styles.reviewValue}>{values.title || 'Not set'}</Text>
          </View>
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Description:</Text>
            <Text style={styles.reviewValue}>{values.description || 'Not set'}</Text>
          </View>
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Meeting Day:</Text>
            <Text style={styles.reviewValue}>
              {MEETING_DAYS.find(d => d.value === values.meeting_day)?.label || 'Not set'}
            </Text>
          </View>
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Meeting Time:</Text>
            <Text style={styles.reviewValue}>{values.meeting_time || 'Not set'}</Text>
          </View>
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Location:</Text>
            <Text style={styles.reviewValue}>{values.location || 'Not set'}</Text>
            {locationCoordinates && (
              <Text style={styles.reviewLocationNote}>
                📍 Location will be shown on the map
              </Text>
            )}
          </View>
        </Card>

        <View style={styles.reviewNote}>
          <Text style={styles.reviewNoteText}>
            📋 Your group request will be reviewed by a church admin before becoming active. 
            You'll receive a notification once it's been approved.
          </Text>
        </View>
      </ScrollView>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'basic':
        return renderBasicStep();
      case 'schedule':
        return renderScheduleStep();
      case 'location':
        return renderLocationStep();
      case 'review':
        return renderReviewStep();
      default:
        return renderBasicStep();
    }
  };

  return (
    <Modal
      isVisible={isVisible}
      onClose={handleClose}
      title={`Create New Group - ${STEP_TITLES[currentStep]}`}
      size="large"
      scrollable={false}
      closeOnOverlayPress={!isSubmitting}
      showCloseButton={!isSubmitting}
    >
      <Form config={formConfig} onSubmit={handleSubmit}>
        <View style={styles.container}>
          {renderStepIndicator()}
          
          <View style={styles.stepContent}>
            {renderCurrentStep()}
          </View>

          <View style={styles.buttonContainer}>
            {!isFirstStep && (
              <Button
                title="Previous"
                onPress={handlePrevious}
                variant="secondary"
                disabled={isSubmitting}
                style={styles.navigationButton}
              />
            )}
            
            {isFirstStep && (
              <Button
                title="Cancel"
                onPress={handleClose}
                variant="secondary"
                disabled={isSubmitting}
                style={styles.navigationButton}
              />
            )}

            {!isLastStep ? (
              <StepNavigationButton
                title="Next"
                onPress={handleNext}
                isSubmitting={isSubmitting}
                currentStep={currentStep}
              />
            ) : (
              <SubmitButton isSubmitting={isSubmitting} />
            )}
          </View>
        </View>
      </Form>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#007AFF',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#007AFF',
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 4,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
    textAlign: 'center',
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
  geocodingText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
    fontStyle: 'italic',
  },
  locationConfirmation: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  locationConfirmationText: {
    fontSize: 14,
    color: '#2d7d2d',
    fontWeight: '500',
  },
  reviewCard: {
    marginBottom: 24,
  },
  reviewItem: {
    marginBottom: 16,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  reviewLocationNote: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  reviewNote: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  reviewNoteText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  navigationButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

// Step navigation button component that validates current step
const StepNavigationButton: React.FC<{
  title: string;
  onPress: () => void;
  isSubmitting: boolean;
  currentStep: FormStep;
}> = ({ title, onPress, isSubmitting, currentStep }) => {
  const { values, validateField, setError, setTouched } = useFormContext();

  const handleNext = () => {
    // Validate current step fields before proceeding
    let isValid = true;
    
    switch (currentStep) {
      case 'basic':
        const titleError = validateField('title', values.title);
        const descError = validateField('description', values.description);
        if (titleError) {
          setError('title', titleError);
          setTouched('title', true);
          isValid = false;
        }
        if (descError) {
          setError('description', descError);
          setTouched('description', true);
          isValid = false;
        }
        break;
      case 'schedule':
        const dayError = validateField('meeting_day', values.meeting_day);
        const timeError = validateField('meeting_time', values.meeting_time);
        if (dayError) {
          setError('meeting_day', dayError);
          setTouched('meeting_day', true);
          isValid = false;
        }
        if (timeError) {
          setError('meeting_time', timeError);
          setTouched('meeting_time', true);
          isValid = false;
        }
        break;
      case 'location':
        const locationError = validateField('location', values.location);
        if (locationError) {
          setError('location', locationError);
          setTouched('location', true);
          isValid = false;
        }
        break;
    }

    if (isValid) {
      onPress();
    }
  };

  return (
    <Button
      title={title}
      onPress={handleNext}
      variant="primary"
      disabled={isSubmitting}
      style={styles.navigationButton}
    />
  );
};

// Submit button component that uses form context
const SubmitButton: React.FC<{ isSubmitting: boolean }> = ({
  isSubmitting,
}) => {
  const { validateForm } = useFormContext();

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
