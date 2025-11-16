import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useUserProfile, useUserGroupMemberships } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import {
  useFriendshipStatus,
  useSendFriendRequest,
  useRemoveFriend,
  useAcceptFriendRequest,
  useAcceptRejectedFriendRequest,
} from '@/hooks/useFriendships';
import { getDisplayName, getFullName } from '@/utils/name';
import { Ionicons } from '@expo/vector-icons';

export default function OtherUserProfileScreen() {
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string }>();
  const targetUserId = useMemo(
    () => (Array.isArray(params.id) ? params.id[0] : params.id),
    [params.id]
  );
  const { user, userProfile: currentUserProfile } = useAuth();

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useUserProfile(targetUserId);
  const { data: memberships } = useUserGroupMemberships(targetUserId);

  const friendshipStatusQuery = useFriendshipStatus(targetUserId || '');
  const sendFriendRequest = useSendFriendRequest();
  const acceptFriendRequest = useAcceptFriendRequest();
  const removeFriend = useRemoveFriend();
  const acceptRejected = useAcceptRejectedFriendRequest();

  const isSelf = user?.id && targetUserId === user.id;

  // Filter memberships based on visibility rules
  const visibleMemberships = useMemo(() => {
    if (!memberships || memberships.length === 0) return [];

    // If viewing own profile, show all groups
    if (isSelf) return memberships;

    // Check if viewer is admin or clergy (church_admin or superadmin)
    const isViewerAdmin =
      currentUserProfile?.roles?.includes('church_admin') ||
      currentUserProfile?.roles?.includes('superadmin');

    // Check if viewer is friends with profile owner
    const isFriend =
      friendshipStatusQuery.data?.status === 'accepted';

    // If viewer is admin/clergy or friend, show all groups
    if (isViewerAdmin || isFriend) {
      return memberships;
    }

    // Otherwise, only show groups where the profile owner is a leader
    return memberships.filter(
      (m: any) => m.role === 'leader' || m.role === 'admin'
    );
  }, [
    memberships,
    isSelf,
    currentUserProfile?.roles,
    friendshipStatusQuery.data?.status,
  ]);
  const profileFullName = getFullName(profile);
  const profileShortName = getDisplayName(profile, { fallback: 'full' });

  const handleAddFriend = () => {
    if (!targetUserId || !profileFullName) return;
    Alert.alert(
      'Add Friend',
      `Send a friend request to ${profileShortName || profileFullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () =>
            sendFriendRequest.mutate(targetUserId, {
              onSuccess: () => Alert.alert('Success', 'Friend request sent!'),
              onError: (e) => Alert.alert('Error', e.message),
            }),
        },
      ]
    );
  };

  const handleRemoveFriend = () => {
    if (!targetUserId) return;
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            removeFriend.mutate(targetUserId, {
              onSuccess: () => Alert.alert('Removed', 'Friend removed'),
              onError: (e) => Alert.alert('Error', e.message),
            }),
        },
      ]
    );
  };

  const handleAvatarPress = () => {
    setImageModalVisible(true);
  };

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.push('/(tabs)');
    }
  }, [navigation, router]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: '',
      headerBackVisible: false,
      headerStyle: {
        backgroundColor: '#fff',
      },
      headerLeft: () => (
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={handleBackPress}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
          <Text style={styles.headerBackText}>Back</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleBackPress]);

  const ActionButton = () => {
    if (isSelf) return null;

    const statusDetails = friendshipStatusQuery.data;
    const status = statusDetails?.status;
    const isIncoming = statusDetails?.direction === 'incoming';
    const loading =
      friendshipStatusQuery.isLoading ||
      sendFriendRequest.isPending ||
      acceptFriendRequest.isPending ||
      removeFriend.isPending ||
      acceptRejected.isPending;
    const pendingFriendshipId = friendshipStatusQuery.data?.friendshipId;
    if (loading) {
      return <Button title="Loading..." variant="secondary" disabled onPress={() => {}} />;
    }

    switch (status) {
      case 'accepted':
        return (
          <Button
            title="Remove Friend"
            variant="secondary"
            size="small"
            onPress={handleRemoveFriend}
            style={styles.actionButton}
          />
        );
      case 'pending':
        if (isIncoming && pendingFriendshipId) {
          return (
            <Button
              title="Accept Friend Request"
              onPress={() =>
                acceptFriendRequest.mutate(pendingFriendshipId, {
                  onSuccess: () => friendshipStatusQuery.refetch(),
                  onError: (e) => Alert.alert('Error', e.message),
                })
              }
            />
          );
        }
        return <Button title="Request Pending" variant="secondary" disabled onPress={() => {}} />;
      case 'rejected':
        if (isIncoming) {
          return (
            <Button
              title="Add Friend"
              onPress={() =>
                targetUserId &&
                acceptRejected.mutate(targetUserId, {
                  onSuccess: () => friendshipStatusQuery.refetch(),
                  onError: (e) => Alert.alert('Error', e.message),
                })
              }
            />
          );
        }
        return <Button title="Request Pending" variant="secondary" disabled onPress={() => {}} />;
      default:
        return (
          <Button
            title="Add Friend"
            variant="secondary"
            size="small"
            onPress={handleAddFriend}
            style={styles.actionButton}
          />
        );
    }
  };

  if (!targetUserId) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>No user specified.</Text>
        </View>
      </View>
    );
  }

  if (profileError) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load profile</Text>
          <Button title="Retry" onPress={() => refetchProfile()} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {profile && (
          <>
            <View style={styles.headerSection}>
              <Avatar
                size={100}
                imageUrl={profile.avatar_url}
                name={profileFullName}
                onPress={handleAvatarPress}
              />
              <Text style={styles.name}>
                {profileFullName || profileShortName || 'User'}
              </Text>
              {profile.email ? (
                <Text style={styles.email}>{profile.email}</Text>
              ) : null}
              <ActionButton />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bio</Text>
              <Text style={styles.bioText}>
                {(profile as any).bio || 'This user has not added a bio yet.'}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile Information</Text>
              {profile.church?.name ? (
                <InfoRow label="Church" value={profile.church.name} />
              ) : null}
              {profile.service?.name ? (
                <InfoRow label="Service" value={profile.service.name} />
              ) : null}
              <InfoRow
                label="Member Since"
                value={new Date(profile.created_at).toLocaleDateString()}
              />
            </View>

            {visibleMemberships && visibleMemberships.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Groups</Text>
                {visibleMemberships.map((m: any) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.groupItem}
                    onPress={() =>
                      m.group?.id && router.push(`/group/${m.group.id}`)
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupTitle}>
                        {m.group?.title || 'Unknown Group'}
                      </Text>
                      <Text style={styles.groupRole}>{m.role}</Text>
                    </View>
                    <Text style={styles.groupDate}>
                      Joined {new Date(m.joined_at).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {!profile && profileLoading && (
          <View style={styles.centered}>
            <Text>Loading profile...</Text>
          </View>
        )}
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setImageModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {profile?.avatar_url ? (
              <TouchableOpacity
                style={styles.modalImageContainer}
                onPress={() => setImageModalVisible(false)}
                activeOpacity={1}
              >
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.modalInitialsContainer}
                onPress={() => setImageModalVisible(false)}
                activeOpacity={1}
              >
                <View style={styles.modalInitialsBackground}>
                  <Text style={styles.modalInitialsText}>
                    {profile?.name
                      ?.split(' ')
                      .map((word) => word.charAt(0))
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || '?'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerBackText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#dc2626',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    color: '#6b7280',
    fontSize: 16,
  },
  infoValue: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '500',
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  groupRole: {
    fontSize: 14,
    color: '#6b7280',
  },
  groupDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  modalInitialsContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInitialsBackground: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInitialsText: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#6b7280',
  },
});
