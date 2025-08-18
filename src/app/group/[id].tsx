import React from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GroupDetail } from '../../components/groups';
import { useGroup, useGroupMembership } from '../../hooks/useGroups';
import { useAuthStore } from '../../stores/auth';
import { shareGroup } from '../../utils/deepLinking';

export default function GroupDetailScreen() {
  const params = useLocalSearchParams<{ id: string; friends?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { userProfile } = useAuthStore();

  const {
    data: group,
    isLoading: groupLoading,
    error: groupError,
    refetch: refetchGroup,
  } = useGroup(id);

  const { data: membershipData, refetch: refetchMembership } =
    useGroupMembership(id, userProfile?.id);

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

  if (groupLoading) {
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
    <View style={styles.container}>
      <GroupDetail
        group={group}
        membershipStatus={membershipStatus}
        onMembershipChange={handleMembershipChange}
        onShare={handleShare}
        openFriendsOnMount={!!params.friends}
      />
    </View>
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
