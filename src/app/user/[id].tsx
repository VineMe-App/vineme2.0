import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
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
} from '@/hooks/useFriendships';

export default function OtherUserProfileScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const targetUserId = useMemo(() => (Array.isArray(params.id) ? params.id[0] : params.id), [params.id]);
  const { user } = useAuth();

  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } =
    useUserProfile(targetUserId);
  const { data: memberships } = useUserGroupMemberships(targetUserId);

  const friendshipStatusQuery = useFriendshipStatus(targetUserId || '');
  const receivedRequestsQuery = useReceivedFriendRequests();
  const sendFriendRequest = useSendFriendRequest();
  const acceptFriendRequest = useAcceptFriendRequest();
  const removeFriend = useRemoveFriend();

  const isSelf = user?.id && targetUserId === user.id;

  const handleAddFriend = () => {
    if (!targetUserId || !profile?.name) return;
    Alert.alert('Add Friend', `Send a friend request to ${profile.name}?`, [
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
    Alert.alert('Remove Friend', 'Are you sure you want to remove this friend?', [
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
    ]);
  };

  const ActionButton = () => {
    if (isSelf) return null;

    const status = friendshipStatusQuery.data;
    const received = receivedRequestsQuery.data || [];
    const loading =
      friendshipStatusQuery.isLoading ||
      receivedRequestsQuery.isLoading ||
      sendFriendRequest.isPending ||
      acceptFriendRequest.isPending ||
      removeFriend.isPending;

    if (loading) {
      return <Button title="Loading..." variant="secondary" disabled />;
    }

    switch (status) {
      case 'accepted':
        return (
          <View style={styles.actionsRow}>
            <Button title="Friends" variant="secondary" disabled />
            <Button title="Remove Friend" variant="danger" onPress={handleRemoveFriend} />
          </View>
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
      case 'blocked':
        return <Button title="Blocked" variant="secondary" disabled />;
      case 'rejected':
        return <Button title="Request Rejected" variant="secondary" disabled />;
      default:
        return <Button title="Add Friend" onPress={handleAddFriend} />;
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
              <Avatar size={100} imageUrl={profile.avatar_url} name={profile.name} />
              <Text style={styles.name}>{profile.name}</Text>
              {profile.email ? <Text style={styles.email}>{profile.email}</Text> : null}
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
              <InfoRow label="Member Since" value={new Date(profile.created_at).toLocaleDateString()} />
            </View>

            {memberships && memberships.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Groups</Text>
                {memberships.map((m: any) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.groupItem}
                    onPress={() => m.group?.id && router.push(`/group/${m.group.id}`)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupTitle}>{m.group?.title || 'Unknown Group'}</Text>
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
          <View style={styles.centered}><Text>Loading profile...</Text></View>
        )}
      </ScrollView>
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
});

