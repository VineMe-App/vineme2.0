import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { OnboardingStepProps } from '@/types/app';
import { MEETING_NIGHTS } from '@/utils/constants';

export default function MeetingNightStep({
  data,
  onNext,
  onBack,
  isLoading,
}: OnboardingStepProps) {
  const [selectedNight, setSelectedNight] = useState<string>(
    data.preferred_meeting_night || ''
  );

  useEffect(() => {
    setSelectedNight(data.preferred_meeting_night || '');
  }, [data.preferred_meeting_night]);

  const handleNightSelect = (nightValue: string) => {
    setSelectedNight(nightValue);
  };

  const handleNext = () => {
    onNext({ preferred_meeting_night: selectedNight });
  };

  const renderNightItem = (night: { label: string; value: string }) => {
    const isSelected = selectedNight === night.value;

    return (
      <TouchableOpacity
        key={night.value}
        style={[styles.nightItem, isSelected && styles.nightItemSelected]}
        onPress={() => handleNightSelect(night.value)}
        disabled={isLoading}
      >
        <Text
          style={[styles.nightText, isSelected && styles.nightTextSelected]}
        >
          {night.label}
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
        <Text style={styles.title}>When do you prefer to meet?</Text>
        <Text style={styles.subtitle}>
          This helps us recommend groups that meet on your preferred night
        </Text>

        <ScrollView
          style={styles.nightsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.nightsContent}
        >
          {MEETING_NIGHTS.map(renderNightItem)}
        </ScrollView>

        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedNight
              ? `You prefer ${MEETING_NIGHTS.find((n) => n.value === selectedNight)?.label} meetings`
              : 'Select your preferred meeting night'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, !selectedNight && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!selectedNight || isLoading}
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
  nightsList: {
    flex: 1,
  },
  nightsContent: {
    paddingBottom: 24,
  },
  nightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  nightItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  nightText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  nightTextSelected: {
    color: '#007AFF',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
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
