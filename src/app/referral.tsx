import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Form,
  FormField,
  Input,
  Button,
  Card,
  useFormContext,
  Select,
  SelectOption,
} from '../components/ui';
import { referralService } from '../services/referrals';
import { useAuthStore } from '../stores/auth';
import {
  validateReferralForm,
  type ReferralFormData,
} from '../utils/referralValidation';

// Country options for the dropdown
const COUNTRY_OPTIONS: SelectOption[] = [
  { label: '🇬🇧 United Kingdom (+44)', value: '+44' },
  { label: '🇺🇸 United States (+1)', value: '+1-US' },
  { label: '🇦🇺 Australia (+61)', value: '+61' },
  { label: '🇳🇿 New Zealand (+64)', value: '+64' },
  { label: '🇨🇦 Canada (+1)', value: '+1-CA' },
  { label: '🇩🇪 Germany (+49)', value: '+49' },
  { label: '🇫🇷 France (+33)', value: '+33' },
  { label: '🇪🇸 Spain (+34)', value: '+34' },
  { label: '🇮🇹 Italy (+39)', value: '+39' },
  { label: '🇮🇳 India (+91)', value: '+91' },
  { label: '🇸🇬 Singapore (+65)', value: '+65' },
  { label: '🇿🇦 South Africa (+27)', value: '+27' },
  { label: '🇧🇷 Brazil (+55)', value: '+55' },
  { label: '🇳🇬 Nigeria (+234)', value: '+234' },
  { label: '🇵🇭 Philippines (+63)', value: '+63' },
  { label: '🇵🇰 Pakistan (+92)', value: '+92' },
];

