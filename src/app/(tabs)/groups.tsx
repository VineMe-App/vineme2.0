import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GroupCard } from '../../components/groups';
import { useGroupsByChurch, useGroupMembership } from '../../hooks/useGroups';
import { useAuthStore } from '../../stores/auth';
import type { GroupWithDetails } from '../../types/database';

export default function GroupsScreen() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: groups,
    isLoading,
    error,
    refetch,
  } = useGroupsByChurch(userProfile?.church_id);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Failed to refresh groups:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleGroupPress = (group: GroupWithDetails) => {
    router.push(`/group/${group.id}`);
  };

  const renderGroupItem = ({ item: group }: { item: GroupWithDetails }) => {
    return (
      <GroupItemWithMembership
        group={group}
        onPress={() => handleGroupPress(group)}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Groups Found</Text>
      <Text style={styles.emptyStateText}>
        {userProfile?.church_id
          ? 'There are no Bible study groups available in your church yet.'
          : 'Please complete your profile to see groups from your church.'}
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>Unable to Load Groups</Text>
      <Text style={styles.errorText}>
        {error instanceof Error ? error.message : 'Something went wrong'}
      </Text>
    </View>
  );

  if (isLoading && !groups) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Bible Study Groups</Text>
          <Text style={styles.subtitle}>
            Discover and join Bible study groups in your church community
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      </View>
    );
  }

  if (error && !groups) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Bible Study Groups</Text>
          <Text style={styles.subtitle}>
            Discover and join Bible study groups in your church community
          </Text>
        </View>
        {renderErrorState()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={groups || []}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Bible Study Groups</Text>
            <Text style={styles.subtitle}>
              Discover and join Bible study groups in your church community
            </Text>
          </View>
        }
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

// Component to handle membership status for each group
const GroupItemWithMembership: React.FC<{
  group: GroupWithDetails;
  onPress: () => void;
}> = ({ group, onPress }) => {
  const { userProfile } = useAuthStore();
  const { data: membershipData } = useGroupMembership(
    group.id,
    userProfile?.id
  );

  const membershipStatus = membershipData?.membership?.role || null;

  return (
    <GroupCard
      group={group}
      onPress={onPress}
      membershipStatus={membershipStatus}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 64,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
