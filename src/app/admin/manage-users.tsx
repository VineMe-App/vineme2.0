import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { userAdminService } from '@/services/admin';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { UserManagementCard } from '@/components/admin/UserManagementCard';
import { router } from 'expo-router';

type FilterType = 'all' | 'connected' | 'unconnected';

export default function ManageUsersScreen() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<FilterType>('all');

  const {
    data: users,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'church-users', user?.church_id],
    queryFn: async () => {
      if (!user?.church_id) {
        throw new Error('No church ID found');
      }
      const result = await userAdminService.getChurchUsers(user.church_id);
      if (result.error) {
        throw result.error;
      }
      return result.data || [];
    },
    enabled: !!user?.church_id,
  });

  const { data: churchSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['admin', 'church-summary', user?.church_id],
    queryFn: async () => {
      if (!user?.church_id) {
        throw new Error('No church ID found');
      }
      const result = await userAdminService.getChurchSummary(user.church_id);
      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
    enabled: !!user?.church_id,
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];

    switch (filter) {
      case 'connected':
        return users.filter((user) => user.is_connected);
      case 'unconnected':
        return users.filter((user) => !user.is_connected);
      default:
        return users;
    }
  }, [users, filter]);

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchSummary()]);
  };

  const handleUserPress = (userId: string) => {
    // Navigate to user detail view (to be implemented)
    Alert.alert('User Details', 'User detail view coming soon!');
  };

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Manage Users</Text>
        </View>
        <View style={styles.errorContainer}>
          <ErrorMessage
            message={error.message || 'Failed to load users'}
            onRetry={handleRefresh}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Manage Users</Text>
      </View>

      {/* Summary Stats */}
      {churchSummary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {churchSummary.total_users}
            </Text>
            <Text style={styles.summaryLabel}>Total Users</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {churchSummary.connected_users}
            </Text>
            <Text style={styles.summaryLabel}>Connected</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {churchSummary.unconnected_users}
            </Text>
            <Text style={styles.summaryLabel}>Unconnected</Text>
          </View>
        </View>
      )}

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'all' && styles.filterButtonTextActive,
            ]}
          >
            All Users ({users?.length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'connected' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('connected')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'connected' && styles.filterButtonTextActive,
            ]}
          >
            Connected ({users?.filter((u) => u.is_connected).length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'unconnected' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('unconnected')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'unconnected' && styles.filterButtonTextActive,
            ]}
          >
            Unconnected ({users?.filter((u) => !u.is_connected).length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
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
    </View>
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
    paddingBottom: 20,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
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
