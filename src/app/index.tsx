import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthLoadingAnimation } from '../components/auth/AuthLoadingAnimation';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

export default function IndexScreen() {
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized) {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/welcome');
      }
    }
  }, [user, isInitialized]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>VineMe</Text>
      <Text style={styles.subtitle}>Church Community App</Text>
      <AuthLoadingAnimation />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  loader: {
    marginTop: 16,
  },
});
