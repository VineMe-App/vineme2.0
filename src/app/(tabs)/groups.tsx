import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GroupCard } from '../../components/groups';
import { useGroupsByChurch, useGroupMembership } from '../../hooks/useGroups';
import { useAuthStore } from '../../stores/auth';
import { useErrorHandler, useLoadingState } from '../../hooks';
import { ErrorMessage, EmptyState } from '../../components/ui';
import type { GroupWithDetails } from '../../types/database';

export default function GroupsScreen() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const { handleError } = useErrorHandler();
  const { isLoading: isRefreshing, withLoading } = useLoadingState();

  const {
    data: groups,
    isLoading,
    error,
    refetch,
  } = useGroupsByChurch(userProfile?.church_id);

  const handleRefresh = async () => {
    await withLoading('refresh', async () => {
      try {
        await refetch();
      } catch (error) {
        handleError(error as Error, {
          context: { action: 'refresh_groups', churchId: userProfile?.church_id },
          showAlert: false, // Don't show alert for refresh errors, just show in UI
        });
        throw error; // Re-throw so the error state is maintained
      }
    });
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
    <EmptyState
      icon="📖"
      title="No Groups Found"
      message={
        userProfile?.church_id
          ? 'There are no Bible study groups available in your church yet.'
          : 'Please complete your profile to see groups from your church.'
      }
      actionTitle={!userProfile?.church_id ? 'Complete Profile' : undefined}
      onAction={!userProfile?.church_id ? () => router.push('/(tabs)/profile') : undefined}
    />
  );

  const renderErrorState = () => (
    <ErrorMessage
      error={error!}
      onRetry={handleRefresh}
      style={styles.errorContainer}
    />
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
          <RefreshControl 
            refreshing={isRefreshing || isLoading} 
            onRefresh={handleRefresh} 
          />
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
  errorContainer: {
    margin: 16,
  },
});
