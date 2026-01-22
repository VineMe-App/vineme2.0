import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface MissingServiceFormData {
  churchId?: string;
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
    if (contactEmail.trim()) {
      const emailPattern = /[^\s@]+@[^\s@]+\.[^\s@]+/;
      if (!emailPattern.test(contactEmail.trim())) {
        setValidationError('Please enter a valid contact email.');
        return;
      }
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
      contactEmail: contactEmail.trim() || undefined,
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
          <Text style={styles.description}>{description}</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Church name</Text>
            <TextInput
              style={styles.input}
              value={churchName}
              onChangeText={setChurchName}
              placeholder="Church name"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Location (optional)</Text>
            <TextInput
              style={styles.input}
              value={churchLocation}
              onChangeText={setChurchLocation}
              placeholder="Location or postcode"
              placeholderTextColor="#666"
            />
          </View>

          {mode === 'church' && (
            <Text style={styles.sectionLabel}>
              Service details (optional, if known)
            </Text>
          )}

          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, styles.flexHalf]}>
              <Text style={styles.label}>Service name (optional)</Text>
              <TextInput
                style={styles.input}
                value={serviceName}
                onChangeText={setServiceName}
                placeholder="Service name"
                placeholderTextColor="#666"
              />
            </View>
            <View style={[styles.fieldGroup, styles.flexHalf]}>
              <Text style={styles.label}>Typical time (optional)</Text>
              <TextInput
                style={styles.input}
                value={serviceTime}
                onChangeText={setServiceTime}
                placeholder="e.g. Sundays 5pm"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Best contact name</Text>
            <TextInput
              style={styles.input}
              value={contactName}
              onChangeText={setContactName}
              placeholder="Who should we follow up with?"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Best contact email (if you know it!)</Text>
            <TextInput
              style={styles.input}
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="name@example.com"
              placeholderTextColor="#666"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Anything else we should know? (optional)
            </Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={additionalInfo}
              onChangeText={setAdditionalInfo}
              placeholder="Add context or questions"
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {showError ? <Text style={styles.errorText}>{showError}</Text> : null}

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
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  flexHalf: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d8d8d8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fbfbfb',
  },
  multiline: {
    minHeight: 96,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  errorText: {
    color: '#d73a49',
    fontSize: 14,
  },
});
