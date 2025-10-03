import React from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Text,
} from 'react-native';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GroupDetail } from '../../components/groups';
import { useGroup, useGroupMembership } from '../../hooks/useGroups';
import { useAuthStore } from '../../stores/auth';
import { shareGroup } from '../../utils/deepLinking';

export default function GroupDetailScreen() {
  const params = useLocalSearchParams<{ id: string; friends?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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

    const isLeader = membershipData?.membership?.role === 'leader' || membershipData?.membership?.role === 'admin';

    const isChurchAdminForService = Boolean(
      userProfile.roles?.includes('church_admin') &&
        userProfile.service_id &&
        group.service_id &&
        userProfile.service_id === group.service_id
    );

    return Boolean(isLeader || isChurchAdminForService);
  }, [group, userProfile, membershipData]);

  // Update the header title and add share action to header when available
  React.useEffect(() => {
    if (group?.title) {
      navigation.setOptions({
        header: () => (
          <View
            style={{
              height: 125,
              backgroundColor: 'white',
              paddingTop: insets.top,
            }}
          >
            {/* Top row: small back + text on left, cog/share on right */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingTop: 4,
              }}
            >
              <TouchableOpacity
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={18} color="#000" />
                <Text style={{ fontSize: 14, marginLeft: 2, color: '#000' }}>Back</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {canManageGroup && (
                  <TouchableOpacity
                    onPress={() => router.push(`/group-management/${group.id}`)}
                    style={{ paddingVertical: 6, paddingHorizontal: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Open group management"
                  >
                    <Ionicons name="settings-outline" size={20} color="#374151" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleShare} style={{ paddingVertical: 6, paddingHorizontal: 8 }}>
                  <Ionicons name="share-outline" size={20} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Centered title area (description removed per request) */}
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 24,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 22,
                  fontWeight: '700',
                  fontFamily: 'Manrope-Bold',
                  textAlign: 'center',
                  marginTop: -15,
                }}
              >
                {group.title}
              </Text>
            </View>
          </View>
        ),
      });
    }
  }, [group?.title, group?.id, canManageGroup, navigation, insets.top, router]);

  const handleRefresh = async () => {
    await Promise.all([refetchGroup(), refetchMembership()]);
  };

  const handleMembershipChange = () => {
    // Refetch both group data and membership status
    refetchGroup();
    refetchMembership();
  };

  const handleShare = () => {
    if (group) {
      shareGroup(group.id, group.title);
    }
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
      style={styles.container}
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
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
