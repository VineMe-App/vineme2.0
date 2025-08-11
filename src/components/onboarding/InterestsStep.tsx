import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { OnboardingStepProps } from '@/types/app';
import { COMMON_INTERESTS } from '@/utils/constants';

export default function InterestsStep({
  data,
  onNext,
  onBack,
  isLoading,
}: OnboardingStepProps) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    data.interests || []
  );

  useEffect(() => {
    setSelectedInterests(data.interests || []);
  }, [data.interests]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(interest)) {
        return prev.filter((i) => i !== interest);
      } else {
        return [...prev, interest];
      }
    });
  };

  const handleNext = () => {
    onNext({ interests: selectedInterests });
  };

  const renderInterestItem = (interest: string) => {
    const isSelected = selectedInterests.includes(interest);

    return (
      <TouchableOpacity
        key={interest}
        style={[styles.interestItem, isSelected && styles.interestItemSelected]}
        onPress={() => toggleInterest(interest)}
        disabled={isLoading}
      >
        <Text
          style={[
            styles.interestText,
            isSelected && styles.interestTextSelected,
          ]}
        >
          {interest}
        </Text>
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>What interests you?</Text>
        <Text style={styles.subtitle}>
          Select areas you'd like to get involved in. You can change these
          later.
        </Text>

        <ScrollView
          style={styles.interestsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.interestsContent}
        >
          <View style={styles.interestsGrid}>
            {COMMON_INTERESTS.map(renderInterestItem)}
          </View>
        </ScrollView>

        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedInterests.length === 0
              ? 'Select at least one interest to continue'
              : `${selectedInterests.length} interest${selectedInterests.length === 1 ? '' : 's'} selected`}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.button,
            selectedInterests.length === 0 && styles.buttonDisabled,
          ]}
          onPress={handleNext}
          disabled={selectedInterests.length === 0 || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Please wait...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 0,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  interestsList: {
    flex: 1,
  },
  interestsContent: {
    paddingBottom: 24,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  interestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '48%',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    minHeight: 56,
  },
  interestItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  interestText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  interestTextSelected: {
    color: '#007AFF',
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectionInfo: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  selectionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    padding: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
