import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { useAdminNotifications } from '@/hooks/useNotifications';
import { useQuery } from '@tanstack/react-query';
import { userAdminService } from '@/services/admin';
import { useAuthStore } from '@/stores/auth';

interface AdminDashboardSummaryProps {
  onRefresh?: () => void;
}

export function AdminDashboardSummary({
  onRefresh,
}: AdminDashboardSummaryProps) {
  const { user, userProfile } = useAuthStore();

  // Get notification counts
  const { notificationCounts, isLoading: isLoadingNotifications } =
    useAdminNotifications(user?.id);

  // Get church summary
  const { data: churchSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['admin', 'church-summary', userProfile?.church_id],
    queryFn: async () => {
      if (!userProfile?.church_id) throw new Error('No church ID found');
      const result = await userAdminService.getChurchSummary(
        userProfile.church_id
      );
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!userProfile?.church_id,
    refetchInterval: 60000, // Refetch every minute
  });

  const isLoading = isLoadingNotifications || isLoadingSummary;

  if (isLoading) {
    return (
      <Card style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="small" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>

      {/* Key Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>
            {churchSummary?.total_users || 0}
          </Text>
          <Text style={styles.metricLabel}>Total Users</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>
            {churchSummary?.active_groups || 0}
          </Text>
          <Text style={styles.metricLabel}>Active Groups</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>
            {churchSummary?.unconnected_users || 0}
          </Text>
          <Text style={styles.metricLabel}>Unconnected</Text>
        </View>
      </View>

      {/* Action Items */}
      <View style={styles.actionsContainer}>
        <Text style={styles.actionsTitle}>Pending Actions</Text>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => router.push('/admin/manage-groups')}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Group Requests</Text>
              <Text style={styles.actionDescription}>
                Review pending group creation requests
              </Text>
            </View>
            {notificationCounts.group_requests > 0 && (
              <NotificationBadge
                count={notificationCounts.group_requests}
                size="medium"
              />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => router.push('/admin/manage-users')}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>User Management</Text>
              <Text style={styles.actionDescription}>
                {churchSummary?.unconnected_users || 0} users need group
                connections
              </Text>
            </View>
            {(churchSummary?.unconnected_users || 0) > 0 && (
              <NotificationBadge
                count={churchSummary?.unconnected_users || 0}
                size="medium"
                color="#f59e0b"
              />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => {
            // Navigate to join requests - could be in groups or separate screen
            router.push('/(tabs)/groups');
          }}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Join Requests</Text>
              <Text style={styles.actionDescription}>
                Review pending group join requests
              </Text>
            </View>
            {notificationCounts.join_requests > 0 && (
              <NotificationBadge
                count={notificationCounts.join_requests}
                size="medium"
                color="#8b5cf6"
              />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Refresh Button */}
      {onRefresh && (
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Text style={styles.refreshButtonText}>Refresh Dashboard</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  actionsContainer: {
    marginBottom: 16,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  actionItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  refreshButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});
