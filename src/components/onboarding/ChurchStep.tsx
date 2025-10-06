import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { LoadingSpinner } from '../ui/LoadingSpinner';
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
  const [servicesLoading, setServicesLoading] = useState(false);
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
      setServicesLoading(false);
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
      setServicesLoading(true);
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
    } finally {
      setServicesLoading(false);
    }
  };

  const handleChurchSelect = (churchId: string) => {
    const isSameChurch = selectedChurchId === churchId;
    setSelectedChurchId(churchId);
    if (!isSameChurch) {
      setSelectedServiceId(undefined);
      setServices([]);
      setServicesLoading(true);
    }
  };

  const handleNext = () => {
    if (selectedChurchId && selectedServiceId) {
      onNext({ church_id: selectedChurchId, service_id: selectedServiceId });
    }
  };

  const renderChurchItem = ({ item }: { item: Church }) => {
    const isSelected = selectedChurchId === item.id;

    return (
      <View style={[styles.churchCard, isSelected && styles.churchCardSelected]}>
        <TouchableOpacity
          style={styles.churchHeader}
          onPress={() => handleChurchSelect(item.id)}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          <View style={styles.churchInfo}>
            <Text
              style={[styles.churchName, isSelected && styles.churchNameSelected]}
            >
              {item.name}
            </Text>
            {item.address && (
              <Text
                style={[
                  styles.churchAddress,
                  isSelected && styles.churchAddressSelected,
                ]}
              >
                {typeof item.address === 'string'
                  ? item.address
                  : item.address?.street || 'Address not available'}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.expandIndicator,
              isSelected && styles.expandIndicatorActive,
            ]}
          >
            {isSelected ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        {isSelected && (
          <View style={styles.serviceSection}>
            {servicesLoading ? (
              <View style={styles.serviceLoading}>
                <LoadingSpinner size="small" />
                <Text style={styles.serviceLoadingText}>Loading services...</Text>
              </View>
            ) : services.length > 0 ? (
              services.map((svc) => {
                const isServiceSelected = selectedServiceId === svc.id;

                return (
                  <TouchableOpacity
                    key={svc.id}
                    style={[
                      styles.serviceItem,
                      isServiceSelected && styles.serviceItemSelected,
                    ]}
                    onPress={() => setSelectedServiceId(svc.id)}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    <View style={styles.serviceInfo}>
                      <Text
                        style={[
                          styles.serviceName,
                          isServiceSelected && styles.serviceNameSelected,
                        ]}
                      >
                        {svc.name}
                      </Text>
                      {svc.day_of_week !== undefined && (
                        <Text style={styles.serviceMeta}>
                          Meets on {svc.day_of_week}
                        </Text>
                      )}
                      {svc.start_time && (
                        <Text style={styles.serviceMeta}>
                          Starts at {svc.start_time}
                        </Text>
                      )}
                    </View>
                    {isServiceSelected && (
                      <View style={styles.checkmarkSmall}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.serviceEmptyText}>
                No services available yet.
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
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
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.button,
            (!selectedChurchId || !selectedServiceId || isLoading) &&
              styles.buttonDisabled,
          ]}
          onPress={handleNext}
          disabled={!selectedChurchId || !selectedServiceId || isLoading}
        >
          <Text style={styles.buttonText}>Continue</Text>
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
  churchCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  churchCardSelected: {
    borderColor: '#007AFF',
    shadowOpacity: 0.08,
    backgroundColor: '#f8fbff',
  },
  churchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
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
  expandIndicator: {
    fontSize: 18,
    color: '#999',
    marginLeft: 12,
  },
  expandIndicatorActive: {
    color: '#007AFF',
  },
  serviceSection: {
    borderTopWidth: 1,
    borderTopColor: '#edf2ff',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  serviceLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
  },
  serviceLoadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e3e8f0',
    borderRadius: 10,
    marginTop: 12,
    backgroundColor: '#f9fbff',
  },
  serviceItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#edf5ff',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  serviceNameSelected: {
    color: '#007AFF',
  },
  serviceMeta: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  serviceEmptyText: {
    fontSize: 14,
    color: '#666',
    paddingTop: 12,
  },
  checkmarkSmall: {
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
  footer: {
    padding: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 24, // Updated to pill shape (half of padding: 16 * 2 + text height)
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#aac8ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
