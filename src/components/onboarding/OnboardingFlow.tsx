import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import type { OnboardingData, OnboardingStep } from '@/types/app';
import { useAuthStore } from '@/stores/auth';
import { STORAGE_KEYS } from '@/utils/constants';

import NameStep from './NameStep';
import ChurchStep from './ChurchStep';
import GroupStatusStep from './GroupStatusStep';
import InterestsStep from './InterestsStep';
import MeetingNightStep from './MeetingNightStep';

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'name',
    title: 'Your Name',
    component: NameStep,
  },
  {
    id: 'church',
    title: 'Select Church',
    component: ChurchStep,
  },
  {
    id: 'group-status',
    title: 'Group Status',
    component: GroupStatusStep,
  },
  {
    id: 'interests',
    title: 'Your Interests',
    component: InterestsStep,
  },
  {
    id: 'meeting-night',
    title: 'Meeting Preference',
    component: MeetingNightStep,
  },
];

export default function OnboardingFlow() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    name: '',
    church_id: undefined,
    service_id: undefined,
    interests: [],
    preferred_meeting_night: '',
    group_status: undefined,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createUserProfile, user } = useAuthStore();

  useEffect(() => {
    // Load any existing onboarding data from storage
    loadOnboardingData();
  }, []);

  const loadOnboardingData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(
        STORAGE_KEYS.ONBOARDING_DATA
      );
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setOnboardingData(parsedData);
      }
    } catch (error) {
      console.error('Error loading onboarding data:', error);
    }
  };

  const saveOnboardingData = async (data: OnboardingData) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.ONBOARDING_DATA,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  };

  const handleNext = async (stepData: Partial<OnboardingData>) => {
    const updatedData = { ...onboardingData, ...stepData };
    setOnboardingData(updatedData);
    setError(null);

    // Save data to local storage
    await saveOnboardingData(updatedData);

    if (__DEV__) {
      const step = ONBOARDING_STEPS[currentStepIndex]?.id;
      console.log('[Onboarding] Next pressed:', step, updatedData);
    }

    // If this is the last step, complete onboarding
    if (currentStepIndex === ONBOARDING_STEPS.length - 1) {
      await completeOnboarding(updatedData);
    } else {
      // Move to next step
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const completeOnboarding = async (data: OnboardingData) => {
    if (!user) {
      setError('No authenticated user found');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (__DEV__)
        console.log('[Onboarding] Creating user profile...', {
          hasUser: !!user,
        });
      // Create user profile in database
      const success = await createUserProfile({
        name: data.name,
        church_id: data.church_id,
        service_id: data.service_id,
        newcomer: data.group_status === 'looking',
      });

      if (!success) {
        if (__DEV__)
          console.log('[Onboarding] createUserProfile returned false');
        setError('Failed to create user profile. Please try again.');
        setIsLoading(false);
        return;
      }

      // Save onboarding completion status
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');

      // Clear onboarding data from storage
      await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_DATA);

      // Navigate to main app
      if (__DEV__) console.log('[Onboarding] Completed. Navigating to /(tabs)');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setError('Failed to complete onboarding. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const StepComponent = currentStep.component;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.progressContainer} testID="progress-container">
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100}%`,
              },
            ]}
          />
        </View>
        <View style={styles.stepIndicator}>
          <View style={styles.stepDots}>
            {ONBOARDING_STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.stepDot,
                  index <= currentStepIndex && styles.stepDotActive,
                ]}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.stepContainer}>
        <StepComponent
          data={onboardingData}
          onNext={handleNext}
          onBack={handleBack}
          isLoading={isLoading}
          error={error}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  stepIndicator: {
    marginTop: 12,
    alignItems: 'center',
  },
  stepDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  stepDotActive: {
    backgroundColor: '#007AFF',
  },
  stepContainer: {
    flex: 1,
  },
});
