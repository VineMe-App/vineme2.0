import React from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { GroupDetail } from '../../components/groups';
import { useGroup, useGroupMembership } from '../../hooks/useGroups';
import { useAuthStore } from '../../stores/auth';
import { shareGroup } from '../../utils/deepLinking';
import { Header } from '../../components/ui/Header';
import { useTheme } from '../../theme/provider/useTheme';

export default function GroupDetailScreen() {
  const params = useLocalSearchParams<{ id: string; friends?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const headerActionBackground = theme.colors.surface.secondary;
  const headerIconColor = theme.colors.text.primary;
  const { userProfile } = useAuthStore();

  const {
    data: group,
    isLoading: groupLoading,
    error: groupError,
    refetch: refetchGroup,
  } = useGroup(id);

  const { data: membershipData, refetch: refetchMembership } =
    useGroupMembership(id, userProfile?.id);

  // Check if user can manage the group (is a leader or church admin for the service)
  const canManageGroup = React.useMemo(() => {
    if (!group || !userProfile) return false;

    const isLeader =
      membershipData?.membership?.role === 'leader' ||
      membershipData?.membership?.role === 'admin';

    const isChurchAdminForService = Boolean(
      userProfile.roles?.includes('church_admin') &&
        userProfile.service_id &&
        group.service_id &&
        userProfile.service_id === group.service_id
    );

    return Boolean(isLeader || isChurchAdminForService);
  }, [group, userProfile, membershipData]);

  const handleShare = React.useCallback(() => {
    if (group) {
      shareGroup(group.id, group.title);
    }
  }, [group]);

  // Update the header title and add share action to header when available
  React.useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          title={group?.title || 'Group'}
          rightActions={
            <View style={styles.headerActions}>
              {canManageGroup && group && (
                <TouchableOpacity
                  onPress={() => router.push(`/group-management/${group.id}`)}
                  style={[
                    styles.headerActionButton,
                    { backgroundColor: headerActionBackground },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Open group management"
                >
                  <Ionicons
                    name="settings-outline"
                    size={20}
                    color={headerIconColor}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleShare}
                style={[
                  styles.headerActionButton,
                  { backgroundColor: headerActionBackground },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Share group"
              >
                <Ionicons
                  name="share-outline"
                  size={20}
                  color={headerIconColor}
                />
              </TouchableOpacity>
            </View>
          }
        />
      ),
    });
  }, [
    navigation,
    group?.title,
    group?.id,
    canManageGroup,
    router,
    handleShare,
    headerActionBackground,
    headerIconColor,
  ]);

  const handleRefresh = async () => {
    await Promise.all([refetchGroup(), refetchMembership()]);
  };

  const handleMembershipChange = () => {
    // Refetch both group data and membership status
    refetchGroup();
    refetchMembership();
  };

  if (groupLoading && !group) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
      </View>
    );
  }

  if (groupError || !group) {
    Alert.alert('Error', 'Failed to load group details', [
      { text: 'Go Back', onPress: () => router.back() },
      { text: 'Retry', onPress: () => refetchGroup() },
    ]);
    return null;
  }

  const membershipStatus = membershipData?.membership?.role || null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      refreshControl={
        <RefreshControl refreshing={groupLoading} onRefresh={handleRefresh} />
      }
    >
      <GroupDetail
        group={group}
        membershipStatus={membershipStatus}
        onMembershipChange={handleMembershipChange}
        openFriendsOnMount={!!params.friends}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 999,
  },
});
