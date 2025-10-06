import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import { Text } from '../../components/ui/Text';
import { useAuthStore } from '@/stores/auth';
import {
  useUserProfile,
  useUserGroupMemberships,
  useDeleteAccount,
} from '@/hooks/useUsers';
import { useFriends, useReceivedFriendRequests } from '@/hooks/useFriendships';
import { router } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ChurchAdminOnly } from '@/components/ui/RoleBasedRender';
import { FriendRequestNotifications } from '@/components/friends/FriendRequestNotifications';
import { FriendManagementModal } from '@/components/friends/FriendManagementModal';
import { useTheme } from '@/theme/provider/useTheme';
import { getDisplayName, getFullName } from '@/utils/name';
// Admin dashboard summary moved to /admin route

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const { theme } = useTheme();
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  
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

  // Use the new friendship hooks for better data management
  const friendsQuery = useFriends(user?.id);
  const receivedRequestsQuery = useReceivedFriendRequests(user?.id);

  const isLoading =
    profileLoading ||
    groupsLoading ||
    friendsQuery.isLoading ||
    receivedRequestsQuery.isLoading;

  const profileFullName = getFullName(userProfile);
  const profileShortName = getDisplayName(userProfile, { fallback: 'full' });

  const handleRefresh = async () => {
    await Promise.all([
      refetchProfile(),
      refetchGroups(),
      friendsQuery.refetch(),
      receivedRequestsQuery.refetch(),
    ]);
  };

  const handleAvatarPress = () => {
    setImageModalVisible(true);
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace({ pathname: '/(auth)/sign-in' as any });
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
              router.replace({ pathname: '/(auth)/sign-in' as any });
            } catch (e) {
              Alert.alert(
                'Error',
                'Failed to delete account. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  if (profileError) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        <View style={styles.errorContainer}>
          <Text variant="body" color="error" style={styles.errorText}>Failed to load profile</Text>
          <Button title="Retry" onPress={handleRefresh} />
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile && !isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        <View style={styles.errorContainer}>
          <Text variant="body" color="error" style={styles.errorText}>Profile not found</Text>
          <Button title="Refresh" onPress={handleRefresh} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
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
                name={profileFullName}
                onPress={handleAvatarPress}
              />

              <Text variant="h3" style={styles.name}>{profileFullName || profileShortName || 'Your Profile'}</Text>
              {user?.email ? (
                <Text variant="body" color="secondary" style={styles.email}>{user.email}</Text>
              ) : null}

              <View style={{ height: 12 }} />
            </View>

            {/* Friend Request Notifications */}
            <FriendRequestNotifications
              requests={(receivedRequestsQuery.data as any[]) || []}
              onPress={() => setShowFriendsModal(true)}
            />

            <View style={styles.infoSection}>
              <Text variant="h4" style={styles.sectionTitle}>Profile Information</Text>

              {user?.email ? (
                <View style={styles.infoItem}>
                  <Text variant="label" style={styles.infoLabel}>Email</Text>
                  <Text variant="body" style={styles.infoValue}>{user.email}</Text>
                </View>
              ) : null}

              {userProfile.church && (
                <View style={styles.infoItem}>
                  <Text variant="label" style={styles.infoLabel}>Church</Text>
                  <Text variant="body" style={styles.infoValue}>
                    {userProfile.church.name}
                  </Text>
                </View>
              )}

              {userProfile.service && (
                <View style={styles.infoItem}>
                  <Text variant="label" style={styles.infoLabel}>Service</Text>
                  <Text variant="body" style={styles.infoValue}>
                    {userProfile.service.name}
                  </Text>
                </View>
              )}

              <View style={styles.infoItem}>
                <Text variant="label" style={styles.infoLabel}>Role</Text>
                <Text variant="body" style={styles.infoValue}>
                  {userProfile.roles?.join(', ') || 'Member'}
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Text variant="label" style={styles.infoLabel}>Member Since</Text>
                <Text variant="body" style={styles.infoValue}>
                  {new Date(userProfile.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {groupMemberships && groupMemberships.length > 0 && (
              <View style={styles.section}>
                <Text variant="h4" style={styles.sectionTitle}>My Groups</Text>
                {groupMemberships.map((membership: any) => (
                  <View
                    key={membership.id}
                    style={[
                      styles.membershipItem,
                      { backgroundColor: theme.colors.surface.secondary },
                    ]}
                  >
                    <View style={styles.membershipInfo}>
                      <Text variant="bodyLarge" weight="semiBold" style={styles.membershipTitle}>
                        {membership.group?.title || 'Unknown Group'}
                      </Text>
                      <Text variant="caption" weight="semiBold" style={styles.membershipRole}>
                        {membership.role.charAt(0).toUpperCase() +
                          membership.role.slice(1)}
                      </Text>
                    </View>
                    <Text variant="caption" color="secondary" style={styles.membershipDate}>
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
                <Text variant="h4" style={styles.sectionTitle}>
                  Friends ({friendsQuery.data?.length || 0})
                </Text>
                <Button
                  title="Manage"
                  onPress={() => setShowFriendsModal(true)}
                  variant="secondary"
                  size="small"
                />
              </View>

              {friendsQuery.data && friendsQuery.data.length > 0 ? (
                <>
                  {friendsQuery.data.slice(0, 5).map((friendship: any) => {
                    const friend = friendship.friend;
                    const friendFullName = getFullName(friend);
                    const friendShortName = getDisplayName(friend, {
                      lastInitial: true,
                      fallback: 'full',
                    });

                    return (
                      <TouchableOpacity
                        key={friendship.id}
                        style={styles.friendItem}
                        onPress={() =>
                          friend?.id && router.push(`/user/${friend.id}`)
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`View ${friendFullName || friendShortName || 'user'} profile`}
                      >
                        <Avatar
                          size={40}
                          imageUrl={friend?.avatar_url}
                          name={friendFullName}
                        />
                        <View style={styles.friendInfo}>
                          <Text variant="body" weight="semiBold" style={styles.friendName}>
                            {friendShortName || friendFullName || 'Unknown User'}
                          </Text>
                          <Text variant="bodySmall" color="secondary" style={styles.friendEmail}>
                            {friend?.email}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {friendsQuery.data.length > 5 && (
                    <TouchableOpacity onPress={() => setShowFriendsModal(true)}>
                      <Text variant="body" color="primary" style={styles.moreText}>
                        and {friendsQuery.data.length - 5} more friends
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View
                  style={[
                    styles.emptyFriendsContainer,
                    { backgroundColor: theme.colors.surface.secondary },
                  ]}
                >
                  <Text variant="h5" style={styles.emptyFriendsText}>No friends yet</Text>
                  <Text variant="body" color="secondary" style={styles.emptyFriendsSubtext}>
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
        <ChurchAdminOnly>
          <View style={styles.section}>
            <Text variant="h4" style={styles.sectionTitle}>Admin</Text>
            <Button
              title="Open Admin Dashboard"
              onPress={() => router.push('/admin')}
              variant="primary"
            />
          </View>
        </ChurchAdminOnly>

        <View style={styles.actionsSection}>
          <Button
            title="Communication & Security"
            onPress={() => router.push('/profile/communication')}
            variant="secondary"
            style={styles.privacyButton}
          />
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="outline"
            style={styles.signOutButton}
          />
          <Button
            title="Delete Account"
            onPress={handleDeleteAccount}
            variant="outline"
            style={styles.signOutButton}
          />
        </View>
        
        {/* Bottom spacing to ensure content is visible above navbar */}
        <View style={styles.bottomSpacing} />
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
            {userProfile?.avatar_url ? (
              <TouchableOpacity
                style={styles.modalImageContainer}
                onPress={() => setImageModalVisible(false)}
                activeOpacity={1}
              >
                <Image
                  source={{ uri: userProfile.avatar_url }}
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
                    {userProfile?.name
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

      <FriendManagementModal
        visible={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        userId={user?.id}
      />

      {/* Privacy settings now live in Communication & Security screen */}

      {/* Notification settings moved into Communication & Security page */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  privacyButton: {
    marginBottom: 16,
  },
  signOutButton: {
    marginTop: 16,
  },
  emptyFriendsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
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
  bottomSpacing: {
    height: 100, // Generous bottom spacing for navbar clearance
    paddingBottom: 20, // Additional padding for extra safety
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
