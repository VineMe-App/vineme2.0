import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
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
        <Text style={styles.title}>Join Requests</Text>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="small" />
          <Text style={styles.loadingText}>Loading join requests...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Join Requests</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Failed to load join requests. Please try again.
          </Text>
        </View>
      </View>
    );
  }

  const pendingRequests =
    joinRequests?.filter((request) => request.status === 'pending') || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Join Requests</Text>
        {pendingRequests.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{pendingRequests.length}</Text>
          </View>
        )}
      </View>

      {pendingRequests.length === 0 ? (
        <EmptyState
          title="No pending requests"
          message="There are currently no pending join requests for this group."
          icon={null}
        />
      ) : (
        <ScrollView
          style={styles.requestsList}
          showsVerticalScrollIndicator={false}
        >
          {pendingRequests.map((request) => (
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
    backgroundColor: '#ff3b30',
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
  },
});
