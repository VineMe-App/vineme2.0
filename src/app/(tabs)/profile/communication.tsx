import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Text as RNText,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Text } from '@/components/ui/Text';
import { useAuthStore } from '@/stores/auth';
import { useNotificationSettings, useNotificationPermissions } from '@/hooks/useNotifications';
import { registerForPushNotifications, unregisterFromPushNotifications } from '@/services/notifications';
import { CountryCodePicker } from '@/components/ui/CountryCodePicker';
import { OtpInput } from '@/components/ui/OtpInput';
import { usePrivacySettings, useUpdatePrivacySettings } from '@/hooks/useContactAudit';

export default function CommunicationAndSecurityScreen() {
  const { user, userProfile, linkEmail, linkPhone, verifyOtp, isLoading } = useAuthStore();
  const userId = user?.id || userProfile?.id;

  // Notification settings state
  const { settings, isLoading: settingsLoading, updateSettings, isUpdating } = useNotificationSettings(userId);
  const { checkPermissions, requestPermissions } = useNotificationPermissions();
  const [localNotif, setLocalNotif] = useState({
    friend_requests: true,
    friend_request_accepted: true,
    group_requests: true,
    group_request_responses: true,
    join_requests: true,
    join_request_responses: true,
    referral_updates: true,
    event_reminders: true,
    push_notifications: true,
    email_notifications: false,
  });
  const [hasNotifChanges, setHasNotifChanges] = useState(false);
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);

  useEffect(() => {
    checkPermissions().then(setPushGranted).catch(() => setPushGranted(null));
  }, [checkPermissions]);

  useEffect(() => {
    if (settings) {
      setLocalNotif({
        friend_requests: !!settings.friend_requests,
        friend_request_accepted: !!settings.friend_request_accepted,
        group_requests: !!settings.group_requests,
        group_request_responses: !!settings.group_request_responses,
        join_requests: !!settings.join_requests,
        join_request_responses: !!settings.join_request_responses,
        referral_updates: !!settings.referral_updates,
        event_reminders: !!settings.event_reminders,
        push_notifications: !!settings.push_notifications,
        email_notifications: !!settings.email_notifications,
      });
      setHasNotifChanges(false);
    }
  }, [settings]);

  const toggleNotif = (key: keyof typeof localNotif) => {
    setLocalNotif((prev) => ({ ...prev, [key]: !prev[key] }));
    setHasNotifChanges(true);
  };

  const saveNotif = async () => {
    if (!userId) return;
    try {
      // Manage push token when toggled
      if (settings && localNotif.push_notifications !== settings.push_notifications) {
        if (localNotif.push_notifications) {
          const granted = await checkPermissions();
          if (!granted) {
            const req = await requestPermissions();
            if (!req) {
              Alert.alert('Permission Required', 'Please enable notifications in system settings.');
            }
          }
          await registerForPushNotifications(userId);
          setPushGranted(true);
        } else {
          await unregisterFromPushNotifications(userId);
        }
      }

      await updateSettings({ ...localNotif });
      Alert.alert('Saved', 'Notification settings updated.');
      setHasNotifChanges(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update notification settings.');
    }
  };

  // Security: email & phone linking
  const [emailStep, setEmailStep] = useState<'idle' | 'enter-email'>('idle');
  const [phoneStep, setPhoneStep] = useState<'idle' | 'enter-phone' | 'verify-code'>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [localNumber, setLocalNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [fullPhone, setFullPhone] = useState('');

  const currentEmail = user?.email || userProfile?.email;
  const currentPhone = user?.phone || userProfile?.phone;

  const handleLinkEmail = async () => {
    if (!newEmail.trim()) return Alert.alert('Error', 'Please enter your email address');
    if (!/\S+@\S+\.\S+/.test(newEmail)) return Alert.alert('Error', 'Please enter a valid email address');
    const result = await linkEmail(newEmail.trim());
    if (result.success) {
      setEmailStep('idle');
      setNewEmail('');
      Alert.alert('Success', 'Email has been linked to your account!');
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
      Alert.alert('Verification Sent', 'Please check your phone for the verification code.');
    } else {
      Alert.alert('Error', result.error || 'Failed to link phone');
    }
  };

  const handleVerifyPhone = async () => {
    const result = await verifyOtp(fullPhone, phoneCode, 'sms');
    if (result.success) {
      setPhoneStep('idle');
      setLocalNumber('');
      setPhoneCode('');
      Alert.alert('Success', 'Phone has been linked to your account!');
    } else {
      Alert.alert('Verification Failed', result.error || 'Invalid code');
    }
  };

  // Privacy: contact sharing with group leaders
  const { data: privacySettings, isLoading: privacyLoading } = usePrivacySettings(userId!);
  const updatePrivacyMutation = useUpdatePrivacySettings();
  const [allowEmailSharing, setAllowEmailSharing] = useState(true);
  const [allowPhoneSharing, setAllowPhoneSharing] = useState(true);
  const [allowContactByLeaders, setAllowContactByLeaders] = useState(true);
  const [hasPrivacyChanges, setHasPrivacyChanges] = useState(false);

  useEffect(() => {
    if (privacySettings) {
      setAllowEmailSharing(privacySettings.allow_email_sharing);
      setAllowPhoneSharing(privacySettings.allow_phone_sharing);
      setAllowContactByLeaders(privacySettings.allow_contact_by_leaders);
      setHasPrivacyChanges(false);
    }
  }, [privacySettings]);

  const togglePrivacy = (key: 'email' | 'phone' | 'leaders') => {
    setHasPrivacyChanges(true);
    if (key === 'leaders') {
      const next = !allowContactByLeaders;
      setAllowContactByLeaders(next);
      if (!next) {
        // If disabling leader contact, also disable specific channels
        setAllowEmailSharing(false);
        setAllowPhoneSharing(false);
      }
    } else if (key === 'email') {
      setAllowEmailSharing(!allowEmailSharing);
    } else if (key === 'phone') {
      setAllowPhoneSharing(!allowPhoneSharing);
    }
  };

  const savePrivacy = async () => {
    if (!userId) return;
    try {
      await updatePrivacyMutation.mutateAsync({
        userId,
        updates: {
          allow_email_sharing: allowEmailSharing,
          allow_phone_sharing: allowPhoneSharing,
          allow_contact_by_leaders: allowContactByLeaders,
        },
      });
      Alert.alert('Saved', 'Contact privacy settings updated.');
      setHasPrivacyChanges(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update privacy settings.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Communication & Security</Text>
          <Text style={styles.subtitle}>Manage notifications and sign-in connections</Text>
        </View>

        {/* Notifications Section */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Notification Preferences</Text>
          {settingsLoading && !settings ? (
            <RNText>Loading...</RNText>
          ) : (
            <>
              <View style={styles.settingItem}>
                <Checkbox
                  checked={localNotif.push_notifications}
                  onPress={() => toggleNotif('push_notifications')}
                  label={`Enable push notifications${Platform.OS === 'android' ? ' (requires Google Play services)' : ''}`}
                />
              </View>

              <Text style={styles.sectionLabel}>Friends</Text>
              <View style={styles.settingItem}><Checkbox checked={localNotif.friend_requests} onPress={() => toggleNotif('friend_requests')} label="Friend request received" /></View>
              <View style={styles.settingItem}><Checkbox checked={localNotif.friend_request_accepted} onPress={() => toggleNotif('friend_request_accepted')} label="Friend request accepted" /></View>

              <Text style={styles.sectionLabel}>Groups</Text>
              <View style={styles.settingItem}><Checkbox checked={localNotif.group_requests} onPress={() => toggleNotif('group_requests')} label="New group request (admins)" /></View>
              <View style={styles.settingItem}><Checkbox checked={localNotif.group_request_responses} onPress={() => toggleNotif('group_request_responses')} label="Group request responses" /></View>
              <View style={styles.settingItem}><Checkbox checked={localNotif.join_requests} onPress={() => toggleNotif('join_requests')} label="Join request received (leaders)" /></View>
              <View style={styles.settingItem}><Checkbox checked={localNotif.join_request_responses} onPress={() => toggleNotif('join_request_responses')} label="My join request responses" /></View>

              <Text style={styles.sectionLabel}>Referrals & Events</Text>
              <View style={styles.settingItem}><Checkbox checked={localNotif.referral_updates} onPress={() => toggleNotif('referral_updates')} label="Referral updates" /></View>
              <View style={styles.settingItem}><Checkbox checked={localNotif.event_reminders} onPress={() => toggleNotif('event_reminders')} label="Event reminders" /></View>

              <View style={styles.actionsRow}>
                <Button title="Save Notifications" onPress={saveNotif} loading={isUpdating} disabled={!hasNotifChanges || isUpdating} />
              </View>
            </>
          )}
        </Card>

        {/* Security Section */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Email & Phone Connections</Text>

          {/* Email */}
          <View style={styles.credBlock}>
            <Text style={styles.label}>Email</Text>
            {currentEmail ? (
              <Text style={styles.currentValue}>{currentEmail}</Text>
            ) : (
              <Text style={styles.noCredential}>No email linked</Text>
            )}
            {emailStep === 'idle' ? (
              <Button title={currentEmail ? 'Update Email' : 'Link Email'} onPress={() => setEmailStep('enter-email')} variant="secondary" style={styles.inlineBtn} />
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
                  <Button title="Cancel" onPress={() => { setEmailStep('idle'); setNewEmail(''); }} variant="secondary" />
                  <Button title="Send Code" onPress={handleLinkEmail} loading={isLoading} />
                </View>
              </View>
            )}
          </View>

          {/* Phone */}
          <View style={[styles.credBlock, { marginTop: 16 }]}> 
            <Text style={styles.label}>Phone</Text>
            {currentPhone ? (
              <Text style={styles.currentValue}>{currentPhone}</Text>
            ) : (
              <Text style={styles.noCredential}>No phone linked</Text>
            )}
            {phoneStep === 'idle' && (
              <Button title={currentPhone ? 'Update Phone' : 'Link Phone'} onPress={() => setPhoneStep('enter-phone')} variant="secondary" style={styles.inlineBtn} />
            )}

            {phoneStep === 'enter-phone' && (
              <View style={styles.inputSection}>
                <CountryCodePicker value={countryCode} onChange={setCountryCode} label="Country" />
                <TextInput
                  value={localNumber}
                  onChangeText={(t) => setLocalNumber(t.replace(/\D/g, ''))}
                  style={[styles.input, { marginTop: 12 }]}
                  keyboardType="phone-pad"
                  placeholder="5551234567"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <View style={styles.actionsRow}>
                  <Button title="Cancel" onPress={() => { setPhoneStep('idle'); setLocalNumber(''); }} variant="secondary" />
                  <Button title="Send Code" onPress={handleLinkPhone} loading={isLoading} />
                </View>
              </View>
            )}

            {phoneStep === 'verify-code' && (
              <View style={styles.inputSection}>
                <Text style={styles.helperText}>Enter code sent to {fullPhone}</Text>
                <OtpInput value={phoneCode} onChange={(t) => setPhoneCode(t.replace(/\D/g, '').slice(0, 4))} length={4} />
                <View style={styles.actionsRow}>
                  <Button title="Cancel" onPress={() => { setPhoneStep('idle'); setLocalNumber(''); setPhoneCode(''); }} variant="secondary" />
                  <Button title="Verify" onPress={handleVerifyPhone} loading={isLoading} />
                </View>
              </View>
            )}
          </View>
        </Card>

        {/* Privacy Section */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Contact Privacy</Text>
          {privacyLoading && !privacySettings ? (
            <RNText>Loading...</RNText>
          ) : (
            <>
              <View style={styles.settingItem}>
                <Checkbox
                  checked={allowContactByLeaders}
                  onPress={() => togglePrivacy('leaders')}
                  label="Allow group leaders to contact me"
                />
                <Text style={styles.helperText}>When enabled, leaders can access your contact info when you request to join.</Text>
              </View>

              {allowContactByLeaders && (
                <>
                  <View style={styles.settingItem}>
                    <Checkbox
                      checked={allowEmailSharing}
                      onPress={() => togglePrivacy('email')}
                      label="Share email address"
                    />
                  </View>
                  <View style={styles.settingItem}>
                    <Checkbox
                      checked={allowPhoneSharing}
                      onPress={() => togglePrivacy('phone')}
                      label="Share phone number"
                    />
                  </View>
                </>
              )}

              <View style={styles.actionsRow}>
                <Button
                  title="Save Privacy"
                  onPress={savePrivacy}
                  loading={updatePrivacyMutation.isPending}
                  disabled={!hasPrivacyChanges || updatePrivacyMutation.isPending}
                />
              </View>
            </>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  card: { marginBottom: 16, padding: 20 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 8 },
  settingItem: { marginBottom: 10 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  currentValue: { fontSize: 16, color: '#111827', marginBottom: 6 },
  noCredential: { fontSize: 14, color: '#6b7280', fontStyle: 'italic', marginBottom: 6 },
  inlineBtn: { marginTop: 4 },
  inputSection: { marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff' },
  helperText: { fontSize: 12, color: '#6b7280', marginVertical: 8, textAlign: 'center' },
  credBlock: {},
});
