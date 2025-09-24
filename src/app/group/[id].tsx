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
            {/* Top row: small back + text on left, share on right */}
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
              <TouchableOpacity onPress={handleShare} style={{ paddingVertical: 6, paddingHorizontal: 8 }}>
                <Ionicons name="share-outline" size={20} color="#374151" />
              </TouchableOpacity>
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
  }, [group?.title, navigation, insets.top]);

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
