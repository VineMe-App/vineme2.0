import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { OnboardingStepProps } from '@/types/app';
import type { Church, Service } from '@/types/database';
import { churchService } from '@/services/churches';
import { supportService } from '@/services/support';
import { MissingServiceModal, MissingServiceFormData } from './MissingServiceModal';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';
import { getFullName } from '@/utils/name';

export default function ChurchStep({
  data,
  onNext,
  onBack,
  canGoBack,
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
  const [showMissingServiceModal, setShowMissingServiceModal] =
    useState(false);
  const [missingServiceSubmitting, setMissingServiceSubmitting] =
    useState(false);
  const [missingServiceRequestError, setMissingServiceRequestError] =
    useState<string | null>(null);
  const [missingServiceSubmitted, setMissingServiceSubmitted] =
    useState(false);
  const [missingServiceMode, setMissingServiceMode] =
    useState<'church' | 'service'>('service');
  const [missingServiceLastMode, setMissingServiceLastMode] =
    useState<'church' | 'service' | null>(null);

  const { user } = useAuthStore();

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
      if (missingServiceLastMode !== 'church') {
        setMissingServiceSubmitted(false);
      }
      setMissingServiceRequestError(null);
    }
  }, [selectedChurchId, missingServiceLastMode]);

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
      if (missingServiceLastMode !== 'church') {
        setMissingServiceSubmitted(false);
      }
      setMissingServiceRequestError(null);
    }
  };

  const handleNext = () => {
    if (selectedChurchId && selectedServiceId) {
      onNext({ church_id: selectedChurchId, service_id: selectedServiceId });
    }
  };

  const handleOpenMissingServiceModal = (mode: 'church' | 'service') => {
    setMissingServiceMode(mode);
    setMissingServiceRequestError(null);
    setShowMissingServiceModal(true);
  };

  const handleSubmitMissingService = async (
    form: MissingServiceFormData
  ) => {
    if (missingServiceSubmitting) return;

    setMissingServiceSubmitting(true);
    setMissingServiceRequestError(null);

    const result = await supportService.submitMissingServiceRequest({
      church_id:
        missingServiceMode === 'service'
          ? form.churchId ?? selectedChurchId
          : form.churchId,
      church_name: form.churchName,
      church_location: form.churchLocation,
      service_name: form.serviceName,
      service_time: form.serviceTime,
      additional_info: form.additionalInfo,
      contact_name: form.contactName,
      contact_email: form.contactEmail,
      requester_name:
        getFullName({
          first_name: data.first_name,
          last_name: data.last_name,
        }) || undefined,
      requester_id: user?.id,
      requester_email: user?.email ?? undefined,
    });

    if (!result.success) {
      setMissingServiceRequestError(
        result.error || 'Unable to submit request. Please try again.'
      );
      setMissingServiceSubmitting(false);
      return;
    }

    const submissionMode = missingServiceMode;

    setMissingServiceSubmitting(false);
    setMissingServiceRequestError(null);
    setMissingServiceSubmitted(true);
    setMissingServiceLastMode(submissionMode);
    setShowMissingServiceModal(false);

    Alert.alert(
      'Request received',
      submissionMode === 'church'
        ? "Thanks for letting us know about your church. We'll reach out and add it soon."
        : "Thanks! We'll review the service details and let you know when it's available.",
      [{ text: 'OK' }]
    );
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

            <TouchableOpacity
              style={styles.otherServiceCard}
              onPress={() => handleOpenMissingServiceModal('service')}
              disabled={missingServiceSubmitting}
              activeOpacity={0.85}
            >
              <View style={styles.otherServiceTextGroup}>
                <Text style={styles.otherServiceTitle}>
                  Can&apos;t find your service?
                </Text>
                <Text style={styles.otherServiceSubtitle}>
                  Send us the details and we&apos;ll add it.
                </Text>
              </View>
              <View style={styles.otherServiceIcon}>
                <Text style={styles.otherServiceIconText}>+</Text>
              </View>
            </TouchableOpacity>

            {missingServiceSubmitted && missingServiceLastMode === 'service' && (
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>
                  Thanks! We received your request and will reach out once the
                  service is available.
                </Text>
              </View>
            )}
            {missingServiceRequestError &&
              missingServiceLastMode === 'service' &&
              !showMissingServiceModal && (
              <Text style={styles.serviceInlineError}>
                {missingServiceRequestError}
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
          ListFooterComponent={() => (
            <View style={styles.listFooter}>
              <TouchableOpacity
                style={styles.missingChurchButton}
                onPress={() => handleOpenMissingServiceModal('church')}
                disabled={missingServiceSubmitting}
                activeOpacity={0.85}
              >
                <View style={styles.missingChurchTextGroup}>
                  <Text style={styles.missingChurchTitle}>
                    Can&apos;t find your church?
                  </Text>
                  <Text style={styles.missingChurchSubtitle}>
                    Share the details and we&apos;ll add it to VineMe.
                  </Text>
                </View>
                <View style={styles.missingChurchIcon}>
                  <Text style={styles.missingChurchIconText}>+</Text>
                </View>
              </TouchableOpacity>
              {missingServiceSubmitted &&
                missingServiceLastMode === 'church' && (
                  <Text style={styles.missingChurchNotice}>
                    We&apos;re on it! We&apos;ll reach out soon about adding this
                    church.
                  </Text>
                )}
              {missingServiceRequestError &&
                missingServiceLastMode === 'church' &&
                !showMissingServiceModal && (
                  <Text style={styles.serviceInlineError}>
                    {missingServiceRequestError}
                  </Text>
                )}
            </View>
          )}
          ListFooterComponentStyle={styles.listFooterContainer}
        />
      </View>

      <View style={styles.footer}>
        <Button
          title="Back"
          variant="ghost"
          onPress={onBack}
          disabled={!canGoBack || isLoading}
          fullWidth
        />
        <Button
          title="Continue"
          onPress={handleNext}
          loading={isLoading}
          disabled={!selectedChurchId || !selectedServiceId || isLoading}
          variant="primary"
          fullWidth
        />
        {selectedChurchId &&
          !selectedServiceId &&
          missingServiceSubmitted &&
          missingServiceLastMode === 'service' && (
            <Text style={styles.pendingNotice}>
              We&apos;ll email you when the service is ready. You can close the app
              and return later.
            </Text>
          )}
      </View>
      <MissingServiceModal
        isVisible={showMissingServiceModal}
        onClose={() => {
          if (!missingServiceSubmitting) {
            setShowMissingServiceModal(false);
          }
        }}
        initialChurchId={
          missingServiceMode === 'service' ? selectedChurchId : undefined
        }
        initialChurchName={
          missingServiceMode === 'service'
            ? churches.find((c) => c.id === selectedChurchId)?.name || ''
            : undefined
        }
        isSubmitting={missingServiceSubmitting}
        onSubmit={handleSubmitMissingService}
        error={missingServiceRequestError}
        mode={missingServiceMode}
      />
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
  otherServiceCard: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#c6d7ff',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fbff',
    gap: 12,
  },
  otherServiceTextGroup: {
    flex: 1,
  },
  otherServiceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0c3c8c',
    marginBottom: 4,
  },
  otherServiceSubtitle: {
    fontSize: 13,
    color: '#4d6aa7',
    lineHeight: 18,
  },
  otherServiceIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0c3c8c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherServiceIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 20,
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
    paddingTop: 16,
    gap: 12,
  },
  pendingNotice: {
    marginTop: 12,
    textAlign: 'center',
    color: '#4d6aa7',
    fontSize: 14,
    lineHeight: 20,
  },
  infoBanner: {
    marginTop: 16,
    backgroundColor: '#edf5ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#c6d7ff',
  },
  infoBannerText: {
    color: '#19478a',
    fontSize: 13,
    lineHeight: 19,
  },
  serviceInlineError: {
    marginTop: 12,
    color: '#d73a49',
    fontSize: 13,
  },
  listFooterContainer: {
    paddingBottom: 16,
  },
  listFooter: {
    marginTop: 12,
    gap: 8,
  },
  missingChurchButton: {
    borderWidth: 1,
    borderColor: '#c6d7ff',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f7fbff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  missingChurchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c3c8c',
    marginBottom: 4,
  },
  missingChurchSubtitle: {
    fontSize: 14,
    color: '#4d6aa7',
    lineHeight: 20,
  },
  missingChurchTextGroup: {
    flex: 1,
  },
  missingChurchIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0c3c8c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingChurchIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 20,
  },
  missingChurchNotice: {
    fontSize: 14,
    color: '#19478a',
    lineHeight: 20,
  },
});
