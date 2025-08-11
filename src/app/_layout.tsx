import React, { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryProvider } from '@/providers/QueryProvider';
import { useAuthStore } from '@/stores/auth';
import { STORAGE_KEYS } from '@/utils/constants';
import { ErrorBoundary, OfflineBanner } from '@/components';

function RootLayoutNav() {
  const segments = useSegments();
  const { user, userProfile, isInitialized, initialize } = useAuthStore();
  const [onboardingCompleted, setOnboardingCompleted] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    // Initialize auth state when app starts
    initialize();
    checkOnboardingStatus();
  }, [initialize]);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(
        STORAGE_KEYS.ONBOARDING_COMPLETED
      );
      setOnboardingCompleted(completed === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setOnboardingCompleted(false);
    }
  };

  useEffect(() => {
    if (!isInitialized || onboardingCompleted === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inOnboarding = segments[1] === 'onboarding';

    if (user) {
      // User is authenticated
      if (!onboardingCompleted && !inOnboarding) {
        // User needs onboarding
        router.replace('/(auth)/onboarding');
      } else if (onboardingCompleted && !inTabsGroup) {
        // User completed onboarding, go to main app
        router.replace('/(tabs)');
      }
    } else if (!inAuthGroup) {
      // User is not signed in and not in auth group, redirect to sign in
      router.replace('/(auth)/sign-in');
    }
  }, [user, userProfile, segments, isInitialized, onboardingCompleted]);

  return (
    <>
      <OfflineBanner />
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <RootLayoutNav />
      </QueryProvider>
    </ErrorBoundary>
  );
}
