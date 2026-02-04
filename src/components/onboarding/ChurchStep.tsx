import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ScrollView,
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
import { Ionicons } from '@expo/vector-icons';
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
        // Supabase typed result only selects a subset of fields; assert to User[] for our usage
        setServiceAdmins(data as unknown as User[]);
      }
    } catch {
      // Non-blocking
    } finally {
      setAdminsLoading(false);
    }
  };

  const handleChurchSelect = (churchId: string) => {
    const isSameChurch = selectedChurchId === churchId;
    // Toggle: if clicking the same church, close it (deselect)
    if (isSameChurch) {
      setSelectedChurchId(undefined);
      setSelectedServiceId(undefined);
      setServices([]);
      setServicesLoading(false);
      if (missingServiceLastMode !== 'church') {
        setMissingServiceSubmitted(false);
      }
      setMissingServiceRequestError(null);
    } else {
      setSelectedChurchId(churchId);
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
      return;
    }
    if (data.requested_church) {
      onNext({ requested_church: true });
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
      [
        {
          text: 'OK',
          onPress: () => {
            if (submissionMode === 'church') {
              onNext({ requested_church: true });
            }
          },
        },
      ]
    );
  };

  const renderChurchItem = ({ item }: { item: Church }) => {
    const isSelected = selectedChurchId === item.id;

    return (
      <View>
        {isSelected ? (
          <View style={styles.churchCardExpanded}>
            <TouchableOpacity
              style={styles.churchFieldExpanded}
              onPress={() => handleChurchSelect(item.id)}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.churchNameExpanded}>
                {item.name}
              </Text>
              <Ionicons
                name="chevron-down"
                size={24}
                color="#2C2235"
                style={styles.chevronIconExpanded}
              />
            </TouchableOpacity>

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
                <Text style={styles.serviceLabel}>
                  <Text style={styles.serviceLabelBold}>Which service do you attend regularly?</Text>
                </Text>
                {services.map((svc) => {
                  const isServiceSelected = selectedServiceId === svc.id;
                  // Format service name with time (e.g., "Sunday Morning 10:30")
                  const serviceDisplayName = svc.name || `${svc.day_of_week || ''} ${svc.start_time || ''}`.trim();

                  const handleServiceToggle = () => {
                    // Toggle: if clicking the same service, uncheck it; otherwise select it
                    setSelectedServiceId(prevId => prevId === svc.id ? undefined : svc.id);
                  };

                  return (
                    <TouchableOpacity
                      key={svc.id}
                      style={styles.serviceCheckboxRow}
                      onPress={handleServiceToggle}
                      disabled={isLoading}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.serviceCheckboxLabel}>
                        {serviceDisplayName}
                      </Text>
                      <View style={[styles.serviceCheckbox, isServiceSelected && styles.serviceCheckboxChecked]}>
                        {isServiceSelected && (
                          <Text style={styles.serviceCheckmark}>✓</Text>
                        )}
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
                    Request a service
                  </Text>
                  <Text style={styles.serviceEmptyRequestSubtitle}>
                    Tell us the service details and we&apos;ll reach out when it&apos;s
                    available.
                  </Text>
                </TouchableOpacity>
              </View>
            )}

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
        </View>
        ) : (
          <TouchableOpacity
            style={styles.churchField}
            onPress={() => handleChurchSelect(item.id)}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.churchName}>
              {item.name}
            </Text>
            <Ionicons
              name="chevron-down"
              size={24}
              color="#2C2235"
              style={styles.chevronIcon}
            />
          </TouchableOpacity>
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
      <View style={styles.header}>
        <AppText variant="h4" weight="extraBold" align="center" style={styles.title}>
          Select your church
        </AppText>
        <AppText
          variant="bodyLarge"
          color="primary"
          align="center"
          style={styles.subtitle}
        >
          This helps us show you relevant groups
        </AppText>
      </View>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.churchesList}>
          {churches.map((church) => (
            <View key={church.id}>{renderChurchItem({ item: church })}</View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.missingChurchButton}
          onPress={() => handleOpenMissingServiceModal('church')}
          disabled={missingServiceSubmitting}
          activeOpacity={0.85}
        >
          <View style={styles.missingChurchTextGroup}>
            <AppText variant="body" weight="bold" style={styles.missingChurchTitle}>
              Can&apos;t find your church?
            </AppText>
            <AppText variant="bodySmall" style={styles.missingChurchSubtitle}>
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
      </ScrollView>

      <View style={styles.footer}>
        <AuthButton
          title="Next"
          onPress={handleNext}
          loading={isLoading}
          disabled={
            isLoading ||
            ((!selectedChurchId || !selectedServiceId) &&
              !data.requested_church)
          }
          fullWidth={false}
          style={styles.nextButton}
        />
        <TouchableOpacity onPress={onBack} accessibilityRole="button" style={styles.backButton}>
          <AppText variant="body" align="center" style={styles.backText}>
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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
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
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 75, // Match EmailStep title marginTop
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
    maxWidth: 320,
    marginTop: 0,
  },
  churchesList: {
    gap: 16, // Figma: spacing between church fields (354px - 296px = 58px)
    marginBottom: 16, // Space before "Can't find your church" box (488px - 412px = 76px)
    marginTop: 0,
  },
  churchField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    height: 50, // Figma: 50px
    paddingHorizontal: 24, // Figma: 80px - 56px = 24px
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  churchName: {
    fontSize: 16, // Figma: 16px
    fontWeight: '500', // Medium
    color: '#2C2235',
    letterSpacing: -0.32, // Figma: -0.32px
    lineHeight: 24, // Figma: 24px
    flex: 1,
  },
  chevronIcon: {
    marginLeft: 8,
  },
  churchCardExpanded: {
    borderWidth: 2,
    borderColor: '#F10078', // Figma: pink border when expanded
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    width: '100%',
    minHeight: 190, // Figma: 190px
    overflow: 'hidden',
  },
  churchFieldExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    height: 50,
  },
  churchNameExpanded: {
    fontSize: 16, // Figma: 16px
    fontWeight: '500', // Medium
    color: '#271D30', // Figma: slightly different color when expanded
    letterSpacing: -0.32, // Figma: -0.32px
    lineHeight: 24, // Figma: 24px
    flex: 1,
  },
  chevronIconExpanded: {
    marginLeft: 8,
    transform: [{ rotate: '90deg' }], // Figma: rotated 90deg when expanded
  },
  serviceSection: {
    paddingHorizontal: 0, // No horizontal padding, services handle their own
    paddingBottom: 16,
    paddingTop: 0,
  },
  serviceLabel: {
    fontSize: 12, // Figma: 12px for the bold part
    lineHeight: 16,
    color: '#939393', // Figma: #939393
    marginBottom: 14, // Space before service items
    paddingLeft: 24, // Match church field padding
    paddingRight: 24,
  },
  serviceLabelBold: {
    fontSize: 12, // Figma: 12px
    fontWeight: '500', // Medium
    color: '#2C2235',
    letterSpacing: -0.28,
  },
  serviceLabelLight: {
    fontSize: 10, // Figma: 10px for the parentheses part
    fontWeight: '400', // Regular
    color: '#939393',
    letterSpacing: -0.28,
  },
  serviceCheckboxRow: {
    marginBottom: 4, // Figma: tighter spacing between services
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 38, // Figma: left padding for service items (38px from left edge)
    paddingRight: 48, // Figma: right padding to position checkbox (287px - 219px - 19px = 49px, use 48px)
  },
  serviceCheckbox: {
    width: 19, // Figma: 19px
    height: 19, // Figma: 19px
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceCheckboxChecked: {
    backgroundColor: '#FFFFFF', // Figma: white background when checked
    borderColor: '#F10078', // Figma: pink border (#F10078) when checked
  },
  serviceCheckmark: {
    color: '#F10078', // Figma: pink checkmark (#F10078)
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 14,
    includeFontPadding: false,
  },
  serviceCheckboxLabel: {
    fontSize: 14, // Figma: 14px
    color: '#2C2235',
    fontWeight: '500', // Medium
    flex: 1,
    letterSpacing: -0.28, // Figma: -0.28px
    lineHeight: 22, // Figma: 22px
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
    marginLeft: 16,
    marginRight: 16,
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
  footer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 0,
    paddingTop: 16,
  },
  nextButton: {
    width: 278, // Match other pages
  },
  backButton: {
    marginTop: 16,
  },
  backText: {
    color: '#999999', // Figma: #999999
    fontSize: 16, // Figma: 16px
    letterSpacing: -0.8, // Figma: -0.8px
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
    gap: 16,
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
    borderColor: '#FF0083', // Figma: #ff0083
    borderStyle: 'dashed',
    borderRadius: 12,
    minHeight: 93, // Figma: 93px
    paddingVertical: 18, // Figma: 506px - 488px = 18px top padding
    paddingHorizontal: 24, // Figma: 76px - 52px = 24px
    backgroundColor: 'rgba(241, 0, 120, 0.01)', // Figma: rgba(241,0,120,0.01)
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  missingChurchTitle: {
    color: '#2C2235',
    fontSize: 16, // Figma: 16px
    fontWeight: '700', // Bold
    letterSpacing: -0.32, // Figma: -0.32px
    lineHeight: 24, // Figma: 24px
    marginBottom: 4, // Small gap between title and subtitle
  },
  missingChurchSubtitle: {
    color: '#2C2235',
    fontSize: 12, // Figma: 12px
    letterSpacing: -0.24, // Figma: -0.24px
    lineHeight: 14, // Figma: 14px
  },
  missingChurchTextGroup: {
    flex: 1,
  },
  missingChurchIcon: {
    width: 37, // Figma: 37px
    height: 37, // Figma: 37px
    borderRadius: 18.5,
    backgroundColor: '#FF0083', // Figma: pink circle
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  missingChurchIconText: {
    color: '#FFFFFF',
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
    marginLeft: 16,
    marginRight: 16,
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
