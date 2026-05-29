import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export interface MissingServiceFormData {
  churchName: string;
  churchLocation?: string;
  serviceName?: string;
  serviceTime?: string;
  additionalInfo?: string;
  contactName: string;
  contactEmail?: string;
}

export interface MissingServiceModalProps {
  isVisible: boolean;
  onClose: () => void;
  isSubmitting: boolean;
  onSubmit: (form: MissingServiceFormData) => void;
  error?: string | null;
}

export function MissingServiceModal({
  isVisible,
  onClose,
  isSubmitting,
  onSubmit,
  error,
}: MissingServiceModalProps) {
  const [churchName, setChurchName] = useState('');
  const [churchLocation, setChurchLocation] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [serviceTime, setServiceTime] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisible) {
      setChurchName('');
      setChurchLocation('');
      setServiceName('');
      setServiceTime('');
      setAdditionalInfo('');
      setContactName('');
      setContactEmail('');
      setValidationError(null);
    }
  }, [isVisible]);

  const handleSubmit = () => {
    if (!churchName.trim()) {
      setValidationError('Please provide the church name or organization.');
      return;
    }
    if (!contactName.trim()) {
      setValidationError('Please provide a contact name.');
      return;
    }
    if (!contactEmail.trim()) {
      setValidationError('Please provide a contact email.');
      return;
    }
    if (!isContactEmailValid) {
      setValidationError('Please enter a valid contact email.');
      return;
    }

    setValidationError(null);
    onSubmit({
      churchName: churchName.trim(),
      churchLocation: churchLocation.trim() || undefined,
      serviceName: serviceName.trim() || undefined,
      serviceTime: serviceTime.trim() || undefined,
      additionalInfo: additionalInfo.trim() || undefined,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim() || undefined,
    });
  };

  const showError = useMemo(
    () => validationError || error,
    [validationError, error]
  );

  const isContactEmailValid = useMemo(() => {
    const trimmedEmail = contactEmail.trim();
    if (!trimmedEmail) return false;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(trimmedEmail);
  }, [contactEmail]);

  const canSubmit = useMemo(
    () =>
      Boolean(churchName.trim()) &&
      Boolean(contactName.trim()) &&
      isContactEmailValid,
    [churchName, contactName, isContactEmailValid]
  );
  const submitButtonStyle = useMemo(
    () =>
      StyleSheet.flatten([
        styles.submitButton,
        !canSubmit && styles.submitButtonDisabled,
      ]),
    [canSubmit]
  );

  const title = 'Tell us about your church';
  const renderInput = ({
    label,
    required,
    multiline,
    ...inputProps
  }: React.ComponentProps<typeof Input> & {
    label: string;
    required?: boolean;
    multiline?: boolean;
  }) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.inputLabel}>
        {label}
        {required ? <Text style={styles.requiredAsterisk}>*</Text> : null}
      </Text>
      <View
        style={[
          styles.inputBorderWrapper,
          multiline && styles.textAreaBorderWrapper,
        ]}
      >
        <Input
          {...inputProps}
          multiline={multiline}
          placeholderTextColor="#999999"
          containerStyle={styles.inputContainerOverride}
          inputStyle={StyleSheet.flatten([
            styles.textInput,
            multiline && styles.textAreaInput,
          ])}
          variant="outlined"
          scrollEnabled={false}
          textAlignVertical={multiline ? 'top' : undefined}
        />
      </View>
    </View>
  );

  return (
    <Modal
      isVisible={isVisible}
      onClose={onClose}
      title={title}
      variant="bottom-sheet"
      scrollable={false}
      size="large"
      contentStyle={styles.modalContent}
      bodyStyle={styles.modalBody}
      headerStyle={styles.modalHeader}
      titleTextStyle={styles.modalTitle}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={64}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.description}>
            We&apos;d love to get your church on VineMe. Tell us about your
            church and then take a look around with a{' '}
            <Text style={styles.descriptionBold}>demo church</Text> to get a
            feel for how VineMe works.
          </Text>

          {renderInput({
            label: 'Church name',
            required: true,
            value: churchName,
            onChangeText: setChurchName,
            placeholder: 'Church name',
          })}

          {renderInput({
            label: 'Location',
            value: churchLocation,
            onChangeText: setChurchLocation,
            placeholder: 'Location or postcode',
          })}

          <View style={styles.fieldRow}>
            <View style={styles.flexHalf}>
              {renderInput({
                label: 'Service name',
                value: serviceName,
                onChangeText: setServiceName,
                placeholder: 'Optional',
              })}
            </View>
            <View style={styles.flexHalf}>
              {renderInput({
                label: 'Service time',
                value: serviceTime,
                onChangeText: setServiceTime,
                placeholder: 'e.g. 5pm',
              })}
            </View>
          </View>

          {renderInput({
            label: 'Best contact name',
            required: true,
            value: contactName,
            onChangeText: setContactName,
            placeholder: 'Who should we follow up with?',
          })}

          {renderInput({
            label: 'Best contact email',
            required: true,
            value: contactEmail,
            onChangeText: setContactEmail,
            placeholder: 'name@example.com',
            autoCapitalize: 'none',
            autoCorrect: false,
            keyboardType: 'email-address',
          })}

          {renderInput({
            label: 'Anything else?',
            value: additionalInfo,
            onChangeText: setAdditionalInfo,
            placeholder:
              'Optional - anything that would help when we reach out',
            multiline: true,
            numberOfLines: 3,
          })}
        </ScrollView>
        <View style={styles.footer}>
          {showError ? <Text style={styles.errorText}>{showError}</Text> : null}
          <Button
            title="Submit"
            onPress={handleSubmit}
            loading={isSubmitting}
            variant="primary"
            disabled={!canSubmit || isSubmitting}
            style={submitButtonStyle}
            textStyle={styles.submitButtonText}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    width: '92%',
    alignSelf: 'center',
    height: '88%',
    maxHeight: '88%',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  modalHeader: {
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Figtree-Bold',
    fontWeight: '700',
    color: '#2C2235',
    letterSpacing: -0.44,
    lineHeight: 26,
    paddingLeft: 0,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Figtree-Regular',
    fontWeight: '400',
    color: '#2C2235',
    letterSpacing: -0.28,
    lineHeight: 20,
    marginBottom: 24,
  },
  descriptionBold: {
    fontFamily: 'Figtree-Bold',
    fontWeight: '700',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'Figtree-Medium',
    fontWeight: '500',
    color: '#2C2235',
    letterSpacing: -0.26,
    lineHeight: 18,
    marginBottom: 10,
  },
  flexHalf: {
    flex: 1,
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
  textAreaBorderWrapper: {
    minHeight: 104,
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
    minHeight: 104,
    paddingTop: 19,
    paddingBottom: 19,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    width: 278,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2C2235',
    borderColor: '#2C2235',
    alignSelf: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D8D8D8',
    borderColor: '#D8D8D8',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Figtree-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 12,
    color: '#FF0083',
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Figtree-Regular',
  },
});
