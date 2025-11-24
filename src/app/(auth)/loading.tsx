import React, { useMemo } from 'react';
import { SafeAreaView, StyleSheet, StatusBar, View } from 'react-native';
import { AuthLoadingAnimation } from '@/components/auth/AuthLoadingAnimation';
import { useTheme } from '@/theme/provider/useTheme';

export default function AuthLoadingScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

