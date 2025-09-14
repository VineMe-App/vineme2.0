import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Form, FormField, Input, Button, Card, useFormContext } from '../components/ui';
import { referralService } from '../services/referrals';
import { useAuthStore } from '../stores/auth';
import { validateReferralForm, type ReferralFormData } from '../utils/referralValidation';

export default function ReferralPage() {
  const params = useLocalSearchParams<{ groupId?: string; groupName?: string }>();
  const groupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
  const groupName = Array.isArray(params.groupName) ? params.groupName[0] : params.groupName;
  const isGroupReferral = Boolean(groupId);
  const router = useRouter();
  const { userProfile } = useAuthStore();

  const formConfig = useMemo(() => ({
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
          const validation = validateReferralForm({ email: value, phone: '', note: '' });
          return validation.errors.email || undefined;
        },
      },
    },
    phone: {
      initialValue: '',
      rules: {
        required: true,
        custom: (value: string) => {
          const validation = validateReferralForm({ email: '', phone: value, note: '' });
          return validation.errors.phone || undefined;
        },
      },
    },
    note: {
      initialValue: '',
      rules: { maxLength: 500 },
    },
  }) as const, []);

  const handleSubmit = useCallback(async (values: Record<string, any>) => {
    try {
      if (!userProfile?.id) {
        Alert.alert('Authentication Required', 'Please sign in to send a referral.');
        return;
      }

      const payload: ReferralFormData = {
        email: String(values.email || '').trim(),
        phone: String(values.phone || '').trim(),
        note: String(values.note || '').trim(),
        firstName: values.firstName ? String(values.firstName).trim() : undefined,
        lastName: values.lastName ? String(values.lastName).trim() : undefined,
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
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send referral. Please try again.');
    }
  }, [userProfile?.id, groupId, isGroupReferral, router]);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
                name={isGroupReferral ? 'people-outline' : 'help-circle-outline'}
                size={22}
                color={isGroupReferral ? '#2563eb' : '#10b981'}
              />
            </View>
            <View style={styles.contextTextWrap}>
              <Text style={styles.contextTitle} numberOfLines={1}>
                {isGroupReferral ? 'Referring to group' : 'No specific group selected'}
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
                    placeholder="Optional"
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
                    placeholder="Optional"
                    autoCapitalize="words"
                  />
                )}
              </FormField>
            </View>
          </View>

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

          <FormField name="phone">
            {({ value, error, onChange, onBlur }) => (
              <Input
                label="Phone Number"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={error}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
                required
              />
            )}
          </FormField>

          <View style={styles.sectionHeaderAlt}>
            <Ionicons name="create-outline" size={18} color="#374151" />
            <Text style={styles.sectionTitle}>Context (optional)</Text>
          </View>

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

          <SubmitControls onSubmit={handleSubmit} onCancel={() => router.back()} />
        </Form>
        <Text style={styles.footerNote}>
          By sending a referral, you confirm you have permission to share this person's contact information.
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  content: {
    padding: 16,
  },
  contextCard: {
    marginBottom: 12,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contextIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextTextWrap: {
    flex: 1,
  },
  contextTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  contextSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#4b5563',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionHeaderAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  footerNote: {
    marginTop: 16,
    fontSize: 12,
    color: '#6b7280',
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
      <Button title="Cancel" variant="outline" onPress={onCancel} disabled={isSubmitting} />
      <Button title="Send Referral" variant="primary" onPress={handlePress} loading={isSubmitting} />
    </View>
  );
};


