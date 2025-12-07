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
import { AuthLoadingAnimation } from '../../components/auth/AuthLoadingAnimation';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GroupDetail } from '../../components/groups';
import { useGroup, useGroupMembership } from '../../hooks/useGroups';
import { useAuthStore } from '../../stores/auth';
import { useUserJoinRequests } from '../../hooks/useJoinRequests';
import { shareGroup } from '../../utils/deepLinking';
import { safeGoBack } from '@/utils/navigation';

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

  const { refetch: refetchUserJoinRequests } = useUserJoinRequests(userProfile?.id);

  // Check if user can manage the group (is a leader)
  const canManageGroup = React.useMemo(() => {
    if (!group || !userProfile) return false;

    const isLeader =
      membershipData?.membership?.role === 'leader' ||
      membershipData?.membership?.role === 'admin';

    return Boolean(isLeader);
  }, [group, userProfile, membershipData]);

  // Update the header title and add share action to header when available
  React.useEffect(() => {
    if (group?.title) {
      navigation.setOptions({
        header: () => (
          <View
            style={{
              height: 60 + insets.top,
              backgroundColor: '#FFFFFF',
              paddingTop: insets.top,
            }}
          >
            {/* Header row: back arrow, title, share icon */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingTop: 4,
                paddingBottom: 4,
                height: 60,
                position: 'relative',
              }}
            >
              <TouchableOpacity
                onPress={() => safeGoBack(router)}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={{
                  width: 20,
                  height: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10, // Ensure it's above other elements
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-back" size={20} color="#2C2235" />
              </TouchableOpacity>
              
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 22,
                  fontWeight: '700',
                  fontFamily: 'Figtree-Bold',
                  color: '#2C2235',
                  letterSpacing: -0.44,
                  flex: 1,
                  marginLeft: 12, // 16px (arrow left) + 20px (arrow width) + 12px gap = 48px from left (matches Figma)
                  marginRight: 8,
                  lineHeight: 22,
                  zIndex: 1, // Lower z-index than button
                }}
              >
                {group.title}
              </Text>

              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                {canManageGroup && (
                  <TouchableOpacity
                    onPress={() => router.push(`/group-management/${group.id}`)}
                    style={{ paddingVertical: 6, paddingHorizontal: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Open group management"
                  >
                    <Ionicons
                      name="settings-outline"
                      size={20}
                      color="#374151"
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleShare}
                  style={{ 
                    paddingVertical: 6, 
                    paddingHorizontal: 8,
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: '#F9FAFC',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="share-outline" size={16} color="#FF0083" />
                </TouchableOpacity>
              </View>
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
    refetchUserJoinRequests();
  };

  const handleShare = () => {
    if (group) {
      shareGroup(group.id, group.title);
    }
  };

  if (groupLoading && !group) {
    return (
      <View style={styles.loadingContainer}>
        <AuthLoadingAnimation />
      </View>
    );
  }

  if (groupError || !group) {
    Alert.alert('Error', 'Failed to load group details', [
      { text: 'Go Back', onPress: () => safeGoBack(router) },
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
