import React from 'react';
import { SafeAreaView, StyleSheet, StatusBar, View } from 'react-native';
import { AuthLoadingAnimation } from '@/components/auth/AuthLoadingAnimation';

export default function AuthLoadingScreen() {
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

