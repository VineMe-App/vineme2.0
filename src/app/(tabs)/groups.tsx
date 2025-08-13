import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  GroupCard, 
  CreateGroupModal, 
  GroupsMapView, 
  ViewToggle,
  FilterPanel,
  FilterButton,
  SearchBar,
  type ViewMode 
} from '../../components/groups';
import { useGroupsByChurch, useGroupMembership } from '../../hooks/useGroups';
import { useAuthStore, useGroupFiltersStore } from '../../stores';
import { useErrorHandler, useLoadingState } from '../../hooks';
import { ErrorMessage, EmptyState, Button } from '../../components/ui';
import { applyGroupFilters, getActiveFiltersDescription } from '../../utils/groupFilters';
import type { GroupWithDetails } from '../../types/database';

export default function GroupsScreen() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const { filters } = useGroupFiltersStore();
  const { handleError } = useErrorHandler();
  const { isLoading: isLoadingFn, withLoading } = useLoadingState();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('list');

  const {
    data: allGroups,
    isLoading,
    error,
    refetch,
  } = useGroupsByChurch(userProfile?.church_id);

  // Apply filters to groups
  const filteredGroups = useMemo(() => {
    if (!allGroups) return [];
    return applyGroupFilters(allGroups, filters);
  }, [allGroups, filters]);

  const handleRefresh = async () => {
    await withLoading('refresh', async () => {
      try {
        await refetch();
      } catch (error) {
        handleError(error as Error, {
          context: {
            action: 'refresh_groups',
            churchId: userProfile?.church_id,
          },
          showAlert: false, // Don't show alert for refresh errors, just show in UI
        });
        throw error; // Re-throw so the error state is maintained
      }
    });
  };

  const handleGroupPress = (group: GroupWithDetails) => {
    router.push(`/group/${group.id}`);
  };

  const handleCreateGroup = () => {
    setShowCreateModal(true);
  };

  const handleCreateSuccess = () => {
    refetch(); // Refresh the groups list
  };

  const renderGroupItem = ({ item: group }: { item: GroupWithDetails }) => {
    return (
      <GroupItemWithMembership
        group={group}
        onPress={() => handleGroupPress(group)}
      />
    );
  };

  const renderEmptyState = () => {
    const hasFilters = filters.meetingDays.length > 0 || 
                      filters.categories.length > 0 || 
                      filters.searchQuery.length > 0;
    
    return (
      <EmptyState
        icon={<Text style={{ fontSize: 48 }}>📖</Text>}
        title={hasFilters ? "No Groups Match Your Filters" : "No Groups Found"}
        message={
          hasFilters
            ? `No groups found matching: ${getActiveFiltersDescription(filters)}`
            : userProfile?.church_id
            ? 'There are no Bible study groups available in your church yet.'
            : 'Please complete your profile to see groups from your church.'
        }
      />
    );
  };

  const renderListView = () => (
    <FlatList
      data={filteredGroups}
      renderItem={renderGroupItem}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={renderEmptyState}
      refreshControl={
        <RefreshControl
          refreshing={isLoadingFn('refresh')}
          onRefresh={handleRefresh}
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
    />
  );

  const renderMapView = () => (
    <GroupsMapView
      groups={filteredGroups}
      onGroupPress={handleGroupPress}
      isLoading={isLoading}
    />
  );

  const renderErrorState = () => (
    <ErrorMessage
      error={error!}
      onRetry={handleRefresh}
      style={styles.errorContainer}
    />
  );

  if (isLoading && !allGroups) {
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

  if (error && !allGroups) {
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
      <View style={styles.header}>
        <Text style={styles.title}>Bible Study Groups</Text>
        <Text style={styles.subtitle}>
          Discover and join Bible study groups in your church community
        </Text>
        {userProfile?.church_id && (
          <Button
            title="Create New Group"
            onPress={handleCreateGroup}
            variant="primary"
            style={styles.createButton}
          />
        )}
      </View>

      <SearchBar placeholder="Search groups..." />

      <View style={styles.controlsContainer}>
        <ViewToggle
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        <FilterButton onPress={() => setShowFilterPanel(true)} />
      </View>

      <View style={styles.contentContainer}>
        {currentView === 'list' ? renderListView() : renderMapView()}
      </View>

      <FilterPanel
        isVisible={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
      />

      <CreateGroupModal
        isVisible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
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
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  contentContainer: {
    flex: 1,
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
  createButton: {
    marginTop: 16,
  },
});
