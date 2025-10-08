import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { CountryCodePicker } from '@/components/ui/CountryCodePicker';
import { OtpInput } from '@/components/ui/OtpInput';
import { Card } from '@/components/ui/Card';

export default function ProfileSecurityScreen() {
  const router = useRouter();
  const { user, userProfile, linkEmail, linkPhone, verifyOtp, isLoading } =
    useAuthStore();

  const [emailStep, setEmailStep] = useState<'idle' | 'enter-email'>('idle');
  const [phoneStep, setPhoneStep] = useState<
    'idle' | 'enter-phone' | 'verify-code'
  >('idle');

  const [newEmail, setNewEmail] = useState('');

  const [countryCode, setCountryCode] = useState('+44');
  const [localNumber, setLocalNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [fullPhone, setFullPhone] = useState('');

  const handleLinkEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(newEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

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
      Alert.alert(
        'Verification Sent',
        'Please check your phone for the verification code.'
      );
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

  const currentEmail = user?.email || userProfile?.email;
  const currentPhone = user?.phone || userProfile?.phone;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Security Settings</Text>
          <Text style={styles.subtitle}>Manage your account credentials</Text>
        </View>

        {/* Email Section */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Email Address</Text>
          {currentEmail ? (
            <View style={styles.currentCredential}>
              <Text style={styles.currentValue}>{currentEmail}</Text>
              <Text style={styles.currentLabel}>Current email</Text>
            </View>
          ) : (
            <Text style={styles.noCredential}>No email linked</Text>
          )}

          {emailStep === 'idle' && (
            <Button
              title={currentEmail ? 'Update Email' : 'Link Email'}
              onPress={() => setEmailStep('enter-email')}
              variant="secondary"
              style={styles.actionButton}
            />
          )}

          {emailStep === 'enter-email' && (
            <View style={styles.inputSection}>
              <Text style={styles.label}>New Email Address</Text>
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
              <View style={styles.buttonRow}>
                <Button
                  title="Cancel"
                  onPress={() => {
                    setEmailStep('idle');
                    setNewEmail('');
                  }}
                  variant="secondary"
                  style={[styles.button, styles.buttonHalf]}
                />
                <Button
                  title="Send Code"
                  onPress={handleLinkEmail}
                  loading={isLoading}
                  style={[styles.button, styles.buttonHalf]}
                />
              </View>
            </View>
          )}
        </Card>

        {/* Phone Section */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Phone Number</Text>
          {currentPhone ? (
            <View style={styles.currentCredential}>
              <Text style={styles.currentValue}>{currentPhone}</Text>
              <Text style={styles.currentLabel}>Current phone</Text>
            </View>
          ) : (
            <Text style={styles.noCredential}>No phone linked</Text>
          )}

          {phoneStep === 'idle' && (
            <Button
              title={currentPhone ? 'Update Phone' : 'Link Phone'}
              onPress={() => setPhoneStep('enter-phone')}
              variant="secondary"
              style={styles.actionButton}
            />
          )}

          {phoneStep === 'enter-phone' && (
            <View style={styles.inputSection}>
              <CountryCodePicker
                value={countryCode}
                onChange={setCountryCode}
                label="Country"
              />
              <Text style={[styles.label, { marginTop: 16 }]}>
                Phone Number
              </Text>
              <TextInput
                value={localNumber}
                onChangeText={(text) => setLocalNumber(text.replace(/\D/g, ''))}
                style={styles.input}
                keyboardType="phone-pad"
                placeholder="7123456789"
                autoCapitalize="none"
                editable={!isLoading}
              />
              <View style={styles.buttonRow}>
                <Button
                  title="Cancel"
                  onPress={() => {
                    setPhoneStep('idle');
                    setLocalNumber('');
                  }}
                  variant="secondary"
                  style={[styles.button, styles.buttonHalf]}
                />
                <Button
                  title="Send Code"
                  onPress={handleLinkPhone}
                  loading={isLoading}
                  style={[styles.button, styles.buttonHalf]}
                />
              </View>
            </View>
          )}

          {phoneStep === 'verify-code' && (
            <View style={styles.inputSection}>
              <Text style={styles.label}>Enter 6-digit code</Text>
              <Text style={styles.helperText}>Sent to {fullPhone}</Text>
              <OtpInput
                value={phoneCode}
                onChange={(text) =>
                  setPhoneCode(text.replace(/\D/g, '').slice(0, 6))
                }
                length={6}
              />
              <View style={styles.buttonRow}>
                <Button
                  title="Cancel"
                  onPress={() => {
                    setPhoneStep('idle');
                    setLocalNumber('');
                    setPhoneCode('');
                  }}
                  variant="secondary"
                  style={[styles.button, styles.buttonHalf]}
                />
                <Button
                  title="Verify"
                  onPress={handleVerifyPhone}
                  loading={isLoading}
                  style={[styles.button, styles.buttonHalf]}
                />
              </View>
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    marginBottom: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  currentCredential: {
    marginBottom: 16,
  },
  currentValue: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  currentLabel: {
    fontSize: 14,
    color: '#666',
  },
  noCredential: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  actionButton: {
    marginTop: 8,
  },
  inputSection: {
    marginTop: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
  },
  buttonHalf: {
    flex: 1,
  },
  optionContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e5e5',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  verifyButton: {
    marginTop: 8,
  },
});
