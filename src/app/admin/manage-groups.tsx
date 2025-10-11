import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import {
  AdminAccessibilityLabels,
  ScreenReaderUtils,
} from '@/utils/accessibility';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/services/supabase';
import { type GroupWithAdminDetails } from '@/services/admin';
import { adminServiceWrapper } from '@/services/adminServiceWrapper';
import { ADMIN_CACHE_CONFIGS, ADMIN_QUERY_KEYS } from '@/utils/adminCache';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { AdminConfirmations } from '@/components/ui/ConfirmationDialog';
import { AdminErrorBoundary } from '@/components/ui/AdminErrorBoundary';
import { ChurchAdminOnly } from '@/components/ui/RoleBasedRender';
import { AdminPageLayout } from '@/components/admin/AdminHeader';
import { AdminHelp } from '@/components/admin/AdminOnboarding';
import { AdminNavigation } from '@/utils/adminNavigation';
import { useAdminNotifications } from '@/hooks/useNotifications';

interface GroupManagementCardProps {
  group: GroupWithAdminDetails;
  onApprove: (groupId: string) => void;
  onDecline: (groupId: string) => void;
  onClose: (groupId: string) => void;
  onViewMembers: (group: GroupWithAdminDetails) => void;
  isLoading?: boolean;
}

function GroupManagementCard({
  group,
  onApprove,
  onDecline,
  onClose,
  onViewMembers,
  isLoading = false,
}: GroupManagementCardProps) {
  const getStatusVariant = (
    status: string
  ): 'success' | 'warning' | 'error' | 'secondary' => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'denied':
        return 'error';
      case 'closed':
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'denied':
        return 'Denied';
      case 'closed':
        return 'Closed';
      default:
        return status;
    }
  };

  return (
    <Card style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <View style={styles.groupInfo}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <Badge
            variant={getStatusVariant(group.status)}
            size="small"
            style={styles.statusBadge}
          >
            {getStatusText(group.status)}
          </Badge>
        </View>
        <TouchableOpacity
          style={styles.viewMembersButton}
          onPress={() => onViewMembers(group)}
        >
          <Text style={styles.viewMembersText}>
            {group.member_count || 0} members
          </Text>
        </TouchableOpacity>
      </View>

      <Text
        style={styles.groupDescription}
        numberOfLines={2}
        accessibilityLabel={`Description: ${group.description}`}
      >
        {group.description}
      </Text>

      <View style={styles.groupDetails}>
        <Text style={styles.detailText}>
          📅 {group.meeting_day} at {group.meeting_time}
        </Text>
        {group.location && (
          <Text style={styles.detailText}>
            📍{' '}
            {typeof group.location === 'string'
              ? group.location
              : group.location?.address || ''}
          </Text>
        )}
      </View>

      {group.creator && (
        <View style={styles.creatorInfo}>
          <Avatar
            size={24}
            imageUrl={group.creator.avatar_url || undefined}
            name={group.creator.name || undefined}
          />
          <Text style={styles.creatorText}>
            Created by {group.creator.name}
          </Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        {group.status === 'pending' && (
          <>
            <Button
              title="Approve"
              onPress={() => onApprove(group.id)}
              variant="primary"
              size="small"
              style={styles.actionButton}
              disabled={isLoading}
              accessibilityLabel={AdminAccessibilityLabels.adminAction(
                'Approve',
                'group',
                group.title
              )}
              accessibilityHint="Double tap to approve this group request"
            />
            <Button
              title="Decline"
              onPress={() => onDecline(group.id)}
              variant="error"
              size="small"
              style={styles.actionButton}
              disabled={isLoading}
              accessibilityLabel={AdminAccessibilityLabels.adminAction(
                'Decline',
                'group',
                group.title
              )}
              accessibilityHint="Double tap to decline this group request"
            />
          </>
        )}
        {group.status === 'approved' && (
          <Button
            title="Close Group"
            onPress={() => onClose(group.id)}
            variant="secondary"
            size="small"
            style={styles.actionButton}
            disabled={isLoading}
            accessibilityLabel={AdminAccessibilityLabels.adminAction(
              'Close',
              'group',
              group.title
            )}
            accessibilityHint="Double tap to close this active group"
          />
        )}
      </View>
    </Card>
  );
}

interface GroupMembersModalProps {
  visible: boolean;
  group: GroupWithAdminDetails | null;
  onClose: () => void;
}

function GroupMembersModal({
  visible,
  group,
  onClose,
}: GroupMembersModalProps) {
  if (!visible || !group) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{group.title} Members</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.membersList}>
          {group.memberships && group.memberships.length > 0 ? (
            group.memberships
              .filter((membership: any) => membership.status === 'active')
              .map((membership: any) => (
                <View key={membership.id} style={styles.memberItem}>
                  <Avatar
                    size={40}
                    imageUrl={membership.user?.avatar_url}
                    name={membership.user?.name}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {membership.user?.name || 'Unknown User'}
                    </Text>
                    <Text style={styles.memberRole}>
                      {membership.role.charAt(0).toUpperCase() +
                        membership.role.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.joinDate}>
                    {new Date(membership.joined_at).toLocaleDateString()}
                  </Text>
                </View>
              ))
          ) : (
            <Text style={styles.noMembersText}>No active members</Text>
          )}
        </ScrollView>

        <Button
          title="Close"
          onPress={onClose}
          variant="secondary"
          style={styles.modalCloseButton}
        />
      </View>
    </View>
  );
}

