import React, { useEffect, useMemo } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AuthLoadingAnimation } from '@/components/auth/AuthLoadingAnimation';
import { useTheme } from '@/theme/provider/useTheme';

const LOADER_DURATION_MS = 2000;

export default function OnboardingLoaderScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/(auth)/onboarding');
    }, LOADER_DURATION_MS);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.primary} />
      <View style={styles.body}>
        <AuthLoadingAnimation />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  });

