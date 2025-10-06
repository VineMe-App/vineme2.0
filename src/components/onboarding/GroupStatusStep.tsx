import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { OnboardingStepProps } from '@/types/app';
import { Button } from '@/components/ui/Button';

export default function GroupStatusStep({
  data,
  onNext,
  onBack,
  canGoBack,
  isLoading,
  error,
}: OnboardingStepProps) {
  const [selectedStatus, setSelectedStatus] = useState<
    'existing' | 'looking' | null
  >(data.group_status || null);

  const handleNext = () => {
    if (selectedStatus) {
      onNext({ group_status: selectedStatus });
    }
  };

  const statusOptions = [
    {
      id: 'existing' as const,
      title: "I'm already in a group",
      subtitle: 'I want to connect my existing group to VineMe',
      icon: 'people' as const,
    },
    {
      id: 'looking' as const,
      title: "I'm looking for a group",
      subtitle: 'Help me find a group that fits me best',
      icon: 'search' as const,
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Group Status</Text>
          <Text style={styles.subtitle}>
            Are you already part of a small group, or are you looking to join
            one?
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {statusOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                selectedStatus === option.id && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedStatus(option.id)}
              testID={`group-status-${option.id}`}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionHeader}>
                  <View
                    style={[
                      styles.iconContainer,
                      selectedStatus === option.id &&
                        styles.iconContainerSelected,
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={24}
                      color={selectedStatus === option.id ? '#fff' : '#007AFF'}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </View>
                </View>
                <View style={styles.radioContainer}>
                  <View
                    style={[
                      styles.radio,
                      selectedStatus === option.id && styles.radioSelected,
                    ]}
                  >
                    {selectedStatus === option.id && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          title="Back"
          onPress={onBack}
          variant="ghost"
          disabled={!canGoBack || isLoading}
          fullWidth
        />
        <Button
          title="Continue"
          onPress={handleNext}
          disabled={!selectedStatus || isLoading}
          loading={isLoading}
          variant="primary"
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    borderWidth: 2,
    borderColor: '#f0f0f0',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#fff',
  },
  optionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f8faff',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconContainerSelected: {
    backgroundColor: '#007AFF',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  radioContainer: {
    marginLeft: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#007AFF',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7d7',
  },
  errorText: {
    color: '#e53e3e',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
    gap: 12,
  },
  nextButton: {},
});
