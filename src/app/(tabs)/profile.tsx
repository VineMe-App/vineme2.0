import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth';
import {
  useUserProfile,
  useDeleteAccount,
  useUploadAvatar,
  useDeleteAvatar,
} from '@/hooks/useUsers';
import { useFriends } from '@/hooks/useFriendships';
import { router } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { AuthButton } from '@/components/auth/AuthButton';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { ChurchAdminOnly } from '@/components/ui/RoleBasedRender';
import { FriendManagementModal } from '@/components/friends/FriendManagementModal';
import { useTheme } from '@/theme/provider/useTheme';
import { getDisplayName, getFullName } from '@/utils/name';
import { setDeletionFlowActive, isDeletionFlowActive } from '@/utils/errorSuppression';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthLoadingAnimation } from '@/components/auth/AuthLoadingAnimation';
// Admin dashboard summary moved to /admin route

export default function ProfileScreen() {
  const { user, signOut, loadUserProfile } = useAuthStore();
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

  const isLoading =
    profileLoading || friendsQuery.isLoading;

  const profileFullName = getFullName(userProfile);
  const profileShortName = getDisplayName(userProfile, { fallback: 'full' });

  const handleRefresh = async () => {
    await Promise.all([
      refetchProfile(),
      friendsQuery.refetch(),
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
      // Refresh auth store to update navbar profile picture
      await loadUserProfile();
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
      // Refresh auth store to update navbar profile picture
      await loadUserProfile();
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
          // Don't navigate manually - let the root layout handle it
          // This prevents race conditions with the layout's navigation logic
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
              // Set flag FIRST to suppress error screen and post-deletion errors
              setDeletionFlowActive(true);
              
              // Wait a tiny bit for the flag to take effect and prevent error screen flash
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Start deletion
              await deleteAccountMutation.mutateAsync(user.id);
              
              // Navigate immediately after successful deletion
              router.replace('/(auth)/welcome');
              
              // Then sign out (this will clear auth state but we've already navigated)
              await signOut();
              
              // Reset flag after a short delay to allow cleanup
              setTimeout(() => setDeletionFlowActive(false), 2000);
            } catch (error) {
              // Reset flag on error so error can be shown
              setDeletionFlowActive(false);
              
              console.error('[handleDeleteAccount] Error:', error);
              
              // Check if it's a sole leader error (expected validation error)
              const errorMessage = error instanceof Error ? error.message : String(error);
              if (errorMessage.includes('sole leader')) {
                // This is expected user feedback, not a system error
                Alert.alert(
                  'Cannot Delete Account',
                  errorMessage,
                  [{ text: 'OK' }]
                );
                // Prevent error from being logged as global error
                return;
              }
              
              // For unexpected errors, show generic message with more details in dev
              const userMessage = __DEV__ 
                ? `Failed to delete account: ${errorMessage}`
                : 'Failed to delete account. Please try again.';
              Alert.alert('Error', userMessage);
            }
          },
        },
      ]
    );
  };

  // Don't show error screen during account deletion - user is being navigated away
  const deletionActive = isDeletionFlowActive();
  
  if (profileError && !deletionActive) {
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

  if (!userProfile && !isLoading && !deletionActive) {
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
  
  // Show loading state during deletion instead of error
  if (deletionActive || (!userProfile && isLoading)) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        <View style={styles.loadingContainer}>
          <AuthLoadingAnimation />
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
                  size={121}
                  imageUrl={userProfile.avatar_url}
                  name={profileFullName}
                  onPress={handleAvatarPress}
                />
                <TouchableOpacity
                  style={styles.editIconButton}
                  onPress={handleAvatarEdit}
                  accessibilityLabel="Edit profile photo"
                  accessibilityRole="button"
                  activeOpacity={0.8}
                >
                  <Ionicons name="pencil-outline" size={14} color="#2C2235" />
                </TouchableOpacity>
              </View>

              <Text style={styles.name}>
                {profileFullName || profileShortName || 'Your Profile'}
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.profileInfoTitle}>Profile Info</Text>

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
                <Text style={styles.infoLabel}>Member since</Text>
                <Text style={styles.infoValue}>
                  {new Date(userProfile.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            {/* Friends Section */}
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Friends</Text>
                <TouchableOpacity onPress={() => setShowFriendsModal(true)}>
                  <Text style={styles.infoLink}>Manage</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Admin Section */}
            <ChurchAdminOnly>
              <View style={styles.infoSection}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Admin</Text>
                  <TouchableOpacity onPress={() => router.push('/admin')}>
                    <Text style={styles.infoLink}>Open admin dashboard</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ChurchAdminOnly>

            {/* Communication & Security Section */}
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Communication & Security</Text>
                <TouchableOpacity onPress={() => router.push('/profile/communication')}>
                  <Text style={styles.infoLink}>Settings</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <View style={styles.actionsSection}>
          <AuthButton
            title="Sign Out"
            onPress={handleSignOut}
            variant="secondary"
            style={styles.signOutButton}
          />
          <AuthButton
            title="Delete Account"
            onPress={handleDeleteAccount}
            variant="secondary"
            style={styles.deleteButton}
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
                <OptimizedImage
                  source={{ uri: userProfile.avatar_url }}
                  style={styles.modalImage}
                  quality="high"
                  lazy={false}
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
    paddingHorizontal: 38,
    paddingTop: 37,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 36,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 24,
    width: 121,
    height: 121,
  },
  editIconButton: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C2235',
    letterSpacing: -0.48,
    lineHeight: 28,
    textAlign: 'center',
    marginTop: 8,
    includeFontPadding: false,
  },
  infoSection: {
    marginBottom: 0,
  },
  profileInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2235',
    letterSpacing: -0.32,
    lineHeight: 16,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 14,
  },
  infoLabel: {
    fontSize: 14,
    color: '#999999',
    fontWeight: '500',
    letterSpacing: -0.28,
    lineHeight: 14,
  },
  infoValue: {
    fontSize: 14,
    color: '#2C2235',
    fontWeight: '600',
    letterSpacing: -0.28,
    lineHeight: 14,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  infoLink: {
    fontSize: 16,
    color: '#FF0083',
    fontWeight: '500',
    letterSpacing: -0.32,
    lineHeight: 16,
    textDecorationLine: 'underline',
    textAlign: 'right',
  },
  actionsSection: {
    marginTop: 32,
    paddingTop: 0,
  },
  signOutButton: {
    marginBottom: 12,
  },
  deleteButton: {
    marginBottom: 0,
  },
  bottomSpacing: {
    height: 80,
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
    lineHeight: 80,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
