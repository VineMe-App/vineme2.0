import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Platform,
  Alert,
} from 'react-native';
// expo-clipboard is optional in dev client; gate usage to avoid native module errors
// Lazy load to prevent module initialization errors at load time
let Clipboard: typeof import('expo-clipboard') | null | undefined = undefined;
const getClipboard = (): typeof import('expo-clipboard') | null => {
  if (Clipboard !== undefined) return Clipboard;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const clipboardModule = require('expo-clipboard');
    Clipboard = clipboardModule;
    return Clipboard;
  } catch (error) {
    // Native module not available - this is expected in some environments
    Clipboard = null;
    if (__DEV__) {
      console.log(
        '[join-requests] expo-clipboard not available, clipboard functionality disabled'
      );
    }
    return null;
  }
};
import { Text } from '@/components/ui/Text';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { AdminPageLayout } from '@/components/admin/AdminHeader';
import { ChurchAdminOnly } from '@/components/ui/RoleBasedRender';
import { useServiceJoinRequests } from '@/hooks/useServiceJoinRequests';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/services/supabase';
import { getFullName, getDisplayName } from '@/utils/name';
import type { GroupMembershipWithUser } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { MembershipNotesSection } from '@/components/groups/MembershipNotesSection';
import { useGetContactInfo } from '@/hooks/useJoinRequests';

interface JoinRequestCardProps {
  request: GroupMembershipWithUser;
}

const formatPhoneNumber = (phone: string): string => {
  return phone.startsWith('+') ? phone : `+${phone}`;
};

