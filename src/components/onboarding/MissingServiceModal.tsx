import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';

export interface MissingServiceFormData {
  churchId?: string;
  churchName: string;
  churchLocation?: string;
  serviceName?: string;
  serviceTime?: string;
  additionalInfo?: string;
  contactName: string;
  contactEmail: string;
}

export interface MissingServiceModalProps {
  isVisible: boolean;
  onClose: () => void;
  initialChurchId?: string;
  initialChurchName?: string;
  isSubmitting: boolean;
  onSubmit: (form: MissingServiceFormData) => void;
  error?: string | null;
  mode: 'church' | 'service';
}

export function MissingServiceModal({
  isVisible,
  onClose,
  initialChurchId,
  initialChurchName,
  isSubmitting,
  onSubmit,
  error,
  mode,
}: MissingServiceModalProps) {
  const [churchName, setChurchName] = useState(initialChurchName || '');
  const [churchLocation, setChurchLocation] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [serviceTime, setServiceTime] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      setChurchName(initialChurchName || '');
    }
  }, [initialChurchName, isVisible, mode]);

  useEffect(() => {
    if (!isVisible) {
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
    const emailPattern = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    if (!emailPattern.test(contactEmail.trim())) {
      setValidationError('Please enter a valid contact email.');
      return;
    }

    setValidationError(null);
    onSubmit({
      churchId: initialChurchId,
      churchName: churchName.trim(),
      churchLocation: churchLocation.trim() || undefined,
      serviceName: serviceName.trim() || undefined,
      serviceTime: serviceTime.trim() || undefined,
      additionalInfo: additionalInfo.trim() || undefined,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
    });
  };

  const showError = useMemo(
    () => validationError || error,
    [validationError, error]
  );

  const title =
    mode === 'church' ? 'Request New Church' : 'Request New Service';
  const description =
    mode === 'church'
      ? "Let us know about the church or campus you're part of. Share the details below and we'll reach out to get it added."
      : "We'll let the VineMe team know about this missing service. Share as much detail as you can and we'll reach out soon.";

  return (
    <Modal
      isVisible={isVisible}
      onClose={onClose}
      title={title}
      variant="bottom-sheet"
      scrollable
      size="large"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={64}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="body" color="secondary" style={styles.description}>
            {description}
          </Text>

          <Input
            label="Church name"
            value={churchName}
            onChangeText={setChurchName}
            placeholder="Church name"
            containerStyle={styles.inputContainer}
          />

          <Input
            label="Location (optional)"
            value={churchLocation}
            onChangeText={setChurchLocation}
            placeholder="Location or postcode"
            containerStyle={styles.inputContainer}
          />

          {mode === 'church' && (
            <Text variant="h6" weight="semiBold" style={styles.sectionLabel}>
              Service details (optional, if known)
            </Text>
          )}

          <View style={styles.fieldRow}>
            <View style={styles.flexHalf}>
              <Input
                label="Service name (optional)"
                value={serviceName}
                onChangeText={setServiceName}
                placeholder="Service name"
                containerStyle={styles.inputContainer}
              />
            </View>
            <View style={styles.flexHalf}>
              <Input
                label="Typical time (optional)"
                value={serviceTime}
                onChangeText={setServiceTime}
                placeholder="e.g. Sundays 5pm"
                containerStyle={styles.inputContainer}
              />
            </View>
          </View>

          <Input
            label="Best contact name"
            value={contactName}
            onChangeText={setContactName}
            placeholder="Who should we follow up with?"
            containerStyle={styles.inputContainer}
          />

          <Input
            label="Best contact email"
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="name@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            containerStyle={styles.inputContainer}
          />

          <Input
            label="Anything else we should know? (optional)"
            value={additionalInfo}
            onChangeText={setAdditionalInfo}
            placeholder="Add context or questions"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            containerStyle={styles.inputContainer}
          />

          {showError ? (
            <Text variant="bodySmall" color="error" style={styles.errorText}>
              {showError}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Button
              title="Cancel"
              onPress={onClose}
              variant="ghost"
              disabled={isSubmitting}
            />
            <Button
              title="Send request"
              onPress={handleSubmit}
              loading={isSubmitting}
              variant="primary"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  description: {
    lineHeight: 22,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionLabel: {
    marginTop: 8,
    marginBottom: 8,
  },
  flexHalf: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 0,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  errorText: {
    marginTop: 4,
  },
});
