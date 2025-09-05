import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/provider/useTheme';

interface ConnectSomeoneSectionProps {
  onPress: () => void;
}

export function ConnectSomeoneSection({ onPress }: ConnectSomeoneSectionProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="person-add-outline"
              size={24}
              color={theme.colors.primary[500]}
            />
          </View>
          <View style={styles.textContainer}>
            <Text variant="bodyLarge" weight="semiBold" style={styles.title}>
              Connect someone else in
            </Text>
            <Text variant="body" color="secondary" style={styles.subtitle}>
              Help someone join our community
            </Text>
          </View>
          <View style={styles.chevronContainer}>
            <Ionicons
              name="chevron-forward-outline"
              size={20}
              color="#6b7280"
            />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    marginBottom: 2,
  },
  subtitle: {
    // Typography handled by Text component variant
  },
  chevronContainer: {
    marginLeft: 8,
  },
});