const JoinRequestCard: React.FC<JoinRequestCardProps> = ({ request }) => {
  const [showNotes, setShowNotes] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const { userProfile } = useAuthStore();

  const userName = getDisplayName(request.user, { fallback: 'full' });
  const fullName = getFullName(request.user);

  const { data: contactInfo, isLoading: isLoadingContactInfo } =
    useGetContactInfo(
      showContactInfo ? request.id : undefined,
      userProfile?.id
    );

  const handleContactPress = async (type: 'email' | 'phone', value: string) => {
    let url: string;
    if (type === 'email') {
      url = `mailto:${value}`;
    } else {
      url = `tel:${value}`;
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(
        `Failed to open ${type} app`,
        'You can copy the value and open it manually.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Copy to Clipboard',
            onPress: async () => {
              const clipboard = getClipboard();
              if (!clipboard) {
                Alert.alert(
                  'Not Available',
                  'Clipboard functionality is not available on this device.'
                );
                return;
              }
              try {
                await clipboard.setStringAsync(value);
                Alert.alert(
                  'Copied',
                  `${type === 'email' ? 'Email' : 'Phone number'} copied to clipboard`
                );
              } catch (error) {
                console.error('Clipboard error:', error);
                Alert.alert('Error', 'Failed to copy to clipboard');
              }
            },
          },
        ]
      );
    }
  };

  // Get journey status label
  const getJourneyStatusLabel = (status: number | null) => {
    switch (status) {
      case 1:
        return 'Reached out to';
      case 2:
        return 'Spoken to';
      case 3:
        return 'Attended CG';
      default:
        return 'No contact';
    }
  };

  // Get journey status color
  const getJourneyStatusColor = (status: number | null) => {
    switch (status) {
      case 1:
        return '#eab308'; // yellow
      case 2:
        return '#3b82f6'; // blue
      case 3:
        return '#10b981'; // green
      default:
        return '#9ca3af'; // gray
    }
  };

  // Extract group leaders from the group data
  const groupLeaders =
    (request.group as any)?.memberships?.filter(
      (m: any) => m.role === 'leader' && m.status === 'active'
    ) || [];

  return (
    <View style={styles.requestCard}>
      {/* User Info */}
      <View style={styles.userSection}>
        <Avatar imageUrl={request.user?.avatar_url} name={fullName} size={48} />
        <View style={styles.userInfo}>
          <View style={styles.userHeaderRow}>
            <Text style={styles.userName}>{userName}</Text>
            {request.user?.newcomer && (
              <Badge variant="warning" size="small" style={styles.newcomerBadge}>
                Newcomer
              </Badge>
            )}
          </View>
          {(request.user as any)?.church?.name && (
            <Text style={styles.metaText}>
              Church: {(request.user as any).church.name}
            </Text>
          )}
          {(request.user as any)?.service?.name && (
            <Text style={styles.metaText}>
              Service: {(request.user as any).service.name}
            </Text>
          )}
          <Text style={styles.requestDate}>
            Requested {new Date(request.created_at || '').toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Group Info */}
      <View style={styles.groupSection}>
        <View style={styles.groupHeader}>
          <Ionicons name="people-outline" size={16} color="#6b7280" />
          <Text style={styles.groupTitle}>
            {(request.group as any)?.title || 'Unknown Group'}
          </Text>
        </View>

        {/* Journey Status */}
        <View style={styles.journeyStatus}>
          <Text style={styles.journeyLabel}>Journey Status:</Text>
          <Badge
            variant="secondary"
            style={{
              backgroundColor: getJourneyStatusColor(
                request.journey_status || null
              ),
            }}
          >
            <Text style={styles.journeyBadgeText}>
              {request.journey_status || 0}/3 -{' '}
              {getJourneyStatusLabel(request.journey_status || null)}
            </Text>
          </Badge>
        </View>

        {/* Group Leaders */}
        {groupLeaders.length > 0 && (
          <View style={styles.leadersSection}>
            <Text style={styles.leadersLabel}>Group Leaders:</Text>
            <View style={styles.leadersList}>
              {groupLeaders.map((leader: any) => (
                <View key={leader.user_id} style={styles.leaderItem}>
                  <Avatar
                    imageUrl={leader.user?.avatar_url}
                    name={getFullName(leader.user)}
                    size={24}
                  />
                  <Text style={styles.leaderName}>
                    {getDisplayName(leader.user, { fallback: 'full' })}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Contact Info Section */}
      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Contact Details</Text>
        <TouchableOpacity
          onPress={() => setShowContactInfo(!showContactInfo)}
          style={styles.contactToggle}
        >
          <Text style={styles.contactToggleText}>
            {showContactInfo ? 'Hide' : 'Show'} contact info
          </Text>
        </TouchableOpacity>
        {showContactInfo && (
          <View style={styles.contactInfoContainer}>
            {isLoadingContactInfo ? (
              <LoadingSpinner />
            ) : (
              <>
                {contactInfo?.email && (
                  <View style={styles.contactItem}>
                    <TouchableOpacity
                      onPress={() =>
                        handleContactPress('email', contactInfo.email)
                      }
                      style={styles.contactMain}
                    >
                      <Text style={styles.contactLabel}>Email</Text>
                      <Text style={styles.contactValue}>
                        {contactInfo.email}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        const clipboard = getClipboard();
                        if (!clipboard) {
                          Alert.alert(
                            'Not Available',
                            'Clipboard functionality is not available on this device.'
                          );
                          return;
                        }
                        try {
                          await clipboard.setStringAsync(contactInfo.email);
                          Alert.alert('Copied');
                        } catch (error) {
                          console.error('Copy error:', error);
                          Alert.alert('Error', 'Failed to copy email');
                        }
                      }}
                      style={styles.copyButton}
                    >
                      <Ionicons name="copy-outline" size={18} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                )}
                {contactInfo?.phone && (
                  <View style={styles.contactItem}>
                    <TouchableOpacity
                      onPress={() =>
                        handleContactPress(
                          'phone',
                          formatPhoneNumber(contactInfo.phone)
                        )
                      }
                      style={styles.contactMain}
                    >
                      <Text style={styles.contactLabel}>Phone</Text>
                      <Text style={styles.contactValue}>
                        {formatPhoneNumber(contactInfo.phone)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        const clipboard = getClipboard();
                        if (!clipboard) {
                          Alert.alert(
                            'Not Available',
                            'Clipboard functionality is not available on this device.'
                          );
                          return;
                        }
                        try {
                          await clipboard.setStringAsync(
                            formatPhoneNumber(contactInfo.phone)
                          );
                          Alert.alert('Copied');
                        } catch (error) {
                          console.error('Copy error:', error);
                          Alert.alert('Error', 'Failed to copy phone number');
                        }
                      }}
                      style={styles.copyButton}
                    >
                      <Ionicons name="copy-outline" size={18} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                )}
                {!contactInfo?.email && !contactInfo?.phone && (
                  <Text style={styles.noContactText}>
                    Contact information not available.
                  </Text>
                )}
              </>
            )}
          </View>
        )}
      </View>

      {/* Toggle Notes Button */}
      <TouchableOpacity
        style={styles.notesToggle}
        onPress={() => setShowNotes(!showNotes)}
      >
        <Ionicons
          name={showNotes ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#007AFF"
        />
        <Text style={styles.notesToggleText}>
          {showNotes ? 'Hide' : 'View'} Notes History
        </Text>
      </TouchableOpacity>

      {/* Notes Section */}
      {showNotes && (
        <View style={styles.notesContainer}>
          <MembershipNotesSection
            membershipId={request.id}
            groupId={request.group_id}
            userId={request.user_id}
            leaderId={userProfile?.id || ''}
            readOnly={true}
          />
        </View>
      )}
    </View>
  );
};

export default function JoinRequestsScreen() {
  const { userProfile } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch service and church info
  const { data: serviceInfo } = useQuery({
    queryKey: [
      'service-church-info',
      userProfile?.service_id,
      userProfile?.church_id,
    ],
    queryFn: async () => {
      if (!userProfile?.service_id || !userProfile?.church_id) return null;

      const [serviceRes, churchRes] = await Promise.all([
        supabase
          .from('services')
          .select('name')
          .eq('id', userProfile.service_id)
          .single(),
        supabase
          .from('churches')
          .select('name')
          .eq('id', userProfile.church_id)
          .single(),
      ]);

      return {
        serviceName: serviceRes.data?.name,
        churchName: churchRes.data?.name,
      };
    },
    enabled: !!userProfile?.service_id && !!userProfile?.church_id,
  });

  // Fetch join requests
  const {
    data: requests,
    isLoading,
    error,
    refetch,
  } = useServiceJoinRequests();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Error refreshing join requests:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (error) {
    return (
      <AdminPageLayout
        title="Group Join Requests"
        subtitle="View all pending join requests"
      >
        <View style={styles.errorContainer}>
          <ErrorMessage error={error} onRetry={refetch} />
        </View>
      </AdminPageLayout>
    );
  }

  return (
    <ChurchAdminOnly
      fallback={
        <AdminPageLayout
          title="Group Join Requests"
          subtitle="View all pending join requests"
          showHelpButton={false}
        >
          <View style={styles.errorContainer}>
            <ErrorMessage
              error={
                new Error(
                  'You do not have permission to access this page. Church admin role required.'
                )
              }
              onRetry={() => {}}
            />
          </View>
        </AdminPageLayout>
      }
    >
      <AdminPageLayout
        title="Group Join Requests"
        subtitle="View all pending join requests"
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="large" />
            <Text style={styles.loadingText}>Loading join requests...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
          >
            {/* Service & Church Header */}
            {serviceInfo && (
              <View style={styles.headerSection}>
                <Text style={styles.headerTitle}>
                  Join Requests for {serviceInfo.serviceName}
                </Text>
                <Text style={styles.headerSubtitle}>
                  at {serviceInfo.churchName}
                </Text>
              </View>
            )}

            {/* Summary */}
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {requests?.length || 0} pending join request
                {requests?.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Requests List */}
            {requests && requests.length > 0 ? (
              <View style={styles.requestsList}>
                {requests.map((request) => (
                  <JoinRequestCard key={request.id} request={request} />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={64}
                  color="#10b981"
                />
                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                <Text style={styles.emptyText}>
                  There are no pending join requests at this time.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </AdminPageLayout>
    </ChurchAdminOnly>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  headerSection: {
    marginBottom: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  summary: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  requestsList: {
    gap: 16,
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  newcomerBadge: {
    marginLeft: 'auto',
  },
  requestDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  groupSection: {
    gap: 12,
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  journeyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  journeyLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  journeyBadgeText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  leadersSection: {
    gap: 8,
  },
  leadersLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  leadersList: {
    gap: 8,
  },
  leaderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leaderName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  contactSection: {
    marginBottom: 12,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  contactToggle: {
    marginTop: 8,
  },
  contactToggleText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  contactInfoContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dbeafe',
  },
  contactMain: {
    flex: 1,
  },
  copyButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  contactValue: {
    fontSize: 14,
    color: '#2563eb',
    marginTop: 2,
  },
  noContactText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  notesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  notesToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
