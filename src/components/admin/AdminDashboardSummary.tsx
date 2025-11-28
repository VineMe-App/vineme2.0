import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { Ionicons } from '@expo/vector-icons';

interface AdminDashboardSummaryProps {
  onRefresh?: () => void;
}

export function AdminDashboardSummary({
  onRefresh,
}: AdminDashboardSummaryProps) {
  const { user, userProfile } = useAuthStore();
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

  // Get enhanced unread notifications and derive counts needed for admin
  const { unreadNotifications = [], isLoading: isLoadingNotifications } =
    useEnhancedNotifications(user?.id);

  const { data: needsHelpCount = 0 } = useQuery({
    queryKey: ['admin', 'needs-help-count', userProfile?.service_id],
    queryFn: async () => {
      if (!userProfile?.service_id) {
        return 0;
      }

      const { count, error } = await supabase
        .from('users')
        .select('id', { head: true, count: 'exact' })
        .eq('service_id', userProfile.service_id)
        .eq('cannot_find_group', true);

      if (error) {
        console.warn('Failed to fetch needs-help count:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!userProfile?.service_id,
    refetchInterval: 60000,
  });

  // Fetch stats with refetch functions
  const {
    data: newcomersStats,
    isLoading: isLoadingNewcomers,
    refetch: refetchNewcomers,
  } = useNewcomersStats();
  const {
    data: groupsStats,
    isLoading: isLoadingGroups,
    refetch: refetchGroups,
  } = useGroupsStats();
  const {
    data: requestsStats,
    isLoading: isLoadingRequests,
    refetch: refetchRequests,
  } = useRequestsStats();

  const notificationCounts = {
    group_requests: groupsStats?.pending || 0,
    join_requests: requestsStats?.outstandingRequests || 0,
    needs_help: needsHelpCount,
  };

  const isLoading =
    isLoadingNotifications ||
    isLoadingNewcomers ||
    isLoadingGroups ||
    isLoadingRequests;

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchNewcomers(),
        refetchGroups(),
        refetchRequests(),
      ]);
      onRefresh?.();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

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
          color: '#ff0083',
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
          color: '#ff0083',
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
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Service & Church Header */}
      {serviceInfo && (
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>
            Stats for {serviceInfo.serviceName}
          </Text>
          <Text style={styles.headerSubtitle}>at {serviceInfo.churchName}</Text>
        </View>
      )}

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
          {notificationCounts.needs_help > 0 && (
            <NotificationBadge
              count={notificationCounts.needs_help}
              size="small"
              color="#f97316"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/admin/join-requests')}
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
          {/* <Text style={styles.statTitle}>Newcomers</Text> */}
          <Text style={styles.statTitle}>Newcomers requesting</Text>
         <SimplePieChart segments={newcomersChartData} />
       </View>

        {/* Groups */}
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Groups</Text>
          <SimplePieChart segments={groupsChartData} />
        </View>

        {/* Requests */}
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Group Join Requests</Text>

          {/* Outstanding Requests Number */}
          <View style={styles.outstandingContainer}>
            <Text style={styles.outstandingNumber}>
              {requestsStats?.outstandingRequests || 0}
            </Text>
            <Text style={styles.outstandingLabel}>
              Outstanding Group Join Requests
            </Text>
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

  // Header Section
  headerSection: {
    marginBottom: 16,
    paddingTop: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },

  // Buttons Section
  buttonsSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
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
    gap: 4,
  },
  buttonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },

  // Stats Section
  statsSection: {
    gap: 16,
    paddingBottom: 24,
  },
  statCard: {
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
    borderColor: '#f3f4f6',
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  outstandingContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  outstandingNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8b5cf6',
    lineHeight: 32,
  },
  outstandingLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 2,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noDataText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
});
