import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useAuthStore } from '@/stores/auth';
import {
  useUserProfile,
  useUserGroupMemberships,
  useUserFriendships,
  useDeleteAccount,
} from '@/hooks/useUsers';
import { useFriends, useReceivedFriendRequests } from '@/hooks/useFriendships';
import { router } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { AdminOnly, PermissionGate } from '@/components/ui/RoleBasedRender';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { FriendRequestNotifications } from '@/components/friends/FriendRequestNotifications';
import { FriendManagementModal } from '@/components/friends/FriendManagementModal';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const deleteAccountMutation = useDeleteAccount();

  const {
    data: userProfile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useUserProfile(user?.id);

  const {
    data: groupMemberships,
    isLoading: groupsLoading,
    refetch: refetchGroups,
  } = useUserGroupMemberships(user?.id);

  const { isLoading: friendsLoading, refetch: refetchFriends } =
    useUserFriendships(user?.id);

  // Use the new friendship hooks for better data management
  const friendsQuery = useFriends(user?.id);
  const receivedRequestsQuery = useReceivedFriendRequests(user?.id);

  const isLoading = profileLoading || groupsLoading || friendsLoading;

  const handleRefresh = async () => {
    await Promise.all([
      refetchProfile(),
      refetchGroups(),
      refetchFriends(),
      friendsQuery.refetch(),
      receivedRequestsQuery.refetch(),
    ]);
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    if (!user?.id) return;
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account data. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccountMutation.mutateAsync(user.id);
              await signOut();
              router.replace('/(auth)/sign-in');
            } catch (e) {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (profileError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load profile</Text>
          <Button title="Retry" onPress={handleRefresh} />
        </View>
      </View>
    );
  }

  if (!userProfile && !isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Profile not found</Text>
          <Button title="Refresh" onPress={handleRefresh} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        {userProfile && (
          <>
            <View style={styles.profileSection}>
              <Avatar
                size={100}
                imageUrl={userProfile.avatar_url}
                name={userProfile.name}
              />

              <Text style={styles.name}>{userProfile.name}</Text>
              <Text style={styles.email}>{userProfile.email}</Text>

              <Button
                title="Edit Profile"
                onPress={() => setShowEditModal(true)}
                variant="secondary"
                size="small"
                style={styles.editButton}
              />
            </View>

            {/* Friend Request Notifications */}
            <FriendRequestNotifications
              userId={user?.id}
              onPress={() => setShowFriendsModal(true)}
            />

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Profile Information</Text>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{userProfile.email}</Text>
              </View>

              {userProfile.church && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Church</Text>
                  <Text style={styles.infoValue}>
                    {userProfile.church.name}
                  </Text>
                </View>
              )}

              {userProfile.service && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Service</Text>
                  <Text style={styles.infoValue}>
                    {userProfile.service.name}
                  </Text>
                </View>
              )}

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>
                  {userProfile.roles?.join(', ') || 'Member'}
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>
                  {new Date(userProfile.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {groupMemberships && groupMemberships.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>My Groups</Text>
                {groupMemberships.map((membership: any) => (
                  <View key={membership.id} style={styles.membershipItem}>
                    <View style={styles.membershipInfo}>
                      <Text style={styles.membershipTitle}>
                        {membership.group?.title || 'Unknown Group'}
                      </Text>
                      <Text style={styles.membershipRole}>
                        {membership.role.charAt(0).toUpperCase() +
                          membership.role.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.membershipDate}>
                      Joined{' '}
                      {new Date(membership.joined_at).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Friends Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Friends ({friendsQuery.data?.length || 0})
                </Text>
                <TouchableOpacity
                  style={styles.manageFriendsButton}
                  onPress={() => setShowFriendsModal(true)}
                >
                  <Text style={styles.manageFriendsText}>Manage</Text>
                </TouchableOpacity>
              </View>

              {friendsQuery.data && friendsQuery.data.length > 0 ? (
                <>
                  {friendsQuery.data.slice(0, 5).map((friendship: any) => (
                    <View key={friendship.id} style={styles.friendItem}>
                      <Avatar
                        size={40}
                        imageUrl={friendship.friend?.avatar_url}
                        name={friendship.friend?.name}
                      />
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName}>
                          {friendship.friend?.name || 'Unknown User'}
                        </Text>
                        <Text style={styles.friendEmail}>
                          {friendship.friend?.email}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {friendsQuery.data.length > 5 && (
                    <TouchableOpacity onPress={() => setShowFriendsModal(true)}>
                      <Text style={styles.moreText}>
                        and {friendsQuery.data.length - 5} more friends
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.emptyFriendsContainer}>
                  <Text style={styles.emptyFriendsText}>No friends yet</Text>
                  <Text style={styles.emptyFriendsSubtext}>
                    Start connecting with other church members
                  </Text>
                  <Button
                    title="Find Friends"
                    onPress={() => setShowFriendsModal(true)}
                    variant="secondary"
                    size="small"
                    style={styles.findFriendsButton}
                  />
                </View>
              )}
            </View>
          </>
        )}

        {/* Admin Features */}
        <AdminOnly>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Tools</Text>
            <View style={styles.adminActions}>
              <PermissionGate permission="manage_church_events">
                <Button
                  title="Manage Events"
                  onPress={() => {
                    Alert.alert('Admin Feature', 'Event management coming soon!');
                  }}
                  variant="secondary"
                  size="small"
                  style={styles.adminButton}
                />
              </PermissionGate>
              
              <PermissionGate permission="manage_church_groups">
                <Button
                  title="Manage Groups"
                  onPress={() => {
                    Alert.alert('Admin Feature', 'Group management coming soon!');
                  }}
                  variant="secondary"
                  size="small"
                  style={styles.adminButton}
                />
              </PermissionGate>
              
              <PermissionGate permission="manage_church_users">
                <Button
                  title="Manage Users"
                  onPress={() => {
                    Alert.alert('Admin Feature', 'User management coming soon!');
                  }}
                  variant="secondary"
                  size="small"
                  style={styles.adminButton}
                />
              </PermissionGate>
            </View>
          </View>
        </AdminOnly>

        <View style={styles.actionsSection}>
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="danger"
            style={styles.signOutButton}
          />
          <Button
            title="Delete Account"
            onPress={handleDeleteAccount}
            variant="danger"
            style={styles.signOutButton}
          />
        </View>
      </ScrollView>

      {userProfile && (
        <EditProfileModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          user={userProfile}
        />
      )}

      <FriendManagementModal
        visible={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        userId={user?.id}
      />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 16,
  },
  editButton: {
    marginTop: 8,
  },
  infoSection: {
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  manageFriendsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#8b5cf6',
    borderRadius: 6,
  },
  manageFriendsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
  },
  membershipItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  membershipInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  membershipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  membershipRole: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  membershipDate: {
    fontSize: 14,
    color: '#6c757d',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendInfo: {
    marginLeft: 12,
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  friendEmail: {
    fontSize: 14,
    color: '#6c757d',
  },
  moreText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionsSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  signOutButton: {
    marginTop: 16,
  },
  emptyFriendsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  emptyFriendsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 4,
  },
  emptyFriendsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 16,
  },
  findFriendsButton: {
    marginTop: 8,
  },
  adminActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  adminButton: {
    flex: 1,
    minWidth: 120,
  },
});
