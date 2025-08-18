import React, { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryProvider } from '@/providers/QueryProvider';
import { useAuthStore } from '@/stores/auth';
import { STORAGE_KEYS } from '@/utils/constants';
import { ErrorBoundary, OfflineBanner } from '@/components';
import { DevToolsOverlay } from '@/components/devtools/DevToolsOverlay';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { handleDeepLink } from '@/utils/deepLinking';
import { useNotifications } from '@/hooks/useNotifications';
import { logPlatformInfo } from '@/utils/platformTesting';
import '@/utils/globalErrorHandler'; // Initialize global error handler

function RootLayoutNav() {
  const segments = useSegments();
  const { user, userProfile, isInitialized, initialize } = useAuthStore();
  const [onboardingCompleted, setOnboardingCompleted] = useState<
    boolean | null
  >(null);

  // Initialize notifications
  useNotifications();

  useEffect(() => {
    // Initialize auth state when app starts
    initialize();
    checkOnboardingStatus();

    // Log platform information for debugging
    if (__DEV__) {
      logPlatformInfo();
    }

    // Handle deep links
    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        // Delay handling to ensure navigation is ready
        setTimeout(() => {
          handleDeepLink(initialUrl, router);
        }, 1000);
      }
    };

    handleInitialUrl();

    // Listen for incoming deep links while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url, router);
    });

    return () => {
      subscription?.remove();
    };
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
    // Allow detail stacks outside of tabs (e.g., /group/[id], /event/[id], /admin/*)
    const inAllowedStacks =
      segments[0] === 'group' ||
      segments[0] === 'event' ||
      segments[0] === 'admin' ||
      segments[0] === 'user';

    // Treat onboarding as done if a profile exists OR the persisted flag is set
    const isOnboardingDone = !!userProfile || onboardingCompleted;

    if (__DEV__) {
      console.log(
        '[NavDebug] isInitialized:',
        isInitialized,
        'onboardingCompleted:',
        onboardingCompleted
      );
      console.log('[NavDebug] segments:', segments);
      console.log('[NavDebug] user:', !!user, 'profile:', !!userProfile);
    }

    if (user) {
      // User is authenticated
      if (!isOnboardingDone && !inOnboarding) {
        if (__DEV__) console.log('[NavDebug] redirect -> /(auth)/onboarding');
        // User needs onboarding
        router.replace('/(auth)/onboarding');
      } else if (isOnboardingDone && !(inTabsGroup || inAllowedStacks)) {
        if (__DEV__) console.log('[NavDebug] redirect -> /(tabs)');
        // User completed onboarding, go to main app
        router.replace('/(tabs)');
      }
    } else if (!inAuthGroup) {
      if (__DEV__) console.log('[NavDebug] redirect -> /(auth)/sign-in');
      // User is not signed in and not in auth group, redirect to sign in
      router.replace('/(auth)/sign-in');
    }
  }, [user, userProfile, segments, isInitialized, onboardingCompleted]);

  return (
    <>
      <OfflineBanner />
      <EmailVerificationBanner />
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
      {__DEV__ && <DevToolsOverlay />}
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
