import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AuthLoadingAnimation } from '@/components/auth/AuthLoadingAnimation';

const LOADER_DURATION_MS = 2000;

export default function OnboardingLoaderScreen() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/(auth)/onboarding');
    }, LOADER_DURATION_MS);

    return () => clearTimeout(timeout);
  }, []);

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

