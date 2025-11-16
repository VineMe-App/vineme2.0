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
import type { Church, Service, User } from '@/types/database';
import { churchService } from '@/services/churches';
import { supportService } from '@/services/support';
import {
  MissingServiceModal,
  MissingServiceFormData,
} from './MissingServiceModal';
import { useAuthStore } from '@/stores/auth';
import { Avatar } from '@/components/ui/Avatar';
import { getFullName, getDisplayName } from '@/utils/name';
import { supabase } from '@/services/supabase';
import { AuthHero } from '@/components/auth/AuthHero';
import { AuthButton } from '@/components/auth/AuthButton';
import { Text as AppText } from '@/components/ui/Text';

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
  const [showMissingServiceModal, setShowMissingServiceModal] = useState(false);
  const [missingServiceSubmitting, setMissingServiceSubmitting] =
    useState(false);
  const [missingServiceRequestError, setMissingServiceRequestError] = useState<
    string | null
  >(null);
  const [missingServiceSubmitted, setMissingServiceSubmitted] = useState(false);
  const [missingServiceMode, setMissingServiceMode] = useState<
    'church' | 'service'
  >('service');
  const [missingServiceLastMode, setMissingServiceLastMode] = useState<
    'church' | 'service' | null
  >(null);
  const [serviceAdmins, setServiceAdmins] = useState<User[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);

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

  useEffect(() => {
    if (selectedServiceId) {
      loadServiceAdmins(selectedServiceId);
    } else {
      setServiceAdmins([]);
    }
  }, [selectedServiceId]);

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

  const loadServiceAdmins = async (serviceId: string) => {
    try {
      setAdminsLoading(true);
      // Get church admins for this service
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url')
        .eq('service_id', serviceId)
        .contains('roles', ['church_admin'])
        .order('first_name');

      if (!error && data) {
        setServiceAdmins(data);
      }
    } catch {
      // Non-blocking
    } finally {
      setAdminsLoading(false);
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

  const handleSubmitMissingService = async (form: MissingServiceFormData) => {
    if (missingServiceSubmitting) return;

    setMissingServiceSubmitting(true);
    setMissingServiceRequestError(null);

    const result = await supportService.submitMissingServiceRequest({
      church_id:
        missingServiceMode === 'service'
          ? (form.churchId ?? selectedChurchId)
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
      <View
        style={[styles.churchCard, isSelected && styles.churchCardSelected]}
      >
        <TouchableOpacity
          style={styles.churchHeader}
          onPress={() => handleChurchSelect(item.id)}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          <View style={styles.churchInfo}>
            <Text
              style={[
                styles.churchName,
                isSelected && styles.churchNameSelected,
              ]}
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
            ›
          </Text>
        </TouchableOpacity>

        {isSelected && (
          <View style={styles.serviceSection}>
            {servicesLoading ? (
              <View style={styles.serviceLoading}>
                <LoadingSpinner size="small" />
                <Text style={styles.serviceLoadingText}>
                  Loading services...
                </Text>
              </View>
            ) : services.length > 0 ? (
              <>
                <AppText variant="labelSmall" color="secondary" style={styles.serviceLabel}>
                  Which service you attend regularly? Select all that applies:
                </AppText>
                {services.map((svc) => {
                  const isServiceSelected = selectedServiceId === svc.id;
                  // Format service name with time (e.g., "Sunday Morning 10:30")
                  const serviceDisplayName = svc.name || `${svc.day_of_week || ''} ${svc.start_time || ''}`.trim();

                  return (
                    <TouchableOpacity
                      key={svc.id}
                      style={styles.serviceCheckboxRow}
                      onPress={() => setSelectedServiceId(svc.id)}
                      disabled={isLoading}
                      activeOpacity={0.85}
                    >
                      <View style={styles.serviceCheckboxContainer}>
                        <Text style={styles.serviceCheckboxLabel}>
                          {serviceDisplayName}
                        </Text>
                        <View style={[styles.serviceCheckbox, isServiceSelected && styles.serviceCheckboxChecked]}>
                          {isServiceSelected && (
                            <Text style={styles.serviceCheckmark}>✓</Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : (
              <View style={styles.serviceEmptyContainer}>
                <Text style={styles.serviceEmptyText}>
                  This church hasn&apos;t added any services yet.
                </Text>
                <Text style={styles.serviceEmptyHelpText}>
                  You&apos;ll need to select a service to continue onboarding.
                  Please choose a different church for now or request this
                  service so we can add it.
                </Text>
                <TouchableOpacity
                  style={styles.serviceEmptyRequestButton}
                  onPress={() => handleOpenMissingServiceModal('service')}
                  disabled={missingServiceSubmitting}
                  activeOpacity={0.85}
                >
                  <Text style={styles.serviceEmptyRequestTitle}>
                    Request this service
                  </Text>
                  <Text style={styles.serviceEmptyRequestSubtitle}>
                    Tell us the service details and we&apos;ll reach out when it&apos;s
                    available.
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.missingServiceContainer}>
              <TouchableOpacity
                style={styles.missingServiceButton}
                onPress={() => handleOpenMissingServiceModal('service')}
                disabled={missingServiceSubmitting}
                activeOpacity={0.85}
              >
                <View style={styles.missingServiceTextGroup}>
                  <AppText
                    variant="body"
                    weight="semiBold"
                    style={styles.missingServiceTitle}
                  >
                    Can't find your service?
                  </AppText>
                  <AppText
                    variant="bodySmall"
                    color="secondary"
                    style={styles.missingServiceSubtitle}
                  >
                    Tell us about the service you attend so we can add it for
                    this church.
                  </AppText>
                </View>
                <View style={styles.missingServiceIcon}>
                  <Text style={styles.missingServiceIconText}>+</Text>
                </View>
              </TouchableOpacity>
              {missingServiceSubmitted &&
                missingServiceLastMode === 'service' && (
                  <Text style={styles.missingServiceNotice}>
                    Thanks! We'll reach out soon about adding that service.
                  </Text>
                )}
              {missingServiceRequestError &&
                missingServiceLastMode === 'service' &&
                !showMissingServiceModal && (
                  <Text style={styles.serviceInlineError}>
                    {missingServiceRequestError}
                  </Text>
                )}
            </View>

            {selectedServiceId && (
              <View style={styles.adminDisclosureContainer}>
                <Text style={styles.adminDisclosureTitle}>
                  📋 Privacy Notice
                </Text>
                <Text style={styles.adminDisclosureText}>
                  Your contact details (name, email, and phone) will be visible
                  to the church admins for this service. This helps them support
                  you and connect you with relevant groups.
                </Text>

                {adminsLoading ? (
                  <View style={styles.adminsLoading}>
                    <LoadingSpinner size="small" />
                    <Text style={styles.adminsLoadingText}>
                      Loading admins...
                    </Text>
                  </View>
                ) : serviceAdmins.length > 0 ? (
                  <>
                    <Text style={styles.adminListTitle}>Church Admins:</Text>
                    <View style={styles.adminsList}>
                      {serviceAdmins.map((admin) => (
                        <View key={admin.id} style={styles.adminItem}>
                          <Avatar
                            imageUrl={admin.avatar_url}
                            name={getFullName(admin)}
                            size={32}
                          />
                          <Text style={styles.adminName}>
                            {getDisplayName(admin, { fallback: 'full' })}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <Text style={styles.noAdminsText}>
                    No admins assigned to this service yet.
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const noServicesAvailable =
    !!selectedChurchId && !servicesLoading && services.length === 0;

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
      <View style={styles.content}>
        <AuthHero
          title="Select your church"
          subtitle="This helps us show you relevant groups and events"
          containerStyle={styles.heroSpacing}
        />

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
                  <AppText variant="body" weight="semiBold" style={styles.missingChurchTitle}>
                    Can&apos;t find your church?
                  </AppText>
                  <AppText variant="bodySmall" color="secondary" style={styles.missingChurchSubtitle}>
                    Share the details of your church with us and we&apos;ll add it to VineMe.
                  </AppText>
                </View>
                <View style={styles.missingChurchIcon}>
                  <Text style={styles.missingChurchIconText}>+</Text>
                </View>
              </TouchableOpacity>
              {missingServiceSubmitted &&
                missingServiceLastMode === 'church' && (
                  <Text style={styles.missingChurchNotice}>
                    We&apos;re on it! We&apos;ll reach out soon about adding
                    this church.
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
        <View style={styles.footerSpacer} />
        <AuthButton
          title="Next"
          onPress={handleNext}
          loading={isLoading}
          disabled={!selectedChurchId || !selectedServiceId || isLoading}
        />
        <TouchableOpacity onPress={onBack} accessibilityRole="button">
          <AppText variant="body" color="secondary" align="center">
            Back
          </AppText>
        </TouchableOpacity>
        {noServicesAvailable && (
          <Text style={styles.serviceRequiredNotice}>
            A service is required to finish onboarding. Once a service is
            available, come back to continue.
          </Text>
        )}
        {selectedChurchId &&
          !selectedServiceId &&
          !noServicesAvailable &&
          missingServiceSubmitted &&
          missingServiceLastMode === 'service' && (
            <Text style={styles.pendingNotice}>
              We&apos;ll email you when the service is ready. You can close the
              app and return later.
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
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 32,
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
  content: {
    flex: 1,
  },
  heroSpacing: {
    marginTop: 16,
    marginBottom: 24,
  },
  churchList: {
    flex: 1,
  },
  churchListContent: {
    paddingBottom: 16,
  },
  churchCard: {
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  churchCardSelected: {
    borderColor: '#F54099',
  },
  churchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  churchInfo: {
    flex: 1,
  },
  churchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2235',
    marginBottom: 4,
  },
  churchNameSelected: {
    color: '#2C2235',
  },
  churchAddress: {
    fontSize: 14,
    color: '#666',
  },
  churchAddressSelected: {
    color: '#666',
  },
  expandIndicator: {
    fontSize: 18,
    color: '#999',
    marginLeft: 12,
    transform: [{ rotate: '180deg' }],
  },
  expandIndicatorActive: {
    color: '#2C2235',
    transform: [{ rotate: '0deg' }],
  },
  serviceSection: {
    borderTopWidth: 1,
    borderTopColor: '#edf2ff',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  serviceLabel: {
    color: '#2C2235',
    marginBottom: 16,
  },
  serviceCheckboxRow: {
    marginBottom: 12,
  },
  serviceCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceCheckbox: {
    width: 19,
    height: 19,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceCheckboxChecked: {
    backgroundColor: '#2C2235',
    borderColor: '#2C2235',
  },
  serviceCheckmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 12,
    includeFontPadding: false,
  },
  serviceCheckboxLabel: {
    fontSize: 12,
    color: '#2C2235',
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.6,
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
  serviceEmptyContainer: {
    paddingTop: 12,
    gap: 8,
  },
  serviceEmptyText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  serviceEmptyHelpText: {
    fontSize: 13,
    color: '#4d6aa7',
    lineHeight: 19,
  },
  serviceEmptyRequestButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#4d6aa7',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(77, 106, 167, 0.08)',
    gap: 4,
  },
  serviceEmptyRequestTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2235',
  },
  serviceEmptyRequestSubtitle: {
    fontSize: 13,
    color: '#2C2235',
    lineHeight: 18,
  },
  otherServiceCard: {
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  otherServiceTextGroup: {
    flex: 1,
  },
  otherServiceTitle: {
    color: '#2C2235',
    marginBottom: 8,
  },
  otherServiceSubtitle: {
    color: '#2C2235',
    lineHeight: 20,
  },
  otherServiceIcon: {
    width: 37,
    height: 37,
    borderRadius: 18.5,
    backgroundColor: '#2C2235',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherServiceIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    width: '100%',
  },
  footerSpacer: {
    height: 32,
  },
  pendingNotice: {
    marginTop: 12,
    textAlign: 'center',
    color: '#4d6aa7',
    fontSize: 14,
    lineHeight: 20,
  },
  serviceRequiredNotice: {
    marginTop: 12,
    textAlign: 'center',
    color: '#d73a49',
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
    borderWidth: 1.5,
    borderColor: '#F54099',
  },
  
  missingServiceContainer: {
    marginTop: 16,
    gap: 8,
  },
  missingServiceButton: {
    borderWidth: 1.5,
    borderColor: '#4d6aa7',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(77, 106, 167, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  missingServiceTextGroup: {
    flex: 1,
  },
  missingServiceTitle: {
    color: '#2C2235',
    marginBottom: 8,
  },
  missingServiceSubtitle: {
    color: '#2C2235',
    lineHeight: 20,
  },
  missingServiceIcon: {
    width: 37,
    height: 37,
    borderRadius: 18.5,
    backgroundColor: '#4d6aa7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingServiceIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 20,
  },
  missingServiceNotice: {
    fontSize: 14,
    color: '#19478a',
    lineHeight: 20,
  },
  missingChurchButton: {
    borderWidth: 1.5,
    borderColor: '#F54099',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(245, 64, 153, 0.01)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  missingChurchTitle: {
    color: '#2C2235',
    marginBottom: 8,
  },
  missingChurchSubtitle: {
    color: '#2C2235',
    lineHeight: 20,
  },
  missingChurchTextGroup: {
    flex: 1,
  },
  missingChurchIcon: {
    width: 37,
    height: 37,
    borderRadius: 18.5,
    backgroundColor: '#F54099',
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
  adminDisclosureContainer: {
    marginTop: 16,
    backgroundColor: '#fff8e5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffd966',
  },
  adminDisclosureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  adminDisclosureText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 12,
  },
  adminsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  adminsLoadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#856404',
  },
  adminListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  adminsList: {
    gap: 8,
  },
  adminItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  adminName: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
  },
  noAdminsText: {
    fontSize: 13,
    color: '#856404',
    fontStyle: 'italic',
  },
});
