import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Form,
  FormField,
  Input,
  Button,
  Card,
  Text,
  Header,
  useFormContext,
} from '../components/ui';
import { CountryCodePicker } from '../components/ui/CountryCodePicker';
import { referralService } from '../services/referrals';
import { useAuthStore } from '../stores/auth';
import {
  validateReferralForm,
  type ReferralFormData,
} from '../utils/referralValidation';

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

        // Extract the actual country code from the value
        const countryCode = String(values.countryCode || '+44');

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
    <>
      <Header
        title={isGroupReferral ? 'Refer a Friend' : 'General Referral'}
        useSafeArea={false}
      />
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {/* Context Card: Group selected vs no group */}
          <Card style={{ marginBottom: 20 }}>
            <View style={styles.contextRow}>
              <View style={styles.contextIconWrap}>
                <Ionicons
                  name={
                    isGroupReferral ? 'people-outline' : 'help-circle-outline'
                  }
                  size={22}
                  color={isGroupReferral ? '#2563eb' : '#ff0083'}
                />
              </View>
              <View style={styles.contextTextWrap}>
                <Text
                  variant="bodyLarge"
                  weight="bold"
                  numberOfLines={1}
                  style={{ marginBottom: 4 }}
                >
                  {isGroupReferral
                    ? 'Referring to group'
                    : 'No specific group selected'}
                </Text>
                <Text variant="bodySmall" color="secondary" numberOfLines={2}>
                  {isGroupReferral
                    ? groupName || groupId
                    : 'We will help them find a fitting group after they sign up'}
                </Text>
              </View>
            </View>
          </Card>

          <Text variant="body" color="secondary" style={{ marginBottom: 16 }}>
            {isGroupReferral
              ? "Help someone join this group by providing their contact information. They'll receive an email to set up their account and can then join the group."
              : "Help someone join the VineMe community. They'll receive an email to set up their account and our team will help match them to a group."}
          </Text>

          <Card
            variant="filled"
            style={{
              backgroundColor: '#fff8e5',
              borderWidth: 1,
              borderColor: '#ffd966',
              marginBottom: 24,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#856404"
              />
              <Text
                variant="body"
                weight="semiBold"
                style={{ color: '#856404' }}
              >
                Privacy Notice
              </Text>
            </View>
            <Text
              variant="bodySmall"
              style={{ color: '#856404', lineHeight: 20 }}
            >
              {isGroupReferral
                ? "Please inform the person you're referring that their contact details will be shared with church admins and the connect group leaders for this group."
                : "Please inform the person you're referring that their contact details will be shared with church admins."}
            </Text>
          </Card>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
              marginTop: 8,
            }}
          >
            <Ionicons name="person-add-outline" size={18} color="#374151" />
            <Text variant="h5" weight="bold">
              Referral details
            </Text>
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
                      size="small"
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
                      size="small"
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
                    size="small"
                  />
                )}
              </FormField>
            </View>

            <View style={styles.phoneFieldContainer}>
              <FormField name="countryCode">
                {({ value, onChange }) => (
                  <CountryCodePicker
                    value={value}
                    onChange={onChange}
                    label="Country"
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
                    size="small"
                  />
                )}
              </FormField>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginTop: 24,
                marginBottom: 16,
              }}
            >
              <Ionicons name="create-outline" size={18} color="#374151" />
              <Text variant="h5" weight="bold">
                Context (optional)
              </Text>
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
                    size="small"
                  />
                )}
              </FormField>
            </View>

            <SubmitControls
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
            />
          </Form>
          <Text
            variant="bodySmall"
            color="secondary"
            style={{
              marginTop: 20,
              textAlign: 'center',
              paddingHorizontal: 16,
            }}
          >
            By sending a referral, you confirm you have permission to share this
            person's contact information.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
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
  actions: {
    alignItems: 'center',
    marginTop: 24,
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
        title="Send Referral"
        variant="secondary"
        size="small"
        fullWidth
        onPress={handlePress}
        loading={isSubmitting}
      />
    </View>
  );
};
