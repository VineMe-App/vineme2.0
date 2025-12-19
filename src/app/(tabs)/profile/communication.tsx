import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text as RNText,
  TextInput,
  Alert,
  Platform,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/provider/useTheme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useAuthStore } from '@/stores/auth';
import {
  useNotificationSettings,
  useNotificationPermissions,
} from '@/hooks/useNotifications';
import { useUserGroupMemberships, useUserProfile } from '@/hooks/useUsers';
import {
  registerForPushNotifications,
  unregisterFromPushNotifications,
} from '@/services/notifications';
import { CountryCodePicker } from '@/components/ui/CountryCodePicker';
import { OtpInput } from '@/components/ui/OtpInput';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '@/services/auth';

export default function CommunicationAndSecurityScreen() {
  const { user, userProfile: authUserProfile, linkEmail, linkPhone, verifyOtp, isLoading, loadUserProfile } =
    useAuthStore();
  const userId = user?.id || authUserProfile?.id;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  // Remove header
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.push('/(tabs)/profile');
    }
  }, [navigation]);
  
  // Get user profile from query hook to allow refetching
  const { data: userProfile, refetch: refetchUserProfile } = useUserProfile(userId);
  
  // Use queried profile or fallback to auth store profile
  const displayUserProfile = userProfile || authUserProfile;

  // Notification settings state
  const {
    settings,
    isLoading: settingsLoading,
    updateSettings,
    isUpdating,
  } = useNotificationSettings(userId);
  const { checkPermissions, requestPermissions } = useNotificationPermissions();
  
  // Get user's group memberships to check leadership status
  const { data: groupMemberships } = useUserGroupMemberships(userId);
  
  // Check if user is a leader of any group (including pending groups)
  const isGroupLeader = useMemo(() => {
    if (!groupMemberships) return false;
    return groupMemberships.some((membership: any) => membership.role === 'leader');
  }, [groupMemberships]);
  
  // Check if user is a leader of an approved group (for join requests)
  const isApprovedGroupLeader = useMemo(() => {
    if (!groupMemberships) return false;
    return groupMemberships.some(
      (membership: any) =>
        membership.role === 'leader' &&
        membership.group?.status === 'approved'
    );
  }, [groupMemberships]);
  
  const [localNotif, setLocalNotif] = useState({
    friend_requests: true,
    friend_request_accepted: true,
    group_requests: true,
    group_request_responses: true,
    join_requests: true,
    join_request_responses: true,
    event_reminders: true,
    push_notifications: true,
    email_notifications: false,
  });
  const [hasNotifChanges, setHasNotifChanges] = useState(false);
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);
  const hasDisabledReferralsRef = useRef(false);
  const hasSyncedSettingsRef = useRef(false);
  const referralDisableTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    checkPermissions()
      .then(setPushGranted)
      .catch(() => setPushGranted(null));
  }, [checkPermissions]);

  useEffect(() => {
    if (!settings) return;
    // Avoid overwriting in-progress edits during background refetches
    if (hasNotifChanges && hasSyncedSettingsRef.current) return;

    setLocalNotif({
      friend_requests: !!settings.friend_requests,
      friend_request_accepted: !!settings.friend_request_accepted,
      group_requests: !!settings.group_requests,
      group_request_responses: !!settings.group_request_responses,
      join_requests: !!settings.join_requests,
      join_request_responses: !!settings.join_request_responses,
      event_reminders: !!settings.event_reminders,
      push_notifications: !!settings.push_notifications,
      email_notifications: !!settings.email_notifications,
    });
    setHasNotifChanges(false);
    hasSyncedSettingsRef.current = true;
  }, [settings, hasNotifChanges]);

  // Disable referral_updates once when settings load (if enabled)
  useEffect(() => {
    if (settings?.referral_updates && !hasDisabledReferralsRef.current) {
      hasDisabledReferralsRef.current = true;
      // Defer to next tick to break render cycle
      referralDisableTimeoutRef.current = setTimeout(() => {
        updateSettings({ referral_updates: false });
        referralDisableTimeoutRef.current = null;
      }, 100);
    }
    return () => {
      if (referralDisableTimeoutRef.current) {
        clearTimeout(referralDisableTimeoutRef.current);
        referralDisableTimeoutRef.current = null;
      }
    };
    // Only depend on settings existence, not its contents to prevent loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!settings]);

  const toggleNotif = (key: keyof typeof localNotif) => {
    if (referralDisableTimeoutRef.current) {
      clearTimeout(referralDisableTimeoutRef.current);
      referralDisableTimeoutRef.current = null;
    }
    setLocalNotif((prev) => ({ ...prev, [key]: !prev[key] }));
    setHasNotifChanges(true);
  };

  const saveNotif = async () => {
    if (!userId) return;
    try {
      // Manage push token when toggled
      if (
        settings &&
        localNotif.push_notifications !== settings.push_notifications
      ) {
        if (localNotif.push_notifications) {
          const granted = await checkPermissions();
          if (!granted) {
            const req = await requestPermissions();
            if (!req) {
              Alert.alert(
                'Permission Required',
                'Please enable notifications in system settings.'
              );
            }
          }
          await registerForPushNotifications(userId);
          setPushGranted(true);
        } else {
          await unregisterFromPushNotifications(userId);
        }
      }

      // Always set referral_updates to false (temporarily disabled)
      await updateSettings({ 
        ...localNotif, 
        referral_updates: false 
      });
      Alert.alert('Saved', 'Notification settings updated.');
      setHasNotifChanges(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update notification settings.');
    }
  };

  // Security: email & phone linking
  const [emailStep, setEmailStep] = useState<'idle' | 'enter-email'>('idle');
  const [phoneStep, setPhoneStep] = useState<
    'idle' | 'enter-phone' | 'verify-code'
  >('idle');
  const [newEmail, setNewEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+44');
  const [localNumber, setLocalNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [fullPhone, setFullPhone] = useState('');

  // Email is stored in auth.users.email, not in the users table
  // So we prioritize user?.email from auth
  const currentEmail = user?.email || displayUserProfile?.email;
  
  // Format phone number - if UK number, ensure it's displayed with +44
  const formatPhoneNumber = (phone: string | undefined): string => {
    if (!phone) return '';
    // Remove any existing + or spaces
    const cleaned = phone.replace(/[\s+]/g, '');
    // If it starts with 44 (UK country code without +), format as +44
    if (cleaned.startsWith('44') && cleaned.length >= 12) {
      return `+${cleaned}`;
    }
    // If it already starts with +, return as is
    if (phone.startsWith('+')) {
      return phone;
    }
    // Otherwise return as is (might have country code already)
    return phone;
  };
  
  const currentPhone = formatPhoneNumber(displayUserProfile?.phone || user?.phone);

  // Load pending email from query params or AsyncStorage
  useEffect(() => {
    const loadPendingEmail = async () => {
      // First check query params (from deep link)
      if (params.email) {
        const decodedEmail = decodeURIComponent(params.email as string);
        setNewEmail(decodedEmail);
        setEmailStep('enter-email');
        // Clear the email param from URL after reading it
        router.setParams({ email: undefined });
        // Also clear from AsyncStorage if it exists
        await AsyncStorage.removeItem('pending_email_verification');
        
        // Force refresh the auth user to get updated email
        const refreshedUser = await authService.getCurrentUser();
        if (refreshedUser) {
          useAuthStore.setState({ user: refreshedUser });
        }
        
        // Refetch user profile to get the updated email from auth
        await Promise.all([
          refetchUserProfile(),
          loadUserProfile(),
        ]);
      } else {
        // Check AsyncStorage for pending email verification
        const storedEmail = await AsyncStorage.getItem('pending_email_verification');
        if (storedEmail) {
          setNewEmail(storedEmail);
          setEmailStep('enter-email');
          await AsyncStorage.removeItem('pending_email_verification');
          
          // Force refresh the auth user to get updated email
          const refreshedUser = await authService.getCurrentUser();
          if (refreshedUser) {
            useAuthStore.setState({ user: refreshedUser });
          }
          
          // Refetch user profile to get the updated email from auth
          await Promise.all([
            refetchUserProfile(),
            loadUserProfile(),
          ]);
        }
      }
    };
    loadPendingEmail();
  }, [params.email, refetchUserProfile, loadUserProfile]);

  const handleLinkEmail = async () => {
    if (!newEmail.trim())
      return Alert.alert('Error', 'Please enter your email address');
    if (!/\S+@\S+\.\S+/.test(newEmail))
      return Alert.alert('Error', 'Please enter a valid email address');
    const emailToLink = newEmail.trim();
    // Store the email in AsyncStorage so we can pre-fill it after verification
    await AsyncStorage.setItem('pending_email_verification', emailToLink);
    // Use default Supabase redirect URL (https://vineme.app/auth/verify-email)
    const redirectUrl = `https://vineme.app/auth/verify-email?redirect=/profile/communication&email=${encodeURIComponent(emailToLink)}`;
    const result = await linkEmail(emailToLink, { emailRedirectTo: redirectUrl });
    if (result.success) {
      setEmailStep('idle');
      setNewEmail('');
      await Promise.all([
        refetchUserProfile(),
        loadUserProfile(),
      ]);
      Alert.alert('Success', 'Verification email sent! Please check your inbox.');
    } else {
      Alert.alert('Error', result.error || 'Failed to link email');
    }
  };

  const handleLinkPhone = async () => {
    const phone = `${countryCode}${localNumber.replace(/\D/g, '')}`;
    setFullPhone(phone);
    const result = await linkPhone(phone);
    if (result.success) {
      setPhoneStep('verify-code');
      Alert.alert(
        'Verification Sent',
        'Please check your phone for the verification code.'
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to link phone');
    }
  };

  const handleVerifyPhone = async () => {
    if (phoneCode.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    const result = await verifyOtp(fullPhone, phoneCode, 'sms');
    if (result.success) {
      setPhoneStep('idle');
      setLocalNumber('');
      setPhoneCode('');
      // Refetch user profile to update phone display
      await Promise.all([
        refetchUserProfile(),
        loadUserProfile(),
      ]);
      Alert.alert('Success', 'Phone has been linked to your account!');
    } else {
      Alert.alert('Verification Failed', result.error || 'Invalid code');
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: '#FFFFFF' },
      ]}
      edges={['left', 'right', 'bottom']}
    >
      <View style={[styles.header, { paddingTop: insets.top + 5 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color="#2C2235" />
        </TouchableOpacity>
        <Text style={styles.title}>Communication & Security</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Notifications Section */}
        <Card style={styles.card} shadow="none">
          <Text style={styles.cardTitle}>Notification Preferences</Text>
          {settingsLoading && !settings ? (
            <RNText>Loading...</RNText>
          ) : (
            <>
              <View style={styles.settingItem}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => toggleNotif('push_notifications')}
                  activeOpacity={0.85}
                >
                  <View style={styles.checkboxContainer}>
                    <Text style={styles.checkboxLabel}>
                      {`Enable push notifications${Platform.OS === 'android' ? ' (requires Google Play services)' : ''}`}
                    </Text>
                    <View style={[styles.checkbox, localNotif.push_notifications && styles.checkboxChecked]}>
                      {localNotif.push_notifications && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionLabel}>Friends</Text>
              <View style={styles.settingItem}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => toggleNotif('friend_requests')}
                  activeOpacity={0.85}
                >
                  <View style={styles.checkboxContainer}>
                    <Text style={styles.checkboxLabel}>Friend request received</Text>
                    <View style={[styles.checkbox, localNotif.friend_requests && styles.checkboxChecked]}>
                      {localNotif.friend_requests && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
              <View style={styles.settingItem}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => toggleNotif('friend_request_accepted')}
                  activeOpacity={0.85}
                >
                  <View style={styles.checkboxContainer}>
                    <Text style={styles.checkboxLabel}>Friend request accepted</Text>
                    <View style={[styles.checkbox, localNotif.friend_request_accepted && styles.checkboxChecked]}>
                      {localNotif.friend_request_accepted && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionLabel}>Groups</Text>
              {(displayUserProfile?.roles?.includes('church_admin') || displayUserProfile?.roles?.includes('superadmin')) && (
                <View style={styles.settingItem}>
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => toggleNotif('group_requests')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.checkboxContainer}>
                      <Text style={styles.checkboxLabel}>Group creation notifications</Text>
                      <View style={[styles.checkbox, localNotif.group_requests && styles.checkboxChecked]}>
                        {localNotif.group_requests && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
              {isGroupLeader && (
                <View style={styles.settingItem}>
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => toggleNotif('group_request_responses')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.checkboxContainer}>
                      <Text style={styles.checkboxLabel}>Group approved notifications</Text>
                      <View style={[styles.checkbox, localNotif.group_request_responses && styles.checkboxChecked]}>
                        {localNotif.group_request_responses && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
              {isApprovedGroupLeader && (
                <View style={styles.settingItem}>
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => toggleNotif('join_requests')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.checkboxContainer}>
                      <Text style={styles.checkboxLabel}>Join requests</Text>
                      <View style={[styles.checkbox, localNotif.join_requests && styles.checkboxChecked]}>
                        {localNotif.join_requests && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.settingItem}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => toggleNotif('join_request_responses')}
                  activeOpacity={0.85}
                >
                  <View style={styles.checkboxContainer}>
                    <Text style={styles.checkboxLabel}>Group accepted notifications</Text>
                    <View style={[styles.checkbox, localNotif.join_request_responses && styles.checkboxChecked]}>
                      {localNotif.join_request_responses && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Event reminders hidden for now - keeping code for future use */}
              {/* <View style={styles.settingItem}>
                <Checkbox
                  checked={localNotif.event_reminders}
                  onPress={() => toggleNotif('event_reminders')}
                  label="Event reminders"
                />
              </View> */}

              <View style={styles.actionsRow}>
                <Button
                  title="Save Notifications"
                  onPress={saveNotif}
                  loading={isUpdating}
                  disabled={!hasNotifChanges || isUpdating}
                />
              </View>
            </>
          )}
        </Card>

        {/* Security Section */}
        <Card style={styles.card} shadow="none">
          <Text style={styles.cardTitle}>Email & Phone Connections</Text>

          {/* Email */}
          <View style={styles.credBlock}>
            <View style={styles.labelValueRow}>
              <Text style={styles.label}>Email</Text>
              {currentEmail ? (
                <Text style={styles.currentValue} numberOfLines={1} ellipsizeMode="tail">
                  {currentEmail}
                </Text>
              ) : (
                <Text style={styles.noCredential}>No email linked</Text>
              )}
            </View>
            {emailStep === 'idle' ? (
              <Button
                title={currentEmail ? 'Update Email' : 'Link Email'}
                onPress={() => setEmailStep('enter-email')}
                variant="secondary"
                style={styles.inlineBtn}
              />
            ) : (
              <View style={styles.inputSection}>
                <TextInput
                  value={newEmail}
                  onChangeText={setNewEmail}
                  style={styles.input}
                  keyboardType="email-address"
                  placeholder="Enter new email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <View style={styles.actionsRow}>
                  <View style={styles.actionButton}>
                    <Button
                      title="Cancel"
                      onPress={() => {
                        setEmailStep('idle');
                        setNewEmail('');
                      }}
                      variant="secondary"
                    />
                  </View>
                  <View style={styles.actionButton}>
                    <Button
                      title="Send Code"
                      onPress={handleLinkEmail}
                      loading={isLoading}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Phone */}
          <View style={[styles.credBlock, { marginTop: 16 }]}>
            <View style={styles.labelValueRow}>
              <Text style={styles.label}>Contact Details</Text>
              {currentPhone ? (
                <Text style={styles.currentValue} numberOfLines={1} ellipsizeMode="tail">
                  {currentPhone}
                </Text>
              ) : (
                <Text style={styles.noCredential}>No phone linked</Text>
              )}
            </View>
            {phoneStep === 'idle' && (
              <Button
                title={currentPhone ? 'Update Phone' : 'Link Phone'}
                onPress={() => setPhoneStep('enter-phone')}
                variant="secondary"
                style={styles.inlineBtn}
              />
            )}

            {phoneStep === 'enter-phone' && (
              <View style={styles.inputSection}>
                <CountryCodePicker
                  value={countryCode}
                  onChange={setCountryCode}
                  label="Country"
                />
                <TextInput
                  value={localNumber}
                  onChangeText={(t) => setLocalNumber(t.replace(/\D/g, ''))}
                  style={[styles.input, { marginTop: 12 }]}
                  keyboardType="phone-pad"
                  placeholder="7123456789"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <View style={styles.actionsRow}>
                  <View style={styles.actionButton}>
                    <Button
                      title="Cancel"
                      onPress={() => {
                        setPhoneStep('idle');
                        setLocalNumber('');
                      }}
                      variant="secondary"
                    />
                  </View>
                  <View style={styles.actionButton}>
                    <Button
                      title="Send Code"
                      onPress={handleLinkPhone}
                      loading={isLoading}
                    />
                  </View>
                </View>
              </View>
            )}

            {phoneStep === 'verify-code' && (
              <View style={styles.inputSection}>
                <Text style={styles.helperText}>
                  Enter code sent to {fullPhone}
                </Text>
                <OtpInput
                  value={phoneCode}
                  onChange={(t) =>
                    setPhoneCode(t.replace(/\D/g, '').slice(0, 6))
                  }
                  length={6}
                />
                <View style={styles.actionsRow}>
                  <View style={styles.actionButton}>
                    <Button
                      title="Cancel"
                      onPress={() => {
                        setPhoneStep('idle');
                        setLocalNumber('');
                        setPhoneCode('');
                      }}
                      variant="secondary"
                    />
                  </View>
                  <View style={styles.actionButton}>
                    <Button
                      title="Verify"
                      onPress={handleVerifyPhone}
                      loading={isLoading}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        </Card>

        {/* Policies Section */}
        <Card style={styles.card} shadow="none">
          <Text style={styles.cardTitle}>Policies</Text>
          <TouchableOpacity
            style={styles.policyLink}
            onPress={() => {
              Linking.openURL('https://hexagonal-aunt-16f.notion.site/VineMe-T-Cs-40a1160f674f4e87837f70e8513b558a');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.policyLinkText}>Terms & Conditions</Text>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.policyLink}
            onPress={() => {
              Linking.openURL('https://hexagonal-aunt-16f.notion.site/VineMe-Privacy-Policy-1b7eccb261fd4a4fa053f8c5d09bd7ca');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.policyLinkText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 22, // Figma: 22px
    fontWeight: '700', // Bold
    color: '#2C2235', // Figma: #2c2235
    letterSpacing: -0.44, // Figma: -0.44px
    lineHeight: 22,
    marginLeft: 12,
  },
  content: { padding: 16 },
  card: { 
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E7EA',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  cardTitle: {
    fontSize: 16, // Match profile page font size
    fontWeight: '700', // Bold
    color: '#2C2235', // Match profile page
    letterSpacing: -0.32, // Match profile page
    lineHeight: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 16, // Match profile page font size
    fontWeight: '600', // SemiBold
    color: '#2C2235', // Match profile page
    letterSpacing: -0.32, // Match profile page
    lineHeight: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  settingItem: { marginBottom: 10 },
  checkboxRow: {
    marginBottom: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2C2235',
    borderColor: '#2C2235',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 12,
    includeFontPadding: false,
  },
  checkboxLabel: {
    fontSize: 14, // Match profile page font size
    color: '#2C2235',
    fontWeight: '600', // SemiBold
    flex: 1,
    letterSpacing: -0.32, // Match profile page
    lineHeight: 16,
  },
  actionsRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 8,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
  labelValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: { 
    fontSize: 14, // Match profile page font size
    fontWeight: '600', // SemiBold
    color: '#2C2235', 
    letterSpacing: -0.32, // Match profile page
    lineHeight: 16,
  },
  currentValue: { 
    fontSize: 14, // Match profile page font size
    fontWeight: '600', // SemiBold
    color: '#2C2235', 
    letterSpacing: -0.32, // Match profile page
    lineHeight: 16,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  noCredential: {
    fontSize: 14, // Match profile page font size
    color: '#999999', // Match profile page secondary color
    fontWeight: '500', // Medium
    letterSpacing: -0.32,
    lineHeight: 16,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  inlineBtn: { marginTop: 4 },
  inputSection: { marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  helperText: {
    fontSize: 16, // Match profile page font size
    color: '#999999', // Match profile page secondary color
    fontWeight: '500', // Medium
    letterSpacing: -0.32,
    lineHeight: 16,
    marginVertical: 8,
    textAlign: 'center',
  },
  credBlock: {},
  policyLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  policyLinkText: {
    fontSize: 16, // Match profile page font size
    color: '#2C2235',
    fontWeight: '600', // SemiBold
    letterSpacing: -0.32, // Match profile page
    lineHeight: 16,
  },
});
