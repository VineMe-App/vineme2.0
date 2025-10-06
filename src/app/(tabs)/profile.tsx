import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import { Text } from '../../components/ui/Text';
import { useAuthStore } from '@/stores/auth';
import {
  useUserProfile,
  useDeleteAccount,
  useUploadAvatar,
  useDeleteAvatar,
} from '@/hooks/useUsers';
import { useFriends, useReceivedFriendRequests } from '@/hooks/useFriendships';
import { router } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ChurchAdminOnly } from '@/components/ui/RoleBasedRender';
import { FriendRequestNotifications } from '@/components/friends/FriendRequestNotifications';
import { FriendManagementModal } from '@/components/friends/FriendManagementModal';
import { useTheme } from '@/theme/provider/useTheme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
// Admin dashboard summary moved to /admin route

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const { theme } = useTheme();
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  const deleteAccountMutation = useDeleteAccount();
  const uploadAvatarMutation = useUploadAvatar();
  const deleteAvatarMutation = useDeleteAvatar();

  const {
    data: userProfile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useUserProfile(user?.id);

  // Use the new friendship hooks for better data management
  const friendsQuery = useFriends(user?.id);
  const receivedRequestsQuery = useReceivedFriendRequests(user?.id);

  const isLoading =
    profileLoading || friendsQuery.isLoading || receivedRequestsQuery.isLoading;

  const handleRefresh = async () => {
    await Promise.all([
      refetchProfile(),
      friendsQuery.refetch(),
      receivedRequestsQuery.refetch(),
    ]);
  };

  const handleAvatarPress = () => {
    setImageModalVisible(true);
  };

  const handleAvatarEdit = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose from Library', onPress: pickImage },
      { text: 'Take Photo', onPress: takePhoto },
      ...(userProfile?.avatar_url
        ? [
            {
              text: 'Remove Photo',
              onPress: removeAvatar,
              style: 'destructive' as const,
            },
          ]
        : []),
    ]);
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[Profile] Error in pickImage:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your camera.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[Profile] Error in takePhoto:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user?.id) return;
    try {
      await uploadAvatarMutation.mutateAsync({
        userId: user.id,
        fileUri: uri,
      });
      Alert.alert('Success', 'Profile photo updated!');
    } catch (error) {
      console.error('[Profile] Upload failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to upload avatar: ${errorMessage}`);
    }
  };

  const removeAvatar = async () => {
    if (!userProfile?.avatar_url || !user?.id) return;
    try {
      await deleteAvatarMutation.mutateAsync({
        userId: user.id,
        avatarUrl: userProfile.avatar_url,
      });
      Alert.alert('Success', 'Profile photo removed!');
    } catch (error) {
      console.error('[Profile] Remove failed:', error);
      Alert.alert('Error', 'Failed to remove avatar. Please try again.');
    }
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
            } catch {
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
          <Text variant="body" color="error" style={styles.errorText}>
            Failed to load profile
          </Text>
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
          <Text variant="body" color="error" style={styles.errorText}>
            Profile not found
          </Text>
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
              <View style={styles.avatarContainer}>
                <Avatar
                  size={100}
                  imageUrl={userProfile.avatar_url}
                  name={userProfile.name}
                  onPress={handleAvatarPress}
                />
                <TouchableOpacity
                  style={[
                    styles.editIconButton,
                    {
                      backgroundColor: theme.colors.primary[500],
                    },
                  ]}
                  onPress={handleAvatarEdit}
                  accessibilityLabel="Edit profile photo"
                  accessibilityRole="button"
                  activeOpacity={0.8}
                >
                  <Ionicons name="pencil-sharp" size={16} color="#fff" />
                </TouchableOpacity>
              </View>

              <Text variant="h3" style={styles.name}>
                {userProfile.name}
              </Text>

              {user?.email ? (
                <Text variant="body" color="secondary" style={styles.email}>
                  {user.email}
                </Text>
              ) : null}
            </View>

            {/* Friend Request Notifications */}
            <FriendRequestNotifications
              requests={(receivedRequestsQuery.data as any[]) || []}
              onPress={() => setShowFriendsModal(true)}
            />

            <View style={styles.infoSection}>
              <Text variant="h4" style={styles.sectionTitle}>
                Profile Information
              </Text>

              {userProfile.church && (
                <View style={styles.infoItem}>
                  <Text variant="label" style={styles.infoLabel}>
                    Church
                  </Text>
                  <Text variant="body" style={styles.infoValue}>
                    {userProfile.church.name}
                  </Text>
                </View>
              )}

              {userProfile.service && (
                <View style={styles.infoItem}>
                  <Text variant="label" style={styles.infoLabel}>
                    Service
                  </Text>
                  <Text variant="body" style={styles.infoValue}>
                    {userProfile.service.name}
                  </Text>
                </View>
              )}

              <View style={styles.infoItem}>
                <Text variant="label" style={styles.infoLabel}>
                  Member Since
                </Text>
                <Text variant="body" style={styles.infoValue}>
                  {new Date(userProfile.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {/* Friends Section - Compact */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text variant="h4" style={styles.sectionTitle}>
                  Friends
                </Text>
                <Button
                  title={`Manage (${friendsQuery.data?.length || 0})`}
                  onPress={() => setShowFriendsModal(true)}
                  variant="secondary"
                  size="small"
                />
              </View>
            </View>
          </>
        )}

        {/* Admin Features */}
        <ChurchAdminOnly>
          <View style={styles.section}>
            <Text variant="h4" style={styles.sectionTitle}>
              Admin
            </Text>
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
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  editIconButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
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
    marginTop: 4,
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