export default function ReferralPage() {
  const params = useLocalSearchParams<{
    groupId?: string;
    groupName?: string;
  }>();
  const groupId = Array.isArray(params.groupId)
    ? params.groupId[0]
    : params.groupId;
  const groupName = Array.isArray(params.groupName)
    ? params.groupName[0]
    : params.groupName;
  const isGroupReferral = Boolean(groupId);
  const router = useRouter();
  const { userProfile } = useAuthStore();

  const formConfig = useMemo(
    () =>
      ({
        firstName: {
          initialValue: '',
          rules: { maxLength: 50 },
        },
        lastName: {
          initialValue: '',
          rules: { maxLength: 50 },
        },
        email: {
          initialValue: '',
          rules: {
            required: true,
            custom: (value: string) => {
              const validation = validateReferralForm({
                email: value,
                phone: '',
                note: '',
              });
              return validation.errors.email || undefined;
            },
          },
        },
        countryCode: {
          initialValue: '+44',
          rules: {
            required: true,
          },
        },
        localNumber: {
          initialValue: '',
          rules: {
            required: true,
            custom: (value: string) => {
              if (!value) return 'Phone number is required';

              // Basic validation - just check if it's a reasonable length
              const digitsOnly = value.replace(/\D/g, '');
              if (digitsOnly.length < 7) {
                return 'Phone number must be at least 7 digits';
              } else if (digitsOnly.length > 15) {
                return 'Phone number must be no more than 15 digits';
              }

              return undefined;
            },
          },
        },
        note: {
          initialValue: '',
          rules: { maxLength: 500 },
        },
      }) as const,
    []
  );

  const handleSubmit = useCallback(
    async (values: Record<string, any>) => {
      try {
        if (!userProfile?.id) {
          Alert.alert(
            'Authentication Required',
            'Please sign in to send a referral.'
          );
          return;
        }

        // Extract the actual country code from the value (remove country suffix)
        const countryCode = String(values.countryCode || '+44').replace(
          /-[A-Z]{2}$/,
          ''
        );

        const payload: ReferralFormData = {
          email: String(values.email || '').trim(),
          phone: `${countryCode}${String(values.localNumber || '').replace(/\D/g, '')}`,
          note: String(values.note || '').trim(),
          firstName: values.firstName
            ? String(values.firstName).trim()
            : undefined,
          lastName: values.lastName
            ? String(values.lastName).trim()
            : undefined,
        };

        const result = await referralService.createReferral({
          ...payload,
          groupId: groupId || undefined,
          referrerId: userProfile.id,
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to send referral');
        }

        Alert.alert(
          'Referral Sent!',
          isGroupReferral
            ? "We've created an account for the person you referred and sent them an email to complete setup."
            : "We've created an account for the person you referred and sent them an email to complete setup. Our team will help them find the right group.",
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'Failed to send referral. Please try again.'
        );
      }
    },
    [userProfile?.id, groupId, isGroupReferral, router]
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isGroupReferral ? 'Refer a Friend' : 'General Referral'}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Context Card: Group selected vs no group */}
        <Card style={styles.contextCard}>
          <View style={styles.contextRow}>
            <View style={styles.contextIconWrap}>
              <Ionicons
                name={
                  isGroupReferral ? 'people-outline' : 'help-circle-outline'
                }
                size={22}
                color={isGroupReferral ? '#2563eb' : '#10b981'}
              />
            </View>
            <View style={styles.contextTextWrap}>
              <Text style={styles.contextTitle} numberOfLines={1}>
                {isGroupReferral
                  ? 'Referring to group'
                  : 'No specific group selected'}
              </Text>
              <Text style={styles.contextSubtitle} numberOfLines={2}>
                {isGroupReferral
                  ? groupName || groupId
                  : 'We will help them find a fitting group after they sign up'}
              </Text>
            </View>
          </View>
        </Card>

        <Text style={styles.description}>
          {isGroupReferral
            ? "Help someone join this group by providing their contact information. They'll receive an email to set up their account and can then join the group."
            : "Help someone join the VineMe community. They'll receive an email to set up their account and our team will help match them to a group."}
        </Text>

        <View style={styles.sectionHeader}>
          <Ionicons name="person-add-outline" size={18} color="#374151" />
          <Text style={styles.sectionTitle}>Referral details</Text>
        </View>

        <Form config={formConfig} onSubmit={handleSubmit}>
          <View style={styles.row}>
            <View style={styles.half}>
              <FormField name="firstName">
                {({ value, error, onChange, onBlur }) => (
                  <Input
                    label="First Name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={error}
                    placeholder="Peter"
                    autoCapitalize="words"
                  />
                )}
              </FormField>
            </View>
            <View style={styles.half}>
              <FormField name="lastName">
                {({ value, error, onChange, onBlur }) => (
                  <Input
                    label="Last Name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={error}
                    placeholder="Fisher"
                    autoCapitalize="words"
                  />
                )}
              </FormField>
            </View>
          </View>

          <View style={styles.formFieldContainer}>
            <FormField name="email">
              {({ value, error, onChange, onBlur }) => (
                <Input
                  label="Email Address"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={error}
                  placeholder="their.email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  required
                />
              )}
            </FormField>
          </View>

          <View style={styles.phoneFieldContainer}>
            <FormField name="countryCode">
              {({ value, onChange }) => (
                <Select
                  options={COUNTRY_OPTIONS}
                  value={value}
                  onSelect={(option) => onChange(option.value)}
                  label="Country"
                  variant="dropdown"
                  style={styles.countrySelect}
                />
              )}
            </FormField>
            <FormField name="localNumber">
              {({ value, error, onChange, onBlur }) => (
                <Input
                  label="Phone Number"
                  value={value}
                  onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
                  onBlur={onBlur}
                  error={error}
                  placeholder="7890123456"
                  keyboardType="phone-pad"
                  required
                />
              )}
            </FormField>
          </View>

          <View style={styles.sectionHeaderAlt}>
            <Ionicons name="create-outline" size={18} color="#374151" />
            <Text style={styles.sectionTitle}>Context (optional)</Text>
          </View>

          <View style={styles.formFieldContainer}>
            <FormField name="note">
              {({ value, error, onChange, onBlur }) => (
                <Input
                  label="Note (Optional)"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={error}
                  placeholder="Why do you think they'd be a good fit? Any context that would help..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  helperText={`${(value || '').length}/500 characters`}
                />
              )}
            </FormField>
          </View>

          <SubmitControls
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
          />
        </Form>
        <Text style={styles.footerNote}>
          By sending a referral, you confirm you have permission to share this
          person's contact information.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    marginRight: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  content: {
    padding: 20,
  },
  contextCard: {
    marginBottom: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  contextIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextTextWrap: {
    flex: 1,
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  contextSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionHeaderAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  half: {
    flex: 1,
  },
  formFieldContainer: {
    marginBottom: 20,
  },
  phoneFieldContainer: {
    marginBottom: 20,
  },
  countrySelect: {
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  footerNote: {
    marginTop: 20,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});

// Internal submit controls that use the form context to validate and submit
const SubmitControls: React.FC<{
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const { validateForm, values, isSubmitting } = useFormContext();
  const handlePress = useCallback(() => {
    const ok = validateForm();
    if (!ok) return;
    onSubmit(values);
  }, [validateForm, values, onSubmit]);

  return (
    <View style={styles.actions}>
      <Button
        title="Cancel"
        variant="outline"
        onPress={onCancel}
        disabled={isSubmitting}
      />
      <Button
        title="Send Referral"
        variant="primary"
        onPress={handlePress}
        loading={isSubmitting}
      />
    </View>
  );
};
