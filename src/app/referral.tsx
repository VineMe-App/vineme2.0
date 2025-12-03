import React, { useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Form,
  FormField,
  Input,
  Button,
  useFormContext,
} from '../components/ui';
import { CountryCodePicker, type Country } from '../components/ui/CountryCodePicker';
import { referralService } from '../services/referrals';
import { useAuthStore } from '../stores/auth';
import {
  validateReferralForm,
  type ReferralFormData,
} from '../utils/referralValidation';
import { useGroup } from '../hooks/useGroups';
import { locationService } from '../services/location';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { GroupPlaceholderImage } from '../components/ui/GroupPlaceholderImage';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { safeGoBack } from '@/utils/navigation';

const COUNTRIES: Country[] = [
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'New Zealand', code: '+64', flag: '🇳🇿' },
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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { userProfile } = useAuthStore();

  // Hide the navigation header
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Fetch group data if groupId is provided
  const { data: group, isLoading: groupLoading } = useGroup(groupId);

  const formConfig = useMemo(
    () =>
      ({
        firstName: {
          initialValue: '',
          rules: {
            required: true,
            maxLength: 50,
            custom: (value: string) => {
              const trimmed = value?.trim() || '';
              if (!trimmed) return 'First name is required';
              return undefined;
            },
          },
        },
        lastName: {
          initialValue: '',
          rules: {
            required: true,
            maxLength: 50,
            custom: (value: string) => {
              const trimmed = value?.trim() || '';
              if (!trimmed) return 'Last name is required';
              return undefined;
            },
          },
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
            required: false, // Phone is optional in Figma
            custom: (value: string) => {
              if (!value) return undefined; // Optional
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

        const countryCode = String(values.countryCode || '+44');
        const localNumber = String(values.localNumber || '').replace(/\D/g, '');

        const payload: ReferralFormData = {
          email: String(values.email || '').trim(),
          phone: localNumber ? `${countryCode}${localNumber}` : undefined,
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
          [{ text: 'OK', onPress: () => safeGoBack(router) }]
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

  const formatMeetingTime = (day: string, time: string) => {
    try {
      // Parse time string (could be "12:00 PM" or "12:00" or "12:00:00")
      const timeStr = time.split(' ')[0]; // Get "12:00" from "12:00 PM"
      const [hours, minutes] = timeStr.split(':').map(Number);
      const isPM = time.toLowerCase().includes('pm');
      const hour24 = isPM && hours !== 12 ? hours + 12 : hours === 12 && !isPM ? 0 : hours;
      
      const date = new Date();
      date.setHours(hour24, minutes || 0, 0, 0);
      
      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
      const timeStrFormatted = formattedTime.toLowerCase().replace(/\s/g, '');
      return `${dayName}s ${timeStrFormatted}`;
    } catch {
      return `${day} ${time}`;
    }
  };

  const formatLocation = (location: any) => {
    const parsed = locationService.parseGroupLocation(location);
    if (parsed.address && parsed.address.trim().length > 0)
      return parsed.address;
    if (typeof location === 'string' && location.trim().length > 0)
      return location;
    if (location?.room) return `Room ${location.room}`;
    return 'Location TBD';
  };

  const getMemberCount = () => {
    if (!group?.memberships) return 0;
    return group.memberships.filter((m: any) => m.status === 'active').length;
  };

  // Determine category for placeholder image
  const category = useMemo(() => {
    const userChurchId = userProfile?.church_id;
    const userServiceId = userProfile?.service_id;
    if (group?.service_id && userServiceId && group.service_id === userServiceId) {
      return 'service';
    }
    if (group?.church_id && userChurchId && group.church_id === userChurchId) {
      return 'church';
    }
    return 'outside';
  }, [group, userProfile]);

  if (isGroupReferral && groupLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(router)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#2C2235" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isGroupReferral ? 'Referral form' : 'General referral'}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Group Card - Only show if group is selected */}
        {isGroupReferral && group && (
          <View style={styles.groupCard}>
            {/* Group Image */}
            <View style={styles.groupImageContainer}>
              {group.image_url ? (
                <OptimizedImage
                  source={{ uri: group.image_url }}
                  style={styles.groupImage}
                  quality="medium"
                  resizeMode="cover"
                />
              ) : (
                <GroupPlaceholderImage style={styles.groupImage} category={category} />
              )}
            </View>

            {/* Group Info */}
            <View style={styles.groupInfo}>
              <Text style={styles.groupTitle} numberOfLines={1}>
                {group.title}
              </Text>

              {/* Meeting Time */}
              {group.meeting_day && group.meeting_time && (
                <View style={styles.groupDetailRow}>
                  <Ionicons name="time-outline" size={12} color="#2C2235" />
                  <Text style={styles.groupDetailText}>
                    {formatMeetingTime(group.meeting_day, group.meeting_time)}
                  </Text>
                </View>
              )}

              {/* Location */}
              {group.location && (
                <View style={styles.groupDetailRow}>
                  <Ionicons name="location-outline" size={12} color="#2C2235" />
                  <Text style={styles.groupDetailText} numberOfLines={1}>
                    {formatLocation(group.location)}
                  </Text>
                </View>
              )}

              {/* Member Count Badge */}
              <View style={styles.memberBadge}>
                <Ionicons name="person" size={12} color="#2C2235" />
                <Text style={styles.memberCount}>{getMemberCount()}</Text>
              </View>
            </View>
          </View>
        )}

        {/* General Referral Card - Show when no group is selected */}
        {!isGroupReferral && (
          <View style={styles.generalReferralCard}>
            <Text style={styles.generalReferralTitle}>
              No specific group selected
            </Text>
            <Text style={styles.generalReferralSubtitle}>
              We'll help them find a suitable group after they sign up.
            </Text>
          </View>
        )}

        {/* Description */}
        <Text style={styles.description}>
          {isGroupReferral
            ? "Invite someone to join this group by adding their contact information. They'll get an email to set up their account and join the group."
            : "Help someone join the VineMe community. They'll receive an email to set up their account, and we'll help match them to a group."}
        </Text>

        {/* Privacy Notice */}
        <View style={styles.privacyNotice}>
          <View style={styles.privacyNoticeHeader}>
            <Ionicons name="alert-circle" size={20} color="#2C2235" />
            <Text style={styles.privacyNoticeTitle}>Privacy notice</Text>
          </View>
          <Text style={styles.privacyNoticeText}>
            Please let the person you're referring know that their contact
            details will be shared with the church admins and the group leaders.
          </Text>
        </View>

        {/* Form */}
        <Form config={formConfig} onSubmit={handleSubmit}>
          {/* First Name */}
          <FormField name="firstName">
            {({ value, error, onChange, onBlur }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  First name<Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Peter"
                    placeholderTextColor="#999999"
                    style={styles.textInput}
                    autoCapitalize="words"
                  />
                </View>
                {error && <Text style={styles.errorText}>{error}</Text>}
              </View>
            )}
          </FormField>

          {/* Last Name */}
          <FormField name="lastName">
            {({ value, error, onChange, onBlur }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  Last name<Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Fisher"
                    placeholderTextColor="#999999"
                    style={styles.textInput}
                    autoCapitalize="words"
                  />
                </View>
                {error && <Text style={styles.errorText}>{error}</Text>}
              </View>
            )}
          </FormField>

          {/* Email */}
          <FormField name="email">
            {({ value, error, onChange, onBlur }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  Email<Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="name@email.com"
                    placeholderTextColor="#999999"
                    style={styles.textInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {error && <Text style={styles.errorText}>{error}</Text>}
              </View>
            )}
          </FormField>

          {/* Phone Number */}
          <PhoneNumberField />

          {/* Note */}
          <FormField name="note">
            {({ value, error, onChange, onBlur }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Note</Text>
                <View style={[styles.textAreaWrapper, error && styles.inputWrapperError]}>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Why do you think they'd be a good fit? Any context that would help..."
                    placeholderTextColor="#999999"
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
                <Text style={styles.characterCount}>
                  {value?.length || 0}/500 characters
                </Text>
                {error && <Text style={styles.errorText}>{error}</Text>}
              </View>
            )}
          </FormField>

          {/* Footer Note */}
          <Text style={styles.footerNote}>
            By submitting a referral, you confirm that you have permission to
            share this person's contact information.
          </Text>

          {/* Submit Button */}
          <SubmitButton onSubmit={handleSubmit} />
        </Form>
      </ScrollView>
    </View>
  );
}

// Phone Number Field Component
const PhoneNumberField: React.FC = () => {
  const { values, errors, setValue, setTouched } = useFormContext();
  const countryCode = values.countryCode || '+44';
  const localNumber = values.localNumber || '';
  const error = errors.localNumber;

  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>Phone number</Text>
      <View style={[styles.phoneInputWrapper, error && styles.inputWrapperError]}>
        {/* Country Code with Flag - Clickable */}
        <CountryCodePicker
          value={countryCode}
          onChange={(code) => {
            setValue('countryCode', code);
          }}
          hideLabel={true}
          renderTrigger={({ selected, open }) => (
            <TouchableOpacity
              style={styles.countryCodeContainer}
              onPress={open}
              activeOpacity={0.7}
            >
              <Text style={styles.flagEmoji}>{selected.flag}</Text>
              <Text style={styles.countryCodeText}>{selected.code}</Text>
            </TouchableOpacity>
          )}
        />
        
        {/* Divider */}
        <View style={styles.phoneDivider} />
        
        {/* Phone Number Input */}
        <TextInput
          value={localNumber}
          onChangeText={(text) => {
            setValue('localNumber', text.replace(/\D/g, ''));
          }}
          onBlur={() => {
            setTouched('localNumber', true);
          }}
          placeholder=""
          placeholderTextColor="#999999"
          style={styles.phoneInput}
          keyboardType="phone-pad"
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

// Submit Button Component
const SubmitButton: React.FC<{
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
}> = ({ onSubmit }) => {
  const { validateForm, values, isSubmitting } = useFormContext();
  const handlePress = useCallback(() => {
    const ok = validateForm();
    if (!ok) return;
    onSubmit(values);
  }, [validateForm, values, onSubmit]);

  return (
    <TouchableOpacity
      style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
      onPress={handlePress}
      disabled={isSubmitting}
      activeOpacity={0.8}
    >
      <Text style={styles.submitButtonText}>
        {isSubmitting ? 'Submitting...' : 'Submit request'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#FEFEFE',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    letterSpacing: -0.44,
    lineHeight: 22,
    color: '#2C2235',
    fontFamily: 'Figtree-Bold',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 21,
    paddingTop: 24,
    paddingBottom: 40,
  },
  // General Referral Card Styles
  generalReferralCard: {
    backgroundColor: '#2C2235',
    borderRadius: 12,
    height: 92,
    marginBottom: 15,
    paddingHorizontal: 30,
    paddingTop: 18,
    paddingBottom: 18,
    justifyContent: 'center',
  },
  generalReferralTitle: {
    fontSize: 16,
    letterSpacing: -0.32,
    lineHeight: 14,
    color: '#FFFFFF',
    fontFamily: 'Figtree-Bold',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  generalReferralSubtitle: {
    fontSize: 14,
    letterSpacing: -0.28,
    lineHeight: 18,
    color: '#FFFFFF',
    fontFamily: 'Figtree-Regular',
  },
  // Group Card Styles
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    height: 92,
    marginBottom: 15,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  groupImageContainer: {
    width: 92,
    height: 92,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    overflow: 'hidden',
  },
  groupImage: {
    width: '100%',
    height: '100%',
  },
  groupInfo: {
    flex: 1,
    paddingLeft: 12,
    paddingTop: 15,
    paddingRight: 12,
    paddingBottom: 15,
    position: 'relative',
  },
  groupTitle: {
    fontSize: 14,
    letterSpacing: -0.28,
    lineHeight: 14,
    color: '#271D30',
    fontFamily: 'Figtree-Bold',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  groupDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupDetailText: {
    fontSize: 9,
    letterSpacing: -0.18,
    lineHeight: 11,
    color: '#2C2235',
    fontFamily: 'Figtree-Regular',
    marginLeft: 4,
  },
  memberBadge: {
    position: 'absolute',
    right: 12,
    bottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 217, 217, 0.8)',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  memberCount: {
    fontSize: 14,
    letterSpacing: -0.42,
    lineHeight: 18,
    color: '#2C2235',
    fontFamily: 'Avenir-Medium',
    fontWeight: '500',
    marginLeft: 4,
  },
  // Description
  description: {
    fontSize: 16,
    letterSpacing: -0.32,
    lineHeight: 22,
    color: '#2C2235',
    fontFamily: 'Figtree-Regular',
    marginBottom: 24,
  },
  // Privacy Notice
  privacyNotice: {
    backgroundColor: 'rgba(255, 0, 131, 0.08)',
    borderRadius: 16,
    padding: 23,
    marginBottom: 24,
  },
  privacyNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  privacyNoticeTitle: {
    fontSize: 16,
    letterSpacing: -0.32,
    lineHeight: 16,
    color: '#2C2235',
    fontFamily: 'Figtree-Bold',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  privacyNoticeText: {
    fontSize: 16,
    letterSpacing: -0.32,
    lineHeight: 20,
    color: '#2C2235',
    fontFamily: 'Figtree-Regular',
  },
  // Form Field Styles
  fieldContainer: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 14,
    letterSpacing: -0.28,
    lineHeight: 16,
    color: '#2C2235',
    fontFamily: 'Figtree-Medium',
    fontWeight: '500',
    marginBottom: 12,
  },
  required: {
    color: '#FF0083',
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 17,
    justifyContent: 'center',
  },
  inputWrapperError: {
    borderColor: '#FF0083',
  },
  textInput: {
    fontSize: 16,
    letterSpacing: -0.32,
    lineHeight: 24,
    color: '#2C2235',
    fontFamily: 'Figtree-Medium',
    fontWeight: '500',
    padding: 0,
  },
  // Phone Input Styles
  phoneInputWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 17,
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 17,
    paddingRight: 12,
  },
  flagEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  countryCodeText: {
    fontSize: 18,
    letterSpacing: 0,
    lineHeight: 24,
    color: '#000000',
    fontFamily: 'Figtree-Regular',
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#EAEAEA',
    marginHorizontal: 12,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    letterSpacing: -0.32,
    lineHeight: 24,
    color: '#2C2235',
    fontFamily: 'Figtree-Regular',
    padding: 0,
  },
  // Text Area Styles
  textAreaWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    minHeight: 158,
    paddingHorizontal: 17,
    paddingTop: 19,
    paddingBottom: 12,
  },
  textArea: {
    fontSize: 16,
    letterSpacing: -0.32,
    lineHeight: 22,
    color: '#2C2235',
    fontFamily: 'Figtree-Medium',
    fontWeight: '500',
    padding: 0,
    minHeight: 100,
  },
  characterCount: {
    fontSize: 14,
    letterSpacing: -0.28,
    lineHeight: 16,
    color: '#2C2235',
    fontFamily: 'Figtree-Medium',
    fontWeight: '500',
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#FF0083',
    marginTop: 4,
    fontFamily: 'Figtree-Regular',
  },
  // Footer Note
  footerNote: {
    fontSize: 14,
    letterSpacing: -0.28,
    lineHeight: 18,
    color: '#2C2235',
    fontFamily: 'Figtree-Regular',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  // Submit Button
  submitButton: {
    backgroundColor: '#2C2235',
    borderRadius: 100,
    height: 42,
    width: 278,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 16,
    color: '#FFFFFF',
    fontFamily: 'Figtree-Bold',
    fontWeight: 'bold',
  },
});
