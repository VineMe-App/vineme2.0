import React from 'react';
import { StyleSheet } from 'react-native';
import { CTACard } from '../ui/CTACard';

interface ConnectSomeoneSectionProps {
  onPress: () => void;
}

export function ConnectSomeoneSection({ onPress }: ConnectSomeoneSectionProps) {
  return (
    <CTACard
      title="Connect someone else in"
      description="Help someone join our community"
      iconName="person-add-outline"
      iconSize={24}
      onPress={onPress}
      variant="filled"
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
});
