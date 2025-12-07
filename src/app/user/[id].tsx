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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
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
import { AuthLoadingAnimation } from '@/components/auth/AuthLoadingAnimation';
import { GroupPlaceholderImage } from '@/components/ui/GroupPlaceholderImage';

export default function OtherUserProfileScreen() {
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params =
    useLocalSearchParams<{ id?: string; fromNotification?: string }>();
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
  const fromNotification =
    (params?.fromNotification &&
      (Array.isArray(params.fromNotification)
        ? params.fromNotification[0]
        : params.fromNotification)) === '1';

  useEffect(() => {
    if (fromNotification) {
      friendshipStatusQuery.refetch();
    }
  }, [fromNotification, friendshipStatusQuery.refetch]);

  // Filter memberships based on visibility rules
  const visibleMemberships = useMemo(() => {
    if (!memberships || memberships.length === 0) return [];

    // Filter to only show active memberships in active groups
    // (gm.status = 'active' AND g.status = 'approved')
    const activeInActiveGroups = memberships.filter(
      (m: any) =>
        m.status === 'active' && m.group?.status === 'approved'
    );

    // If viewing own profile, show all active memberships in active groups
    if (isSelf) return activeInActiveGroups;

    // Check if viewer is admin or clergy (church_admin or superadmin)
    const isViewerAdmin =
      currentUserProfile?.roles?.includes('church_admin') ||
      currentUserProfile?.roles?.includes('superadmin');

    // Check if viewer is friends with profile owner
    const isFriend =
      friendshipStatusQuery.data?.status === 'accepted';

    // If viewer is admin/clergy or friend, show all active memberships in active groups
    if (isViewerAdmin || isFriend) {
      return activeInActiveGroups;
    }

    // Otherwise, only show groups where the profile owner is a leader
    return activeInActiveGroups.filter(
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
      headerShown: false, // Remove header completely
    });
  }, [navigation]);

  const formatMemberSince = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `Joined in ${month} ${year}`;
  };

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
      return (
        <View style={styles.addFriendButton}>
          <Ionicons name="person-add-outline" size={24} color="#FF0083" />
          <Text style={styles.addFriendText}>Loading...</Text>
        </View>
      );
    }

    switch (status) {
      case 'accepted':
        return (
          <TouchableOpacity
            style={styles.addFriendButton}
            onPress={handleRemoveFriend}
            activeOpacity={0.7}
          >
            <Ionicons name="person-remove-outline" size={24} color="#FF0083" />
            <Text style={styles.addFriendText}>Remove friend</Text>
          </TouchableOpacity>
        );
      case 'pending':
        if (isIncoming && pendingFriendshipId) {
          return (
            <TouchableOpacity
              style={styles.addFriendButton}
              onPress={() =>
                acceptFriendRequest.mutate(pendingFriendshipId, {
                  onSuccess: () => friendshipStatusQuery.refetch(),
                  onError: (e) => Alert.alert('Error', e.message),
                })
              }
              activeOpacity={0.7}
            >
              <Ionicons name="person-add-outline" size={24} color="#FF0083" />
              <Text style={styles.addFriendText}>Accept friend request</Text>
            </TouchableOpacity>
          );
        }
        return (
          <View style={styles.addFriendButton}>
            <Ionicons name="person-add-outline" size={24} color="#999999" />
            <Text style={[styles.addFriendText, { color: '#999999' }]}>Request pending</Text>
          </View>
        );
      case 'rejected':
        if (isIncoming) {
          return (
            <TouchableOpacity
              style={styles.addFriendButton}
              onPress={() =>
                targetUserId &&
                acceptRejected.mutate(targetUserId, {
                  onSuccess: () => friendshipStatusQuery.refetch(),
                  onError: (e) => Alert.alert('Error', e.message),
                })
              }
              activeOpacity={0.7}
            >
              <Ionicons name="person-add-outline" size={24} color="#FF0083" />
              <Text style={styles.addFriendText}>Add friend</Text>
            </TouchableOpacity>
          );
        }
        return (
          <View style={styles.addFriendButton}>
            <Ionicons name="person-add-outline" size={24} color="#999999" />
            <Text style={[styles.addFriendText, { color: '#999999' }]}>Request pending</Text>
          </View>
        );
      default:
        return (
          <TouchableOpacity
            style={styles.addFriendButton}
            onPress={handleAddFriend}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add-outline" size={24} color="#FF0083" />
            <Text style={styles.addFriendText}>Add friend</Text>
          </TouchableOpacity>
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

  if (!profile && profileLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <AuthLoadingAnimation />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Manual Back Button */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 16 }]}
        onPress={handleBackPress}
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={20} color="#2C2235" />
      </TouchableOpacity>
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {profile && (
          <>
            <View style={[styles.headerSection, { paddingTop: insets.top + 50 }]}>
              <Avatar
                size={121}
                imageUrl={profile.avatar_url}
                name={profileFullName}
                onPress={handleAvatarPress}
              />
              <Text style={styles.name}>
                {profileFullName || profileShortName || 'User'}
              </Text>
              <ActionButton />
            </View>

            {/* Bio Section */}
            <View style={styles.bioSection}>
              <Text style={styles.bioTitle}>Bio</Text>
              <Text style={styles.bioText}>
                {(profile as any).bio || 'This user has not added a bio yet.'}
              </Text>
            </View>

            {/* Profile Info Section */}
            <View style={styles.profileInfoSection}>
              <Text style={styles.profileInfoTitle}>Profile Info</Text>
              {profile.church?.name && (
                <InfoRow label="Church" value={profile.church.name} />
              )}
              <InfoRow
                label="Member since"
                value={formatMemberSince(profile.created_at)}
              />
            </View>

            {/* Groups Section */}
            {visibleMemberships && visibleMemberships.length > 0 && (
              <View style={styles.groupsSection}>
                <Text style={styles.groupsTitle}>Groups</Text>
                {visibleMemberships.map((m: any) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.groupCardWrapper}
                    onPress={() =>
                      m.group?.id && router.push(`/group/${m.group.id}`)
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.groupCard}>
                      <View style={styles.groupCardImageContainer}>
                        {m.group?.image_url ? (
                          <OptimizedImage
                            source={{ uri: m.group.image_url }}
                            style={styles.groupCardImage}
                            containerStyle={styles.groupCardImageContainer}
                            quality="medium"
                            lazy={true}
                            resizeMode="cover"
                          />
                        ) : (
                          <GroupPlaceholderImage style={styles.groupCardImage} />
                        )}
                      </View>
                      <View style={styles.groupCardContent}>
                        <Text style={styles.groupCardTitle} numberOfLines={2}>
                        {m.group?.title || 'Unknown Group'}
                      </Text>
                        <Text style={styles.groupJoinDate}>
                          {formatJoinDate(m.joined_at)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
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
                <OptimizedImage
                  source={{ uri: profile.avatar_url }}
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
    <>
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
      <View style={styles.divider} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 1000,
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 100, // Space for bottom tab bar
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
  },
  headerSection: {
    alignItems: 'center',
    paddingBottom: 48, // Space to bio section
  },
  name: {
    fontSize: 24, // Figma: 24px
    fontWeight: '700', // Bold
    color: '#2C2235', // Figma: #2c2235
    letterSpacing: -0.48, // Figma: -0.48px
    lineHeight: 24,
    marginTop: 24, // Space from avatar
    textAlign: 'center',
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20, // Space from name
    gap: 8,
  },
  addFriendText: {
    fontSize: 16, // Figma: 16px
    fontWeight: '500', // Medium
    color: '#FF0083', // Figma: #ff0083
    letterSpacing: -0.32, // Figma: -0.32px
    lineHeight: 16,
  },
  bioSection: {
    paddingHorizontal: 16, // Figma: 16px from left
    marginBottom: 28, // Space to profile info
  },
  bioTitle: {
    fontSize: 16, // Figma: 16px
    fontWeight: '700', // Bold
    color: '#2C2235', // Figma: #2c2235
    letterSpacing: -0.32, // Figma: -0.32px
    lineHeight: 16,
    marginBottom: 21, // Space to bio text
  },
  bioText: {
    fontSize: 16, // Figma: 16px
    fontWeight: '500', // Medium
    color: '#999999', // Figma: #999999
    letterSpacing: -0.32, // Figma: -0.32px
    lineHeight: 16,
  },
  profileInfoSection: {
    paddingHorizontal: 16, // Figma: 16px from left
    marginBottom: 28, // Space to groups
  },
  profileInfoTitle: {
    fontSize: 16, // Figma: 16px
    fontWeight: '700', // Bold
    color: '#2C2235', // Figma: #2c2235
    letterSpacing: -0.32, // Figma: -0.32px
    lineHeight: 16,
    marginBottom: 20, // Space to first row
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14, // Figma: spacing between items
    paddingHorizontal: 4,
  },
  infoLabel: {
    fontSize: 16, // Figma: 16px
    fontWeight: '500', // Medium
    color: '#999999', // Figma: #999999
    letterSpacing: -0.32, // Figma: -0.32px
    lineHeight: 16,
  },
  infoValue: {
    fontSize: 16, // Figma: 16px
    fontWeight: '600', // SemiBold
    color: '#2C2235', // Figma: #2c2235
    letterSpacing: -0.32, // Figma: -0.32px
    lineHeight: 16,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA', // Figma: divider color
    marginLeft: 4,
  },
  groupsSection: {
    paddingHorizontal: 16, // Figma: 16px from left
    marginBottom: 24,
  },
  groupsTitle: {
    fontSize: 16, // Figma: 16px
    fontWeight: '700', // Bold
    color: '#2C2235', // Figma: #2c2235
    letterSpacing: -0.32, // Figma: -0.32px
    lineHeight: 16,
    marginBottom: 16, // Space to first group
  },
  groupCardWrapper: {
    marginBottom: 16,
  },
  groupCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    overflow: 'hidden',
    height: 92, // Figma: 92px height
  },
  groupCardImageContainer: {
    width: 92, // Figma: image takes left portion
    height: 92,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    overflow: 'hidden',
  },
  groupCardImage: {
    width: '100%',
    height: '100%',
  },
  groupCardContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  groupCardTitle: {
    fontSize: 14, // Figma: 14px
    fontWeight: '700', // Bold
    color: '#271D30', // Figma: #271d30
    letterSpacing: -0.28, // Figma: -0.28px
    lineHeight: 14,
    marginBottom: 8, // Space to join date
  },
  groupJoinDate: {
    fontSize: 12, // Figma: 12px
    fontWeight: '400', // Regular
    color: '#2C2235', // Figma: #2c2235
    letterSpacing: -0.24, // Figma: -0.24px
    lineHeight: 16,
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
