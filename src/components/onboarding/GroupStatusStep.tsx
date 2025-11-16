import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import type { OnboardingStepProps } from '@/types/app';
import { Text } from '@/components/ui/Text';
import { AuthHero } from '@/components/auth/AuthHero';
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
    },
    {
      id: 'looking' as const,
      title: 'I am looking for a group',
      subtitle: 'Help me find a suitable group to join and get plugged in.',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <AuthHero
          title="Group status"
          subtitle="Are you already part of a small group or are you looking to join one?"
          containerStyle={styles.heroSpacing}
        />

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
                      {isSelected && <View style={styles.radioInner} />}
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
        <View style={styles.footerSpacer} />
        <AuthButton
          title="Next"
          onPress={handleNext}
          loading={isLoading}
          disabled={!selectedStatus || isLoading}
        />
        <TouchableOpacity onPress={onBack} accessibilityRole="button">
          <Text variant="body" color="secondary" align="center">
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
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  heroSpacing: {
    marginBottom: 32,
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
  },
  footerSpacer: {
    height: 32,
  },
});
