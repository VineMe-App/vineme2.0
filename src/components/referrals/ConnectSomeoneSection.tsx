import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';

interface ConnectSomeoneSectionProps {
  onPress: () => void;
}

export function ConnectSomeoneSection({ onPress }: ConnectSomeoneSectionProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-add-outline" size={24} color="#007AFF" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Connect someone else in</Text>
            <Text style={styles.subtitle}>Help someone join our community</Text>
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  chevronContainer: {
    marginLeft: 8,
  },
});
