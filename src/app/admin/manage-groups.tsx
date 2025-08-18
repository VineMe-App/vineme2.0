import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, FlatList, Platform } from 'react-native';
import { 
  AccessibilityHelpers, 
  AdminAccessibilityLabels, 
  ScreenReaderUtils,
  ColorContrastUtils 
} from '@/utils/accessibility';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import {
  type GroupWithAdminDetails,
} from '@/services/admin';
import { adminServiceWrapper } from '@/services/adminServiceWrapper';
import { 
  createPaginationParams, 
  ADMIN_PAGINATION_DEFAULTS,
  mergePaginatedData,
} from '@/utils/adminPagination';
import { ADMIN_CACHE_CONFIGS, ADMIN_QUERY_KEYS } from '@/utils/adminCache';
import { useAdminBackgroundSync } from '@/services/adminBackgroundSync';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { ConfirmationDialog, AdminConfirmations } from '@/components/ui/ConfirmationDialog';
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
import { AdminPageLayout } from '@/components/admin/AdminHeader';
import { AdminHelp } from '@/components/admin/AdminOnboarding';
import { AdminNavigation } from '@/utils/adminNavigation';
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
  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'secondary' => {
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
    <Card 
      style={styles.groupCard}
      {...AccessibilityHelpers.createNavigationProps(
        `Group ${group.title}`,
        'Double tap to view group details and actions'
      )}
    >
      <View style={styles.groupHeader}>
        <View style={styles.groupInfo}>
          <Text 
            style={styles.groupTitle}
            accessibilityRole="header"
            accessibilityLevel={3}
          >
            {group.title}
          </Text>
          <Badge
            variant={getStatusVariant(group.status)}
            size="small"
            style={styles.statusBadge}
            {...AccessibilityHelpers.createStatusProps(group.status, group.title)}
          >
            {getStatusText(group.status)}
          </Badge>
        </View>
        <TouchableOpacity
          style={styles.viewMembersButton}
          onPress={() => onViewMembers(group)}
          {...AccessibilityHelpers.createButtonProps(
            `View ${group.member_count || 0} members of ${group.title}`,
            'Double tap to see member list'
          )}
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

      <View 
        style={styles.groupDetails}
        accessibilityRole="text"
        accessibilityLabel={`Meeting details: ${group.meeting_day} at ${group.meeting_time}${
          group.location ? `, Location: ${typeof group.location === 'string' ? group.location : group.location.address}` : ''
        }`}
      >
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

      <View 
        style={styles.actionButtons}
        accessibilityRole="group"
        accessibilityLabel="Group management actions"
      >
        {group.status === 'pending' && (
          <>
            <Button
              title="Approve"
              onPress={() => onApprove(group.id)}
              variant="primary"
              size="small"
              style={styles.actionButton}
              disabled={isLoading}
              accessibilityLabel={AdminAccessibilityLabels.adminAction('Approve', 'group', group.title)}
              accessibilityHint="Double tap to approve this group request"
            />
            <Button
              title="Decline"
              onPress={() => onDecline(group.id)}
              variant="danger"
              size="small"
              style={styles.actionButton}
              disabled={isLoading}
              accessibilityLabel={AdminAccessibilityLabels.adminAction('Decline', 'group', group.title)}
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
            accessibilityLabel={AdminAccessibilityLabels.adminAction('Close', 'group', group.title)}
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
  const [actionError, setActionError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [enablePagination, setEnablePagination] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    visible: boolean;
    type: 'approve' | 'decline' | 'close' | null;
    group: GroupWithAdminDetails | null;
    isLoading: boolean;
  }>({
    visible: false,
    type: null,
    group: null,
    isLoading: false,
  });

  // Local filters for group status
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'closed'>('all');

  // Background sync for real-time updates
  const backgroundSync = useAdminBackgroundSync(userProfile?.church_id);

  // Get admin notifications for real-time updates
  const { notificationCounts, refreshNotifications } = useAdminNotifications(user?.id);

  // Note: auto-enable pagination moved below after finalGroups is defined

  // Start background sync when component mounts
  React.useEffect(() => {
    if (user?.church_id && backgroundSync.isAvailable) {
      backgroundSync.start();
    }
    
    return () => {
      if (backgroundSync.isAvailable) {
        backgroundSync.stop();
      }
    };
  }, [userProfile?.church_id, backgroundSync]);

  // Enhanced async operations for admin actions
  const approveOperation = useAdminAsyncOperation({
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ADMIN_QUERY_KEYS.churchGroups(user?.church_id || '', true) 
      });
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
      queryClient.invalidateQueries({ 
        queryKey: ADMIN_QUERY_KEYS.churchGroups(user?.church_id || '', true) 
      });
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
      queryClient.invalidateQueries({ 
        queryKey: ADMIN_QUERY_KEYS.churchGroups(user?.church_id || '', true) 
      });
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

  // Regular query for smaller datasets
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
    enabled: !!userProfile?.church_id && !enablePagination,
    ...ADMIN_CACHE_CONFIGS.CHURCH_GROUPS,
    retry: (failureCount, error) => {
      if (error.message.toLowerCase().includes('permission')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Infinite query for large datasets with pagination
  const {
    data: paginatedData,
    isLoading: isPaginatedLoading,
    error: paginatedError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchPaginated,
  } = useInfiniteQuery({
    queryKey: [...ADMIN_QUERY_KEYS.churchGroups(userProfile?.church_id || '', true), 'paginated'],
    queryFn: async ({ pageParam = 1 }) => {
      if (!userProfile?.church_id) throw new Error('No church ID found');
      
      const pagination = createPaginationParams(
        pageParam, 
        ADMIN_PAGINATION_DEFAULTS.GROUPS_PER_PAGE
      );
      
      const result = await adminServiceWrapper.getChurchGroups(
        userProfile.church_id,
        true,
        pagination,
        { context: { screen: 'manage-groups', page: pageParam } }
      );
      
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!userProfile?.church_id && enablePagination,
    getNextPageParam: (lastPage) => {
      if (!lastPage || typeof lastPage === 'object' && 'pagination' in lastPage) {
        const paginatedResponse = lastPage as any;
        return paginatedResponse.pagination.hasNextPage 
          ? paginatedResponse.pagination.page + 1 
          : undefined;
      }
      return undefined;
    },
    ...ADMIN_CACHE_CONFIGS.CHURCH_GROUPS,
  });

  // Determine which data to use
  const finalGroups = enablePagination 
    ? paginatedData?.pages.flatMap(page => 
        typeof page === 'object' && 'data' in page ? page.data : page
      ) || []
    : groups || [];
  
  const finalIsLoading = enablePagination ? isPaginatedLoading : isLoading;
  const finalError = enablePagination ? paginatedError : error;
  const finalRefetch = enablePagination ? refetchPaginated : refetch;

  // Auto-enable pagination for large datasets (after finalGroups is computed)
  React.useEffect(() => {
    const count = Array.isArray(finalGroups) ? finalGroups.length : 0;
    if (count > 50 && !enablePagination) {
      setEnablePagination(true);
    }
  }, [finalGroups, enablePagination]);

  // Derive visible groups from status filter
  const visibleGroups = React.useMemo(() => {
    const base = Array.isArray(finalGroups) ? finalGroups : [];
    if (statusFilter === 'all') return base;
    return base.filter((g: any) => g.status === statusFilter);
  }, [finalGroups, statusFilter]);

  // Enhanced action handlers with confirmation dialogs
  const handleApprove = async (groupId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    const group = finalGroups?.find(g => g.id === groupId);
    if (!group) return;

    setConfirmationDialog({
      visible: true,
      type: 'approve',
      group,
      isLoading: false,
    });
  };

  const executeApprove = async () => {
    if (!user?.id || !confirmationDialog.group) return;

    setConfirmationDialog(prev => ({ ...prev, isLoading: true }));

    try {
      await approveOperation.executeWithOptimisticUpdate(
        async () => {
          const result = await adminServiceWrapper.approveGroup(
            confirmationDialog.group!.id,
            user.id,
            undefined,
            { context: { action: 'approve', groupId: confirmationDialog.group!.id } }
          );
          if (result.error) throw result.error;
          
          // Announce success to screen reader
          ScreenReaderUtils.announceForAccessibility(`Group ${confirmationDialog.group!.title} has been approved`);
          
          return result.data;
        },
        // Optimistic update: immediately show group as approved
        finalGroups?.map(g => 
          g.id === confirmationDialog.group!.id ? { ...g, status: 'approved' } : g
        ) || [],
        { action: 'approve', groupId: confirmationDialog.group!.id }
      );

      setConfirmationDialog({ visible: false, type: null, group: null, isLoading: false });
    } catch (error) {
      setConfirmationDialog(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const handleDecline = async (groupId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    const group = finalGroups?.find(g => g.id === groupId);
    if (!group) return;

    setConfirmationDialog({
      visible: true,
      type: 'decline',
      group,
      isLoading: false,
    });
  };

  const executeDecline = async () => {
    if (!user?.id || !confirmationDialog.group) return;

    setConfirmationDialog(prev => ({ ...prev, isLoading: true }));

    try {
      await declineOperation.executeWithOptimisticUpdate(
        async () => {
          const result = await adminServiceWrapper.declineGroup(
            confirmationDialog.group!.id,
            user.id,
            undefined,
            { context: { action: 'decline', groupId: confirmationDialog.group!.id } }
          );
          if (result.error) throw result.error;
          return result.data;
        },
        // Optimistic update: immediately show group as denied
        finalGroups?.map(g => 
          g.id === confirmationDialog.group!.id ? { ...g, status: 'denied' } : g
        ) || [],
        { action: 'decline', groupId: confirmationDialog.group!.id }
      );

      setConfirmationDialog({ visible: false, type: null, group: null, isLoading: false });
    } catch (error) {
      setConfirmationDialog(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const handleClose = async (groupId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    const group = finalGroups?.find(g => g.id === groupId);
    if (!group) return;

    setConfirmationDialog({
      visible: true,
      type: 'close',
      group,
      isLoading: false,
    });
  };

  const executeClose = async () => {
    if (!user?.id || !confirmationDialog.group) return;

    setConfirmationDialog(prev => ({ ...prev, isLoading: true }));

    try {
      await closeOperation.executeWithOptimisticUpdate(
        async () => {
          const result = await adminServiceWrapper.closeGroup(
            confirmationDialog.group!.id,
            user.id,
            undefined,
            { context: { action: 'close', groupId: confirmationDialog.group!.id } }
          );
          if (result.error) throw result.error;
          return result.data;
        },
        // Optimistic update: immediately show group as closed
        finalGroups?.map(g => 
          g.id === confirmationDialog.group!.id ? { ...g, status: 'closed' } : g
        ) || [],
        { action: 'close', groupId: confirmationDialog.group!.id }
      );

      setConfirmationDialog({ visible: false, type: null, group: null, isLoading: false });
    } catch (error) {
      setConfirmationDialog(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };



  const handleViewMembers = (group: GroupWithAdminDetails) => {
    setSelectedGroup(group);
    setShowMembersModal(true);
  };

  const isActionLoading =
    approveOperation.loading ||
    declineOperation.loading ||
    closeOperation.loading;

  // Load more data callback for pagination
  const handleLoadMore = useCallback(() => {
    if (enablePagination && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [enablePagination, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Render group item for FlatList
  const renderGroupItem = useCallback(({ item: group }: { item: GroupWithAdminDetails }) => (
    <GroupManagementCard
      key={group.id}
      group={group}
      onApprove={handleApprove}
      onDecline={handleDecline}
      onClose={handleClose}
      onViewMembers={handleViewMembers}
      isLoading={isActionLoading}
    />
  ), [handleApprove, handleDecline, handleClose, handleViewMembers, isActionLoading]);

  const renderConfirmationDialog = () => {
    if (!confirmationDialog.visible || !confirmationDialog.group) return null;

    const { type, group, isLoading } = confirmationDialog;

    switch (type) {
      case 'approve':
        return AdminConfirmations.approveGroup(
          group.title,
          executeApprove,
          () => setConfirmationDialog({ visible: false, type: null, group: null, isLoading: false }),
          isLoading
        );
      case 'decline':
        return AdminConfirmations.declineGroup(
          group.title,
          executeDecline,
          () => setConfirmationDialog({ visible: false, type: null, group: null, isLoading: false }),
          isLoading
        );
      case 'close':
        return AdminConfirmations.closeGroup(
          group.title,
          group.member_count || 0,
          executeClose,
          () => setConfirmationDialog({ visible: false, type: null, group: null, isLoading: false }),
          isLoading
        );
      default:
        return null;
    }
  };

  if (finalError) {
    return (
      <AdminPageLayout
        title="Manage Groups"
        subtitle="Review and manage church groups"
        onHelpPress={() => setShowHelp(true)}
      >
        <ErrorMessage
          message={finalError.message || 'Failed to load groups'}
          onRetry={finalRefetch}
        />
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
              message="You do not have permission to access this page. Church admin role required."
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
          onRefresh={() => {
            finalRefetch();
            refreshNotifications();
            backgroundSync.syncNow();
          }}
          isRefreshing={finalIsLoading}
          breadcrumbs={AdminNavigation.getBreadcrumbs('/admin/manage-groups')}
        >

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

      {finalIsLoading ? (
        <View style={styles.content}>
          <AdminLoadingCard
            title="Loading Groups"
            message="Fetching church groups and their details..."
          />
          <AdminLoadingList count={3} showActions={true} />
        </View>
      ) : enablePagination ? (
        <FlatList
          style={styles.content}
          data={visibleGroups}
          renderItem={renderGroupItem}
          keyExtractor={(item) => item.id}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          refreshControl={
            Platform.OS === 'ios'
              ? (
                  <RefreshControl
                    refreshing={finalIsLoading}
                    onRefresh={finalRefetch}
                  />
                )
              : undefined
          }
          ListHeaderComponent={
            visibleGroups.length > 0 ? (
              <View style={styles.summary}>
                <View style={styles.summaryStats}>
                  <Text style={styles.summaryText}>
                    {finalGroups.length}+ total groups
                  </Text>
                  <Text style={styles.summaryText}>
                    {finalGroups.filter((g) => g.status === 'pending').length} pending
                    approval
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => {
                    finalRefetch();
                    refreshNotifications();
                    backgroundSync.syncNow();
                  }}
                >
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.loadingMore}>
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <LoadingSpinner size="small" />
                </View>
                <Text style={styles.loadingMoreText}>Loading more groups...</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No Groups Found</Text>
              <Text style={styles.emptyStateText}>
                There are no groups in your church yet.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            Platform.OS === 'ios'
              ? (
                  <RefreshControl
                    refreshing={finalIsLoading}
                    onRefresh={finalRefetch}
                  />
                )
              : undefined
          }
        >
          {finalGroups && finalGroups.length > 0 ? (
            <>
              <View style={styles.summary}>
                <View style={styles.summaryStats}>
                  <Text style={styles.summaryText}>
                    {finalGroups.length} total groups
                  </Text>
                  <Text style={styles.summaryText}>
                    {finalGroups.filter((g) => g.status === 'pending').length} pending
                    approval
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => {
                    finalRefetch();
                    refreshNotifications();
                    backgroundSync.syncNow();
                  }}
                >
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {(['all','pending','approved','closed'] as const).map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.filterChip, statusFilter === key && styles.filterChipActive]}
                    onPress={() => setStatusFilter(key)}
                  >
                    <Text style={[styles.filterChipText, statusFilter === key && styles.filterChipTextActive]}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {visibleGroups.map((group) => (
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
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6c757d',
  },
});
