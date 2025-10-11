import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/Text';
import { router } from 'expo-router';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { SimplePieChart } from '@/components/ui/SimplePieChart';
import { useEnhancedNotifications } from '@/hooks/useNotifications';
import {
  useNewcomersStats,
  useGroupsStats,
  useRequestsStats,
} from '@/hooks/useAdminStats';
import { useAuthStore } from '@/stores/auth';
import { Ionicons } from '@expo/vector-icons';

interface AdminDashboardSummaryProps {
  onRefresh?: () => void;
}

export function AdminDashboardSummary({
  onRefresh,
}: AdminDashboardSummaryProps) {
  const { user } = useAuthStore();

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
  };

  // Fetch stats
  const { data: newcomersStats, isLoading: isLoadingNewcomers } =
    useNewcomersStats();
  const { data: groupsStats, isLoading: isLoadingGroups } = useGroupsStats();
  const { data: requestsStats, isLoading: isLoadingRequests } =
    useRequestsStats();

  const isLoading =
    isLoadingNotifications ||
    isLoadingNewcomers ||
    isLoadingGroups ||
    isLoadingRequests;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="small" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // Prepare chart data
  const newcomersChartData = newcomersStats
    ? [
        {
          label: 'Connected',
          value: newcomersStats.connected,
          color: '#10b981',
        },
        {
          label: 'Not Connected',
          value: newcomersStats.notConnected,
          color: '#ef4444',
        },
      ]
    : [];

  const groupsChartData = groupsStats
    ? [
        {
          label: 'Not at Capacity',
          value: groupsStats.notAtCapacity,
          color: '#10b981',
        },
        {
          label: 'At Capacity',
          value: groupsStats.atCapacity,
          color: '#f97316',
        },
        {
          label: 'Pending Approval',
          value: groupsStats.pending,
          color: '#eab308',
        },
      ].filter((segment) => segment.value > 0)
    : [];

  const requestsChartData = requestsStats
    ? requestsStats.archivedByReason.map((item, index) => {
        // Assign colors to different reasons
        const colors = [
          '#ef4444',
          '#f97316',
          '#eab308',
          '#3b82f6',
          '#8b5cf6',
          '#ec4899',
        ];
        return {
          label: item.reason || 'No reason given',
          value: item.count,
          color: colors[index % colors.length],
        };
      })
    : [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Quick Action Buttons at Top */}
      <View style={styles.buttonsSection}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/admin/manage-groups')}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="grid-outline" size={20} color="#007AFF" />
            <Text style={styles.buttonText}>Group Requests</Text>
          </View>
          {notificationCounts.group_requests > 0 && (
            <NotificationBadge
              count={notificationCounts.group_requests}
              size="small"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/admin/manage-users')}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="people-outline" size={20} color="#007AFF" />
            <Text style={styles.buttonText}>User Management</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/groups')}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="mail-outline" size={20} color="#007AFF" />
            <Text style={styles.buttonText}>Join Requests</Text>
          </View>
          {notificationCounts.join_requests > 0 && (
            <NotificationBadge
              count={notificationCounts.join_requests}
              size="small"
              color="#8b5cf6"
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        {/* Newcomers */}
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Newcomers</Text>
          <SimplePieChart segments={newcomersChartData} />
        </View>

        {/* Groups */}
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Groups</Text>
          <SimplePieChart segments={groupsChartData} />
        </View>

        {/* Requests */}
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Requests</Text>
          
          {/* Outstanding Requests Number */}
          <View style={styles.outstandingContainer}>
            <Text style={styles.outstandingNumber}>
              {requestsStats?.outstandingRequests || 0}
            </Text>
            <Text style={styles.outstandingLabel}>Outstanding Requests</Text>
          </View>

          {/* Archived Requests by Reason */}
          {requestsChartData.length > 0 ? (
            <>
              <Text style={styles.subTitle}>Archived by Reason</Text>
              <SimplePieChart segments={requestsChartData} />
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No archived requests</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
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

  // Buttons Section
  buttonsSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
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
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  buttonContent: {
    alignItems: 'center',
    gap: 6,
  },
  buttonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },

  // Stats Section
  statsSection: {
    gap: 20,
    paddingBottom: 24,
  },
  statCard: {
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
  statTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  outstandingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  outstandingNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  outstandingLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 4,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noDataText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
});
