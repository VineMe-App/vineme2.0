import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { adminServiceWrapper } from '@/services/adminServiceWrapper';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { UserManagementCard } from '@/components/admin/UserManagementCard';
import { AdminErrorBoundary } from '@/components/ui/AdminErrorBoundary';
import {
  AdminLoadingCard,
  AdminSkeletonLoader,
  AdminLoadingList,
} from '@/components/ui/AdminLoadingStates';
import { ChurchAdminOnly } from '@/components/ui/RoleBasedRender';
import { router } from 'expo-router';
import { AdminPageLayout } from '@/components/admin/AdminHeader';

export default function ManageUsersScreen() {
  const { userProfile } = useAuthStore();
  const [filter, setFilter] = useState<'all' | 'connected' | 'unconnected'>(
    'all'
  );

  const {
    data: users,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'church-users', userProfile?.church_id],
    queryFn: async () => {
      if (!userProfile?.church_id) {
        throw new Error('No church ID found');
      }
      const result = await adminServiceWrapper.getChurchUsers(
        userProfile.church_id,
        { context: { screen: 'manage-users' } }
      );
      if (result.error) {
        throw result.error;
      }
      return result.data || [];
    },
    enabled: !!userProfile?.church_id,
    refetchInterval: 60000, // Refetch every minute for real-time updates
    retry: (failureCount, error) => {
      // Don't retry permission errors
      if (error.message.toLowerCase().includes('permission')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const {
    data: churchSummary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['admin', 'church-summary', userProfile?.church_id],
    queryFn: async () => {
      if (!userProfile?.church_id) {
        throw new Error('No church ID found');
      }
      const result = await adminServiceWrapper.getChurchSummary(
        userProfile.church_id,
        { context: { screen: 'manage-users', section: 'summary' } }
      );
      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
    enabled: !!userProfile?.church_id,
    refetchInterval: 60000, // Refetch every minute for real-time updates
    retry: (failureCount, error) => {
      // Don't retry permission errors
      if (error.message.toLowerCase().includes('permission')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    switch (filter) {
      case 'connected':
        return users.filter((u: any) => u.is_connected);
      case 'unconnected':
        return users.filter((u: any) => !u.is_connected);
      default:
        return users;
    }
  }, [users, filter]);

  const allCount = users?.length || 0;
  const connectedCount = users?.filter((u: any) => u.is_connected).length || 0;
  const unconnectedCount = Math.max(0, allCount - connectedCount);

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchSummary()]);
  };

  const handleUserPress = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  if (error) {
    return (
      <AdminPageLayout title="Manage Users">
        <View style={styles.errorContainer}>
          <ErrorMessage
            message={error.message || 'Failed to load users'}
            onRetry={handleRefresh}
          />
        </View>
      </AdminPageLayout>
    );
  }

  return (
    <ChurchAdminOnly
      fallback={
        <AdminPageLayout title="Manage Users">
          <View style={styles.errorContainer}>
            <ErrorMessage
              message="You do not have permission to access this page. Church admin role required."
              onRetry={() => router.back()}
            />
          </View>
        </AdminPageLayout>
      }
    >
      <AdminErrorBoundary>
        <AdminPageLayout title="Manage Users">
          {/* Filters */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === 'all' && styles.filterButtonActive,
              ]}
              onPress={() => setFilter('all')}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === 'all' }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === 'all' && styles.filterButtonTextActive,
                ]}
              >
                All Users
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === 'connected' && styles.filterButtonActive,
              ]}
              onPress={() => setFilter('connected')}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === 'connected' }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === 'connected' && styles.filterButtonTextActive,
                ]}
              >
                Connected
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === 'unconnected' && styles.filterButtonActive,
              ]}
              onPress={() => setFilter('unconnected')}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === 'unconnected' }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === 'unconnected' && styles.filterButtonTextActive,
                ]}
              >
                Unconnected
              </Text>
            </TouchableOpacity>
          </View>

          {/* Counts indicator */}
          <View style={styles.countsRow}>
            <Text style={styles.countsText}>
              All: {allCount} • Connected: {connectedCount} • Unconnected:{' '}
              {unconnectedCount}
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.content}>
              <AdminLoadingCard
                title="Loading Users"
                message="Fetching church members and their group participation..."
              />
              <AdminLoadingList
                count={5}
                showAvatar={true}
                showActions={false}
              />
            </View>
          ) : (
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              refreshControl={
                Platform.OS === 'ios' ? (
                  <RefreshControl
                    refreshing={isLoading}
                    onRefresh={handleRefresh}
                  />
                ) : undefined
              }
            >
              {filteredUsers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {filter === 'all'
                      ? 'No users found'
                      : filter === 'connected'
                        ? 'No connected users found'
                        : 'No unconnected users found'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {filter === 'unconnected'
                      ? 'All users are connected to groups!'
                      : 'Users will appear here as they join your church.'}
                  </Text>
                </View>
              ) : (
                <View style={styles.usersList}>
                  {filteredUsers.map((user) => (
                    <UserManagementCard
                      key={user.id}
                      user={user}
                      onPress={() => handleUserPress(user.id)}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          )}
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
  // Page header is provided by AdminPageLayout
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  content: {
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
    color: '#6c757d',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  countsRow: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 4,
  },
  countsText: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  usersList: {
    padding: 24,
    gap: 12,
  },
});