export default function ManageGroupsScreen() {
  const { user, userProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] =
    useState<GroupWithAdminDetails | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    visible: boolean;
    type: 'approve' | 'decline' | 'close' | null;
    group: GroupWithAdminDetails | null;
  }>({
    visible: false,
    type: null,
    group: null,
  });

  // Local filters for group status
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'approved' | 'closed'
  >('all');

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

  // Get admin notifications
  const { notificationCounts, refreshNotifications } = useAdminNotifications(
    user?.id
  );

  // Simple query without complex features
  const {
    data: groups,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.churchGroups(userProfile?.church_id || '', true),
    queryFn: async () => {
      if (!userProfile?.church_id) throw new Error('No church ID found');
      const result = await adminServiceWrapper.getChurchGroups(
        userProfile.church_id,
        true,
        { context: { screen: 'manage-groups' } }
      );
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled: !!userProfile?.church_id,
    ...ADMIN_CACHE_CONFIGS.CHURCH_GROUPS,
  });

  // Derive visible groups from status filter
  const visibleGroups = React.useMemo(() => {
    const base = Array.isArray(groups) ? groups : [];
    if (statusFilter === 'all') return base;
    return base.filter((g: any) => g.status === statusFilter);
  }, [groups, statusFilter]);

  // Simple action handlers
  const handleApprove = async (groupId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    const group = groups?.find((g) => g.id === groupId);
    if (!group) return;

    setConfirmationDialog({
      visible: true,
      type: 'approve',
      group,
    });
  };

  const executeApprove = async () => {
    if (!user?.id || !confirmationDialog.group) return;

    setActionLoading(true);
    try {
      const result = await adminServiceWrapper.approveGroup(
        confirmationDialog.group.id,
        user.id,
        undefined,
        {
          context: {
            action: 'approve',
            groupId: confirmationDialog.group.id,
          },
        }
      );
      if (result.error) throw result.error;

      ScreenReaderUtils.announceForAccessibility(
        `Group ${confirmationDialog.group.title} has been approved`
      );

      Alert.alert('Success', 'Group approved successfully');

      queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.churchGroups(
          userProfile?.church_id || '',
          true
        ),
      });
      refreshNotifications();

      setConfirmationDialog({
        visible: false,
        type: null,
        group: null,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve group');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (groupId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    const group = groups?.find((g) => g.id === groupId);
    if (!group) return;

    setConfirmationDialog({
      visible: true,
      type: 'decline',
      group,
    });
  };

  const executeDecline = async () => {
    if (!user?.id || !confirmationDialog.group) return;

    setActionLoading(true);
    try {
      const result = await adminServiceWrapper.declineGroup(
        confirmationDialog.group.id,
        user.id,
        undefined,
        {
          context: {
            action: 'decline',
            groupId: confirmationDialog.group.id,
          },
        }
      );
      if (result.error) throw result.error;

      Alert.alert('Success', 'Group declined successfully');

      queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.churchGroups(
          userProfile?.church_id || '',
          true
        ),
      });
      refreshNotifications();

      setConfirmationDialog({
        visible: false,
        type: null,
        group: null,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to decline group');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async (groupId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    const group = groups?.find((g) => g.id === groupId);
    if (!group) return;

    setConfirmationDialog({
      visible: true,
      type: 'close',
      group,
    });
  };

  const executeClose = async () => {
    if (!user?.id || !confirmationDialog.group) return;

    setActionLoading(true);
    try {
      const result = await adminServiceWrapper.closeGroup(
        confirmationDialog.group.id,
        user.id,
        undefined,
        {
          context: {
            action: 'close',
            groupId: confirmationDialog.group.id,
          },
        }
      );
      if (result.error) throw result.error;

      Alert.alert('Success', 'Group closed successfully');

      queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.churchGroups(
          userProfile?.church_id || '',
          true
        ),
      });
      refreshNotifications();

      setConfirmationDialog({
        visible: false,
        type: null,
        group: null,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to close group');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewMembers = (group: GroupWithAdminDetails) => {
    setSelectedGroup(group);
    setShowMembersModal(true);
  };

  const renderConfirmationDialog = () => {
    if (!confirmationDialog.visible || !confirmationDialog.group) return null;

    const { type, group } = confirmationDialog;

    switch (type) {
      case 'approve':
        return AdminConfirmations.approveGroup(
          group.title,
          executeApprove,
          () =>
            setConfirmationDialog({
              visible: false,
              type: null,
              group: null,
            }),
          actionLoading
        );
      case 'decline':
        return AdminConfirmations.declineGroup(
          group.title,
          executeDecline,
          () =>
            setConfirmationDialog({
              visible: false,
              type: null,
              group: null,
            }),
          actionLoading
        );
      case 'close':
        return AdminConfirmations.closeGroup(
          group.title,
          group.member_count || 0,
          executeClose,
          () =>
            setConfirmationDialog({
              visible: false,
              type: null,
              group: null,
            }),
          actionLoading
        );
      default:
        return null;
    }
  };

  if (error) {
    return (
      <AdminPageLayout
        title="Manage Groups"
        subtitle="Review and manage church groups"
        onHelpPress={() => setShowHelp(true)}
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
          title="Manage Groups"
          subtitle="Review and manage church groups"
          showHelpButton={false}
        >
          <View style={styles.errorContainer}>
            <ErrorMessage
              error={
                new Error(
                  'You do not have permission to access this page. Church admin role required.'
                )
              }
              onRetry={() => AdminNavigation.goBack()}
            />
          </View>
        </AdminPageLayout>
      }
    >
      <AdminErrorBoundary>
        <AdminPageLayout
          title="Manage Groups"
          subtitle="Review and manage church groups"
          notificationCount={notificationCounts.group_requests}
          onHelpPress={() => setShowHelp(true)}
          breadcrumbs={AdminNavigation.getBreadcrumbs('/admin/manage-groups')}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size="large" />
              <Text style={styles.loadingText}>Loading groups...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Simple refresh button instead of RefreshControl */}
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => {
                  refetch();
                  refreshNotifications();
                }}
              >
                <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
              </TouchableOpacity>

              {/* Service & Church Header */}
              {serviceInfo && (
                <View style={styles.headerSection}>
                  <Text style={styles.headerTitle}>
                    Groups for {serviceInfo.serviceName}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    at {serviceInfo.churchName}
                  </Text>
                </View>
              )}

              {groups && groups.length > 0 ? (
                <>
                  <View style={styles.summary}>
                    <Text style={styles.summaryText}>
                      {groups.length} total groups
                    </Text>
                    <Text style={styles.summaryText}>
                      {groups.filter((g) => g.status === 'pending').length}{' '}
                      pending approval
                    </Text>
                  </View>

                  <View
                    style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}
                  >
                    {(['all', 'pending', 'approved', 'closed'] as const).map(
                      (key) => (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.filterChip,
                            statusFilter === key && styles.filterChipActive,
                          ]}
                          onPress={() => setStatusFilter(key)}
                        >
                          <Text
                            style={
                              statusFilter === key
                                ? [
                                    styles.filterChipText,
                                    styles.filterChipTextActive,
                                  ]
                                : styles.filterChipText
                            }
                          >
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>

                  {visibleGroups.map((group) => (
                    <GroupManagementCard
                      key={group.id}
                      group={group}
                      onApprove={handleApprove}
                      onDecline={handleDecline}
                      onClose={handleClose}
                      onViewMembers={handleViewMembers}
                      isLoading={actionLoading}
                    />
                  ))}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>No Groups Found</Text>
                  <Text style={styles.emptyStateText}>
                    There are no groups in your church yet.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          <GroupMembersModal
            visible={showMembersModal}
            group={selectedGroup}
            onClose={() => {
              setShowMembersModal(false);
              setSelectedGroup(null);
            }}
          />

          {/* Help Modal */}
          <AdminHelp
            visible={showHelp}
            onClose={() => setShowHelp(false)}
            context="groups"
          />

          {/* Confirmation Dialogs */}
          {renderConfirmationDialog()}
        </AdminPageLayout>
      </AdminErrorBoundary>
    </ChurchAdminOnly>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'center',
    marginBottom: 16,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 4,
  },
  groupCard: {
    marginBottom: 16,
    padding: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  groupInfo: {
    flex: 1,
    marginRight: 12,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
  viewMembersButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },
  viewMembersText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  groupDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
    lineHeight: 20,
  },
  groupDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creatorText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    margin: 24,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6c757d',
  },
  membersList: {
    maxHeight: 300,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  memberRole: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  joinDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  noMembersText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    paddingVertical: 24,
  },
  modalCloseButton: {
    marginTop: 16,
  },
});
