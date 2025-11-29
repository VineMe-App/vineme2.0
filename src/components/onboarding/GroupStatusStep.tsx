import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { OnboardingStepProps } from '@/types/app';
import { Text } from '@/components/ui/Text';
import { AuthButton } from '@/components/auth/AuthButton';

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

  useEffect(() => {
    if (data.group_status) {
      setSelectedStatus(data.group_status);
    }
  }, [data.group_status]);

  const handleNext = () => {
    if (selectedStatus) {
      onNext({ group_status: selectedStatus });
    }
  };

  const statusOptions = [
    {
      id: 'existing' as const,
      title: 'I am already in a group',
      subtitle: 'I want to connect with my existing group on VineMe',
      icon: 'people-outline' as const,
    },
    {
      id: 'looking' as const,
      title: 'I am looking for a group',
      subtitle: 'Help me find a suitable group to join and get plugged in.',
      icon: 'search-outline' as const,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="h4" weight="extraBold" align="center" style={styles.title}>
            Group status
          </Text>
          <Text
            variant="bodyLarge"
            color="primary"
            align="center"
            style={styles.subtitle}
          >
            Are you already part of a small group or are you looking to join one?
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {statusOptions.map((option) => {
            const isSelected = selectedStatus === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedStatus(option.id)}
                disabled={isLoading}
                activeOpacity={0.85}
                testID={`group-status-${option.id}`}
              >
                <View style={styles.optionContent}>
                  <View style={styles.radioContainer}>
                    <View
                      style={[
                        styles.radio,
                        isSelected && styles.radioSelected,
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={24}
                        color={isSelected ? '#F54099' : '#999999'}
                      />
                    </View>
                  </View>
                  <View style={styles.optionText}>
                    <Text
                      variant="bodySmall"
                      weight="semiBold"
                      style={styles.optionTitle}
                    >
                      {option.title}
                    </Text>
                    <Text variant="bodySmall" color="secondary" style={styles.optionSubtitle}>
                      {option.subtitle}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text variant="bodySmall" color="error">
              {error}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <AuthButton
          title="Next"
          onPress={handleNext}
          loading={isLoading}
          disabled={!selectedStatus || isLoading}
        />
        <TouchableOpacity onPress={onBack} accessibilityRole="button" style={styles.backButton}>
          <Text variant="body" align="center" style={styles.backText}>
            Back
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 53, // Match other pages
    paddingTop: 16,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 50, // Match other pages title marginTop
  },
  title: {
    color: '#2C2235',
    fontSize: 26, // Figma: 26px
    lineHeight: 40, // Figma: 40px
    letterSpacing: -0.52, // Figma: -0.52px
    marginBottom: 20, // Spacing to subtitle
  },
  subtitle: {
    color: '#2C2235',
    fontSize: 16, // Figma: 16px
    lineHeight: 22, // Figma: 22px
    letterSpacing: -0.32, // Figma: -0.32px
    maxWidth: 293, // Figma: 293px
    marginTop: 0,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  optionCard: {
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    minHeight: 92,
    justifyContent: 'center',
  },
  optionCardSelected: {
    borderColor: '#F54099',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioContainer: {
    marginRight: 16,
  },
  radio: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#F54099',
    backgroundColor: '#FFFFFF',
  },
  radioInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F54099',
  },
  optionText: {
    flex: 1,
    gap: 8,
  },
  optionTitle: {
    color: '#271D30',
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: -0.7,
  },
  optionSubtitle: {
    color: '#2C2235',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: -0.33,
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7d7',
  },
  footer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 100, // Match other pages footer spacing
  },
  backButton: {
    marginTop: 16,
  },
  backText: {
    color: '#999999', // Match other pages
    fontSize: 16,
    letterSpacing: -0.8,
  },
});
