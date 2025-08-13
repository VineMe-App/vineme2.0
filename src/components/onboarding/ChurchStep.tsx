import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import type { OnboardingStepProps } from '@/types/app';
import type { Church, Service } from '@/types/database';
import { churchService } from '@/services/churches';

export default function ChurchStep({
  data,
  onNext,
  onBack,
  isLoading,
}: OnboardingStepProps) {
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<string | undefined>(
    data.church_id
  );
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<
    string | undefined
  >(data.service_id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChurches();
  }, []);

  useEffect(() => {
    if (selectedChurchId) {
      loadServices(selectedChurchId);
    } else {
      setServices([]);
      setSelectedServiceId(undefined);
    }
  }, [selectedChurchId]);

  const loadChurches = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: churchData, error: churchError } =
        await churchService.getChurches();

      if (churchError) {
        setError(churchError.message);
        return;
      }

      if (churchData) {
        setChurches(churchData);
      }
    } catch {
      setError('Failed to load churches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async (churchId: string) => {
    try {
      const { data: svc, error } =
        await churchService.getServicesByChurch(churchId);
      if (!error && svc) {
        setServices(svc);
        // Reset service if it doesn't belong to the new church
        if (!svc.find((s) => s.id === selectedServiceId)) {
          setSelectedServiceId(undefined);
        }
      }
    } catch {
      // Non-blocking
    }
  };

  const handleChurchSelect = (churchId: string) => {
    setSelectedChurchId(churchId);
  };

  const handleNext = () => {
    if (selectedChurchId) {
      onNext({ church_id: selectedChurchId, service_id: selectedServiceId });
    }
  };

  const handleSkip = () => {
    onNext({ church_id: undefined });
  };

  const renderChurchItem = ({ item }: { item: Church }) => (
    <TouchableOpacity
      style={[
        styles.churchItem,
        selectedChurchId === item.id && styles.churchItemSelected,
      ]}
      onPress={() => handleChurchSelect(item.id)}
      disabled={isLoading}
    >
      <View style={styles.churchInfo}>
        <Text
          style={[
            styles.churchName,
            selectedChurchId === item.id && styles.churchNameSelected,
          ]}
        >
          {item.name}
        </Text>
        {item.address && (
          <Text
            style={[
              styles.churchAddress,
              selectedChurchId === item.id && styles.churchAddressSelected,
            ]}
          >
            {typeof item.address === 'string'
              ? item.address
              : item.address?.street || 'Address not available'}
          </Text>
        )}
      </View>
      {selectedChurchId === item.id && (
        <View style={styles.checkmark}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading churches...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unable to load churches</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadChurches}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Select your church</Text>
        <Text style={styles.subtitle}>
          This helps us show you relevant groups and events
        </Text>

        <FlatList
          data={churches}
          renderItem={renderChurchItem}
          keyExtractor={(item) => item.id}
          style={styles.churchList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.churchListContent}
        />

        {selectedChurchId && (
          <>
            <Text style={[styles.title, { marginTop: 16 }]}>
              Select a service (optional)
            </Text>
            <View>
              {services.map((svc) => (
                <TouchableOpacity
                  key={svc.id}
                  style={[
                    styles.churchItem,
                    selectedServiceId === svc.id && styles.churchItemSelected,
                  ]}
                  onPress={() => setSelectedServiceId(svc.id)}
                  disabled={isLoading}
                >
                  <View style={styles.churchInfo}>
                    <Text
                      style={[
                        styles.churchName,
                        selectedServiceId === svc.id &&
                          styles.churchNameSelected,
                      ]}
                    >
                      {svc.name}
                    </Text>
                    <Text style={styles.churchAddress}>
                      {svc.day_of_week !== undefined
                        ? `Meets on ${svc.day_of_week}`
                        : ''}
                    </Text>
                  </View>
                  {selectedServiceId === svc.id && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, !selectedChurchId && styles.buttonSecondary]}
          onPress={selectedChurchId ? handleNext : handleSkip}
          disabled={isLoading}
        >
          <Text
            style={[
              styles.buttonText,
              !selectedChurchId && styles.buttonTextSecondary,
            ]}
          >
            {selectedChurchId ? 'Continue' : 'Skip for now'}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    padding: 12,
  },
  skipButtonText: {
    color: '#007AFF',
    fontSize: 16,
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
  churchList: {
    flex: 1,
  },
  churchListContent: {
    paddingBottom: 24,
  },
  churchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  churchItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  churchInfo: {
    flex: 1,
  },
  churchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  churchNameSelected: {
    color: '#007AFF',
  },
  churchAddress: {
    fontSize: 14,
    color: '#666',
  },
  churchAddressSelected: {
    color: '#0066cc',
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
  footer: {
    padding: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#007AFF',
  },
});
