import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AuthLoadingAnimation } from '@/components/auth/AuthLoadingAnimation';
import { useAuthStore } from '@/stores/auth';

const LOADER_DURATION_MS = 2000;

export default function OnboardingLoaderScreen() {
  const { userProfile } = useAuthStore();

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Landing here doesn't mean "new user" - the root layout sends any
      // not-yet-onboarded-as-far-as-we-know user here while userProfile is still
      // loading. Check the real state instead of assuming onboarding is needed.
      const target = userProfile?.onboarding_complete
        ? '/(tabs)'
        : '/(auth)/onboarding';
      router.replace(target);
    }, LOADER_DURATION_MS);

    return () => clearTimeout(timeout);
  }, [userProfile]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.body}>
        <AuthLoadingAnimation />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

