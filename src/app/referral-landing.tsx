import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/ui/Text';
import { useAuth } from '../hooks/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReferralLandingPage() {
  const { userProfile } = useAuth();
  const insets = useSafeAreaInsets();

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#2C2235" />
        </TouchableOpacity>
        <Text
          variant="h3"
          weight="bold"
          style={styles.headerTitle}
        >
          Connect a friend
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <Text
          variant="body"
          weight="normal"
          style={styles.description}
        >
          Choose the option that fits best. Both options will create an account
          for the person you refer and email them to finish setup.
        </Text>

        {/* Option Cards */}
        <View style={styles.optionsContainer}>
          {/* Option 1: Yes, I know a group that fits */}
          <TouchableOpacity
            onPress={handleGroupReferral}
            activeOpacity={0.8}
            style={styles.optionCard}
          >
            <View style={styles.optionContent}>
              <View style={styles.optionTextContainer}>
                <Text
                  variant="body"
                  weight="bold"
                  style={styles.optionTitle}
                >
                  Yes, I know a group that fits
                </Text>
                <Text
                  variant="bodySmall"
                  weight="normal"
                  style={styles.optionDescription}
                >
                  Browse and search groups, then use "Refer a friend" to
                  connect them.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward-outline"
                size={20}
                color="#2C2235"
                style={styles.chevronIcon}
              />
            </View>
          </TouchableOpacity>

          {/* Option 2: No specific group fits */}
          <TouchableOpacity
            onPress={handleGeneralReferral}
            activeOpacity={0.8}
            style={styles.optionCard}
          >
            <View style={styles.optionContent}>
              <View style={styles.optionTextContainer}>
                <Text
                  variant="body"
                  weight="bold"
                  style={styles.optionTitle}
                >
                  No specific group fits
                </Text>
                <Text
                  variant="bodySmall"
                  weight="normal"
                  style={styles.optionDescription}
                >
                  Connect them to the community, and our team will match them
                  with suitable groups.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward-outline"
                size={20}
                color="#2C2235"
                style={styles.chevronIcon}
              />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 21,
    paddingTop: 24,
    paddingBottom: 40,
  },
  description: {
    fontSize: 16,
    letterSpacing: -0.32,
    lineHeight: 20,
    color: '#2C2235',
    marginBottom: 25,
    fontFamily: 'Figtree-Regular',
  },
  optionsContainer: {
    gap: 10,
  },
  optionCard: {
    backgroundColor: '#F9FAFC',
    borderRadius: 12,
    paddingHorizontal: 33,
    paddingVertical: 31,
    minHeight: 120,
    justifyContent: 'center',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    letterSpacing: -0.32,
    lineHeight: 16,
    color: '#271D30',
    marginBottom: 12,
    fontFamily: 'Figtree-Bold',
  },
  optionDescription: {
    fontSize: 14,
    letterSpacing: -0.28,
    lineHeight: 18,
    color: '#2C2235',
    fontFamily: 'Figtree-Regular',
  },
  chevronIcon: {
    marginLeft: 'auto',
  },
});
