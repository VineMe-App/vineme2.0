import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from '../ui/Text';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { JoinRequestCard } from './JoinRequestCard';
import { EmptyState } from '../ui/EmptyState';
import { useGroupJoinRequests } from '../../hooks/useJoinRequests';
import type { GroupWithDetails } from '../../types/database';

interface JoinRequestsPanelProps {
  group: GroupWithDetails;
  leaderId: string;
  onRequestProcessed?: () => void;
}

export const JoinRequestsPanel: React.FC<JoinRequestsPanelProps> = ({
  group,
  leaderId,
  onRequestProcessed,
}) => {
  const {
    data: joinRequests,
    isLoading,
    error,
    refetch,
  } = useGroupJoinRequests(group.id, leaderId);

  const handleRequestProcessed = () => {
    onRequestProcessed?.();
    refetch();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Newcomers</Text>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="small" />
          <Text style={styles.loadingText}>Loading newcomers...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Newcomers</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Failed to load newcomers. Please try again.
          </Text>
        </View>
      </View>
    );
  }

  const pendingRequests =
    joinRequests?.filter((request) => request.status === 'pending') || [];

  const sortedNewcomers = [...pendingRequests].sort((a, b) => {
    const statusA = a.journey_status ?? 0;
    const statusB = b.journey_status ?? 0;
    if (statusA !== statusB) return statusA - statusB;
    const dateA = a.joined_at ? new Date(a.joined_at).getTime() : 0;
    const dateB = b.joined_at ? new Date(b.joined_at).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Newcomers</Text>
        {sortedNewcomers.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{sortedNewcomers.length}</Text>
          </View>
        )}
      </View>

      <Text style={styles.subtitle}>
        Track referrals and join requests that still need follow up before you
        add them to the group.
      </Text>

      {sortedNewcomers.length === 0 ? (
        <EmptyState
          title="No newcomers"
          message="Great job! Everyone has been followed up with."
          icon={null}
        />
      ) : (
        <ScrollView
          style={styles.requestsList}
          showsVerticalScrollIndicator={false}
        >
          {sortedNewcomers.map((request) => (
            <JoinRequestCard
              key={request.id}
              request={request}
              leaderId={leaderId}
              onRequestProcessed={handleRequestProcessed}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  countBadge: {
    marginLeft: 8,
    backgroundColor: '#ec4899',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 32,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
  },
  requestsList: {
    flex: 1,
    paddingBottom: 16,
  },
});
