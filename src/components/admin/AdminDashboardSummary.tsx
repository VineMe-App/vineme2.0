import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import { router } from 'expo-router';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { useEnhancedNotifications } from '@/hooks/useNotifications';
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

  // Get enhanced unread notifications and derive counts needed for admin
  const { unreadNotifications = [], isLoading: isLoadingNotifications } =
    useEnhancedNotifications(user?.id);

  const notificationCounts = {
    group_requests: unreadNotifications.filter(
      (n: any) => n.type === 'group_request_submitted'
    ).length,
    join_requests: unreadNotifications.filter(
      (n: any) => n.type === 'join_request_received'
    ).length,
    total: unreadNotifications.length,
  };

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
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="small" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Overview */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Church Overview</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {churchSummary?.total_users || 0}
            </Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {churchSummary?.active_groups || 0}
            </Text>
            <Text style={styles.statLabel}>Active Groups</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {churchSummary?.unconnected_users || 0}
            </Text>
            <Text style={styles.statLabel}>Need Connection</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/admin/manage-groups')}
          >
            <View style={styles.actionHeader}>
              <Text style={styles.actionTitle}>Group Requests</Text>
              {notificationCounts.group_requests > 0 && (
                <NotificationBadge
                  count={notificationCounts.group_requests}
                  size="small"
                />
              )}
            </View>
            <Text style={styles.actionDescription}>
              Review pending group creation requests
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/admin/manage-users')}
          >
            <View style={styles.actionHeader}>
              <Text style={styles.actionTitle}>User Management</Text>
              {(churchSummary?.unconnected_users || 0) > 0 && (
                <NotificationBadge
                  count={churchSummary?.unconnected_users || 0}
                  size="small"
                  color="#f59e0b"
                />
              )}
            </View>
            <Text style={styles.actionDescription}>
              {churchSummary?.unconnected_users || 0} users need group
              connections
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/groups')}
          >
            <View style={styles.actionHeader}>
              <Text style={styles.actionTitle}>Join Requests</Text>
              {notificationCounts.join_requests > 0 && (
                <NotificationBadge
                  count={notificationCounts.join_requests}
                  size="small"
                  color="#8b5cf6"
                />
              )}
            </View>
            <Text style={styles.actionDescription}>
              Review pending group join requests
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Refresh Button */}
      {onRefresh && (
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Text style={styles.refreshButtonText}>Refresh Dashboard</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },

  // Stats Section
  statsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Actions Section
  actionsSection: {
    marginBottom: 24,
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  actionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },

  // Refresh Button
  refreshButton: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
});
