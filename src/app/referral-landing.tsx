import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  ReferralFormModal,
  ReferralFormData,
} from '../components/referrals/ReferralFormModal';
import { referralService } from '../services/referrals';
import { useAuth } from '../hooks/useAuth';

export default function ReferralLandingPage() {
  const [showGeneralReferralModal, setShowGeneralReferralModal] =
    useState(false);
  const { userProfile } = useAuth();

  const handleGeneralReferral = useCallback(() => {
    if (!userProfile) {
      Alert.alert(
        'Authentication Required',
        'You need to be signed in to refer someone.',
        [{ text: 'OK' }]
      );
      return;
    }
    // Navigate to referral page without group context
    router.push('/referral');
  }, [userProfile]);

  const handleGroupReferral = useCallback(() => {
    // Navigate to groups page where user can find a group and use "Refer a friend" button
    router.push('/(tabs)/groups');
  }, []);

  const handleGeneralReferralSubmit = useCallback(
    async (data: ReferralFormData) => {
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      const result = await referralService.createGeneralReferral({
        email: data.email,
        phone: data.phone,
        note: data.note,
        firstName: data.firstName,
        lastName: data.lastName,
        referrerId: userProfile.id,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create referral');
      }

      // Show success message
      Alert.alert(
        'Referral Sent!',
        "We've created an account for the person you referred and sent them an email to complete their setup. They'll be marked as a newcomer so our team can help them find the right group.",
        [{ text: 'OK' }]
      );
    },
    [userProfile]
  );

  const handleCloseGeneralReferralModal = useCallback(() => {
    setShowGeneralReferralModal(false);
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connect Someone</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.questionSection}>
          <Text style={styles.questionTitle}>
            Do you want to connect/refer someone else to a group?
          </Text>
          <Text style={styles.questionSubtitle}>
            Choose the option that best fits their situation
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity onPress={handleGroupReferral} activeOpacity={0.8}>
            <Card style={styles.optionCard}>
              <View style={styles.optionContent}>
                <View style={styles.optionIconContainer}>
                  <Ionicons name="people-outline" size={32} color="#007AFF" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>
                    Yes, I know a group that fits
                  </Text>
                  <Text style={styles.optionDescription}>
                    Browse groups to find the right fit, then use the "Refer a
                    friend" button on the group page to connect them directly
                  </Text>
                </View>
                <View style={styles.chevronContainer}>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={20}
                    color="#6b7280"
                  />
                </View>
              </View>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleGeneralReferral} activeOpacity={0.8}>
            <Card style={styles.optionCard}>
              <View style={styles.optionContent}>
                <View style={styles.optionIconContainer}>
                  <Ionicons
                    name="help-circle-outline"
                    size={32}
                    color="#ff0083"
                  />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>No specific group fits</Text>
                  <Text style={styles.optionDescription}>
                    Connect them to the community and our team will help match
                    them with groups that fit their interests
                  </Text>
                </View>
                <View style={styles.chevronContainer}>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={20}
                    color="#6b7280"
                  />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#6b7280"
            />
            <Text style={styles.infoText}>
              Both options will create an account for the person you're
              referring and send them an email to complete their setup.
            </Text>
          </View>
        </View>

        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>How it works:</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                Choose whether you know a specific group that fits or want a
                general referral
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                Provide their contact information and any helpful context
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                They'll receive an email to verify their account and complete
                setup
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* General referral now handled via dedicated page */}
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
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  content: {
    padding: 20,
  },
  questionSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  questionSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  chevronContainer: {
    marginLeft: 12,
  },
  infoSection: {
    marginTop: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  instructionsSection: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  instructionNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  instructionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    flex: 1,
  },
});
