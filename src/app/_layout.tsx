import React, { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar, Text as RNText } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as Font from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider } from '@/theme/provider';
import { useAuthStore } from '@/stores/auth';
import { STORAGE_KEYS } from '@/utils/constants';
import { ErrorBoundary, OfflineBanner } from '@/components';
import { DevToolsOverlay } from '@/components/devtools/DevToolsOverlay';

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
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Load fonts
  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          // Variable fonts for dynamic weights
          'Figtree-VariableFont_wght': require('../../assets/fonts/Figtree-VariableFont_wght.ttf'),
          'Figtree-Italic-VariableFont_wght': require('../../assets/fonts/Figtree-Italic-VariableFont_wght.ttf'),
          // Individual weight files for specific weights
          'Figtree-Regular': require('../../assets/fonts/Figtree-Regular.ttf'),
          'Figtree-Medium': require('../../assets/fonts/Figtree-Medium.ttf'),
          'Figtree-SemiBold': require('../../assets/fonts/Figtree-SemiBold.ttf'),
          'Figtree-Bold': require('../../assets/fonts/Figtree-Bold.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontsLoaded(true); // Continue even if fonts fail to load
      }
    }

    loadFonts();
  }, []);

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
    const inOnboardingLoader = segments[1] === 'onboarding-loader';
    const inPhoneAuthFlow =
      segments[1] === 'phone-signup' || segments[1] === 'phone-login';
    // Allow detail stacks outside of tabs (e.g., /group/[id], /event/[id], /admin/*)
    const inAllowedStacks =
      segments[0] === 'group' ||
      segments[0] === 'event' ||
      segments[0] === 'admin' ||
      segments[0] === 'user' ||
      segments[0] === 'group-management' ||
      // Allow notifications page outside of tabs
      segments[0] === 'notifications' ||
      // Allow referral page outside of tabs
      segments[0] === 'referral' ||
      // Allow referral landing screen outside of tabs
      segments[0] === 'referral-landing' ||
      // Allow friends page outside of tabs
      segments[0] === 'friends' ||
      // Allow styling system pages (for development/debugging)
      segments[0] === 'styling-system-example' ||
      segments[0] === 'styling-system-example-simple' ||
      segments[0] === 'styling-system-demo' ||
      segments[0] === 'styling-system-performance-demo';

    // Onboarding is done when profile exists and onboarding_complete === true on server.
    // If there is no profile yet, we must force onboarding regardless of any persisted flag.
    const hasProfile = !!userProfile;
    const isOnboardingDone = hasProfile
      ? userProfile.onboarding_complete === true
      : false;

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
      if (!isOnboardingDone && !(inOnboarding || inOnboardingLoader)) {
        const target = inPhoneAuthFlow
          ? '/(auth)/onboarding-loader'
          : '/(auth)/onboarding';
        if (__DEV__)
          console.log('[NavDebug] redirect ->', target);
        router.replace(target);
      } else if (isOnboardingDone && !(inTabsGroup || inAllowedStacks)) {
        if (__DEV__) console.log('[NavDebug] redirect -> /(tabs)');
        // User completed onboarding, go to main app
        router.replace('/(tabs)');
      }
    } else if (!inAuthGroup) {
      if (__DEV__) console.log('[NavDebug] redirect -> /(auth)/welcome');
      // User is not signed in and not in auth group, redirect to welcome
      router.replace('/(auth)/welcome');
    }
  }, [user, userProfile, segments, isInitialized, onboardingCompleted]);

  return (
    <>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerTitleStyle: {
            fontFamily: 'Figtree-Bold',
          },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: true }} />
        <Stack.Screen
          name="referral-landing"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="group" options={{ headerShown: false }} />
        <Stack.Screen name="event" options={{ headerShown: false }} />
        <Stack.Screen name="user" options={{ headerShown: false }} />
        <Stack.Screen
          name="group-management"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(auth)/onboarding-loader"
          options={{ headerShown: false }}
        />
      </Stack>
      {__DEV__ && <DevToolsOverlay />}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary>
          <StatusBar
            barStyle="dark-content"
            backgroundColor="white"
            translucent={false}
          />
          <ThemeProvider initialTheme="light">
            <QueryProvider>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </QueryProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
