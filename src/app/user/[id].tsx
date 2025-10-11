import React, { useMemo, useState } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useUserProfile, useUserGroupMemberships } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import {
  useFriendshipStatus,
  useSendFriendRequest,
  useRemoveFriend,
  useReceivedFriendRequests,
  useAcceptFriendRequest,
  useAcceptRejectedFriendRequest,
} from '@/hooks/useFriendships';
import { getDisplayName, getFullName } from '@/utils/name';

export default function OtherUserProfileScreen() {
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const params = useLocalSearchParams<{ id?: string }>();
  const targetUserId = useMemo(
    () => (Array.isArray(params.id) ? params.id[0] : params.id),
    [params.id]
  );
  const { user } = useAuth();

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useUserProfile(targetUserId);
  const { data: memberships } = useUserGroupMemberships(targetUserId);

  const friendshipStatusQuery = useFriendshipStatus(targetUserId || '');
  const receivedRequestsQuery = useReceivedFriendRequests();
  const sendFriendRequest = useSendFriendRequest();
  const acceptFriendRequest = useAcceptFriendRequest();
  const removeFriend = useRemoveFriend();
  const acceptRejected = useAcceptRejectedFriendRequest();

  const isSelf = user?.id && targetUserId === user.id;
  const profileFullName = getFullName(profile);
  const profileShortName = getDisplayName(profile, { fallback: 'full' });

  const handleAddFriend = () => {
    if (!targetUserId || !profileFullName) return;
    Alert.alert('Add Friend', `Send a friend request to ${profileShortName || profileFullName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: () =>
          sendFriendRequest.mutate(targetUserId, {
            onSuccess: () => Alert.alert('Success', 'Friend request sent!'),
            onError: (e) => Alert.alert('Error', e.message),
          }),
      },
    ]);
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

  const ActionButton = () => {
    if (isSelf) return null;

    const statusDetails = friendshipStatusQuery.data;
    const status = statusDetails?.status;
    const isIncoming = statusDetails?.direction === 'incoming';
    const received = receivedRequestsQuery.data || [];
    const loading =
      friendshipStatusQuery.isLoading ||
      receivedRequestsQuery.isLoading ||
      sendFriendRequest.isPending ||
      acceptFriendRequest.isPending ||
      removeFriend.isPending ||
      acceptRejected.isPending;

    if (loading) {
      return <Button title="Loading..." variant="secondary" disabled />;
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
      case 'pending': {
        // If there's a pending request where the target user is the sender to me, show Accept
        const incoming = received.find(
          (req: any) => req.user?.id === targetUserId
        );
        if (incoming) {
          return (
            <Button
              title="Accept Friend Request"
              onPress={() =>
                acceptFriendRequest.mutate(incoming.id, {
                  onSuccess: () => friendshipStatusQuery.refetch(),
                  onError: (e) => Alert.alert('Error', e.message),
                })
              }
            />
          );
        }
        return <Button title="Request Pending" variant="secondary" disabled />;
      }
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
        return <Button title="Request Pending" variant="secondary" disabled />;
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

            {memberships && memberships.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Groups</Text>
                {memberships.map((m: any) => (
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
                      .map(word => word.charAt(0))
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
