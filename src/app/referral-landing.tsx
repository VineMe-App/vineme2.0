import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/ui/Text';
import { Header } from '../components/ui/Header';
import { CTACard } from '../components/ui/CTACard';
import {
  ReferralFormData,
} from '../components/referrals/ReferralFormModal';
import { referralService } from '../services/referrals';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme/provider/useTheme';

export default function ReferralLandingPage() {
  const [showGeneralReferralModal, setShowGeneralReferralModal] =
    useState(false);
  const { userProfile } = useAuth();
  const { theme } = useTheme();

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
    <>
      <Stack.Screen
        options={{
          header: () => <Header title="Connect Someone" />,
        }}
      />
      <ScrollView
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.questionSection}>
            <Text variant="h4" weight="semiBold" style={styles.questionTitle}>
              Do you want to connect/refer someone else to a group?
            </Text>
            <Text
              variant="bodyLarge"
              color="secondary"
              style={styles.questionSubtitle}
            >
              Choose the option that best fits their situation
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            <CTACard
              title="Yes, I know a group that fits"
              description='Browse groups to find the right fit, then use the "Refer a friend" button on the group page to connect them directly'
              iconName="people-outline"
              iconColor="#007AFF"
              iconSize={32}
              onPress={handleGroupReferral}
              variant="default"
              style={styles.ctaCard}
            />

            <CTACard
              title="No specific group fits"
              description="Connect them to the community and our team will help match them with groups that fit their interests"
              iconName="help-circle-outline"
              iconColor="#ff0083"
              iconSize={32}
              onPress={handleGeneralReferral}
              variant="default"
            />
          </View>

          <View style={styles.infoSection}>
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: theme.colors.surface.secondary,
                  borderColor: theme.colors.border.primary,
                },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#6b7280"
              />
              <Text variant="body" color="secondary" style={styles.infoText}>
                Both options will create an account for the person you're
                referring and send them an email to complete their setup.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.instructionsSection,
              {
                backgroundColor: theme.colors.surface.primary,
                borderColor: theme.colors.border.primary,
              },
            ]}
          >
            <Text
              variant="h5"
              weight="semiBold"
              style={styles.instructionsTitle}
            >
              How it works:
            </Text>
            <View style={styles.instructionsList}>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text
                    variant="bodySmall"
                    weight="semiBold"
                    style={styles.instructionNumberText}
                  >
                    1
                  </Text>
                </View>
                <Text
                  variant="body"
                  color="secondary"
                  style={styles.instructionText}
                >
                  Choose whether you know a specific group that fits or want a
                  general referral
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text
                    variant="bodySmall"
                    weight="semiBold"
                    style={styles.instructionNumberText}
                  >
                    2
                  </Text>
                </View>
                <Text
                  variant="body"
                  color="secondary"
                  style={styles.instructionText}
                >
                  Provide their contact information and any helpful context
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text
                    variant="bodySmall"
                    weight="semiBold"
                    style={styles.instructionNumberText}
                  >
                    3
                  </Text>
                </View>
                <Text
                  variant="body"
                  color="secondary"
                  style={styles.instructionText}
                >
                  They'll receive an email to verify their account and complete
                  setup
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* General referral now handled via dedicated page */}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  questionSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  questionTitle: {
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  questionSubtitle: {
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  ctaCard: {
    marginBottom: 16,
  },
  infoSection: {
    marginTop: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  infoText: {
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  instructionsSection: {
    marginTop: 24,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  instructionsTitle: {
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
    color: '#fff',
  },
  instructionText: {
    lineHeight: 20,
    flex: 1,
  },
});
