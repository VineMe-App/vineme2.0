import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import {
  type GroupWithAdminDetails,
} from '@/services/admin';
import { adminServiceWrapper } from '@/services/adminServiceWrapper';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { 
  AdminErrorBoundary, 
  AdminActionError, 
  AdminLoadingOverlay,
  AdminRetryableError,
} from '@/components/ui/AdminErrorBoundary';
import { 
  AdminLoadingCard,
  AdminSkeletonLoader,
  AdminLoadingList,
} from '@/components/ui/AdminLoadingStates';
import { ChurchAdminOnly } from '@/components/ui/RoleBasedRender';
import { useAdminNotifications } from '@/hooks/useNotifications';
import { useAdminAsyncOperation } from '@/hooks/useAdminAsyncOperation';

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
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#fbbf24';
      case 'approved':
        return '#10b981';
      case 'denied':
        return '#ef4444';
      case 'closed':
        return '#6b7280';
      default:
        return '#6b7280';
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
            text={getStatusText(group.status)}
            color={getStatusColor(group.status)}
            style={styles.statusBadge}
          />
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

      <Text style={styles.groupDescription} numberOfLines={2}>
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
              : group.location.address}
          </Text>
        )}
      </View>

      {group.creator && (
        <View style={styles.creatorInfo}>
          <Avatar
            size={24}
            imageUrl={group.creator.avatar_url}
            name={group.creator.name}
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
            />
            <Button
              title="Decline"
              onPress={() => onDecline(group.id)}
              variant="danger"
              size="small"
              style={styles.actionButton}
              disabled={isLoading}
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
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] =
    useState<GroupWithAdminDetails | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [actionError, setActionError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Get admin notifications for real-time updates
  const { notificationCounts, refreshNotifications } = useAdminNotifications(user?.id);

  // Enhanced async operations for admin actions
  const approveOperation = useAdminAsyncOperation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      refreshNotifications();
      setActionError(null);
      setRetryCount(0);
    },
    onError: (error) => {
      setActionError(error);
    },
    onRetry: (count) => {
      setRetryCount(count);
    },
    showSuccessAlert: true,
    maxRetries: 3,
  });

  const declineOperation = useAdminAsyncOperation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      refreshNotifications();
      setActionError(null);
      setRetryCount(0);
    },
    onError: (error) => {
      setActionError(error);
    },
    onRetry: (count) => {
      setRetryCount(count);
    },
    showSuccessAlert: true,
    maxRetries: 3,
  });

  const closeOperation = useAdminAsyncOperation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      refreshNotifications();
      setActionError(null);
      setRetryCount(0);
    },
    onError: (error) => {
      setActionError(error);
    },
    onRetry: (count) => {
      setRetryCount(count);
    },
    showSuccessAlert: true,
    maxRetries: 3,
  });

  // Get church groups with enhanced error handling
  const {
    data: groups,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-groups', user?.church_id],
    queryFn: async () => {
      if (!user?.church_id) throw new Error('No church ID found');
      const result = await adminServiceWrapper.getChurchGroups(
        user.church_id,
        true,
        { context: { screen: 'manage-groups' } }
      );
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled: !!user?.church_id,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    retry: (failureCount, error) => {
      // Don't retry permission errors
      if (error.message.toLowerCase().includes('permission')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Enhanced action handlers with optimistic updates
  const handleApprove = async (groupId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    Alert.alert(
      'Approve Group',
      'Are you sure you want to approve this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            await approveOperation.executeWithOptimisticUpdate(
              async () => {
                const result = await adminServiceWrapper.approveGroup(
                  groupId,
                  user.id,
                  undefined,
                  { context: { action: 'approve', groupId } }
                );
                if (result.error) throw result.error;
                return result.data;
              },
              // Optimistic update: immediately show group as approved
              groups?.map(g => 
                g.id === groupId ? { ...g, status: 'approved' } : g
              ) || [],
              { action: 'approve', groupId }
            );
          },
        },
      ]
    );
  };

  const handleDecline = async (groupId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    Alert.alert(
      'Decline Group',
      'Are you sure you want to decline this group? You can optionally provide a reason.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            await declineOperation.executeWithOptimisticUpdate(
              async () => {
                const result = await adminServiceWrapper.declineGroup(
                  groupId,
                  user.id,
                  undefined,
                  { context: { action: 'decline', groupId } }
                );
                if (result.error) throw result.error;
                return result.data;
              },
              // Optimistic update: immediately show group as denied
              groups?.map(g => 
                g.id === groupId ? { ...g, status: 'denied' } : g
              ) || [],
              { action: 'decline', groupId }
            );
          },
        },
      ]
    );
  };

  const handleClose = async (groupId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    Alert.alert(
      'Close Group',
      'Are you sure you want to close this group? This will make it inactive.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            await closeOperation.executeWithOptimisticUpdate(
              async () => {
                const result = await adminServiceWrapper.closeGroup(
                  groupId,
                  user.id,
                  undefined,
                  { context: { action: 'close', groupId } }
                );
                if (result.error) throw result.error;
                return result.data;
              },
              // Optimistic update: immediately show group as closed
              groups?.map(g => 
                g.id === groupId ? { ...g, status: 'closed' } : g
              ) || [],
              { action: 'close', groupId }
            );
          },
        },
      ]
    );
  };



  const handleViewMembers = (group: GroupWithAdminDetails) => {
    setSelectedGroup(group);
    setShowMembersModal(true);
  };

  const isActionLoading =
    approveOperation.loading ||
    declineOperation.loading ||
    closeOperation.loading;

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Manage Groups</Text>
        </View>
        <ErrorMessage
          message={error.message || 'Failed to load groups'}
          onRetry={refetch}
        />
      </View>
    );
  }

  return (
    <ChurchAdminOnly
      fallback={
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Manage Groups</Text>
          </View>
          <View style={styles.errorContainer}>
            <ErrorMessage
              message="You do not have permission to access this page. Church admin role required."
              onRetry={() => router.back()}
            />
          </View>
        </View>
      }
    >
      <AdminErrorBoundary>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Manage Groups</Text>
              {notificationCounts.group_requests > 0 && (
                <NotificationBadge 
                  count={notificationCounts.group_requests} 
                  size="medium"
                  style={styles.headerBadge}
                />
              )}
            </View>
          </View>

          {actionError && (
            <AdminRetryableError
              error={actionError}
              retryCount={retryCount}
              maxRetries={3}
              onRetry={() => {
                // Retry the last failed operation
                if (approveOperation.error) {
                  // Re-trigger approve operation
                } else if (declineOperation.error) {
                  // Re-trigger decline operation
                } else if (closeOperation.error) {
                  // Re-trigger close operation
                }
                setActionError(null);
              }}
              onDismiss={() => {
                setActionError(null);
                setRetryCount(0);
                approveOperation.reset();
                declineOperation.reset();
                closeOperation.reset();
              }}
            />
          )}

          {/* Loading overlay for admin operations */}
          <AdminLoadingOverlay
            visible={isActionLoading}
            message={
              approveOperation.loading ? 'Approving group...' :
              declineOperation.loading ? 'Declining group...' :
              closeOperation.loading ? 'Closing group...' :
              'Processing...'
            }
            onCancel={() => {
              approveOperation.cancel();
              declineOperation.cancel();
              closeOperation.cancel();
            }}
          />

      {isLoading ? (
        <View style={styles.content}>
          <AdminLoadingCard
            title="Loading Groups"
            message="Fetching church groups and their details..."
          />
          <AdminLoadingList count={3} showActions={true} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
        >
          {groups && groups.length > 0 ? (
            <>
              <View style={styles.summary}>
                <View style={styles.summaryStats}>
                  <Text style={styles.summaryText}>
                    {groups.length} total groups
                  </Text>
                  <Text style={styles.summaryText}>
                    {groups.filter((g) => g.status === 'pending').length} pending
                    approval
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => {
                    refetch();
                    refreshNotifications();
                  }}
                >
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {groups.map((group) => (
                <GroupManagementCard
                  key={group.id}
                  group={group}
                  onApprove={handleApprove}
                  onDecline={handleDecline}
                  onClose={handleClose}
                  onViewMembers={handleViewMembers}
                  isLoading={isActionLoading}
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
        </View>
      </AdminErrorBoundary>
    </ChurchAdminOnly>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerBadge: {
    top: -4,
    right: -12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  summaryStats: {
    flex: 1,
  },
  refreshButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  summaryText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
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
