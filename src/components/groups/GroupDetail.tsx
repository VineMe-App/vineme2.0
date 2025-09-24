import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Text } from '../ui/Text';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { GroupPlaceholderImage } from '../ui/GroupPlaceholderImage';
import { useRouter } from 'expo-router';
import type { GroupWithDetails } from '../../types/database';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import {
  useJoinGroup,
  useLeaveGroup,
  useGroupMembers,
  useGroupLeaders,
  useFriendsInGroup,
} from '../../hooks/useGroups';
import {
  useCreateJoinRequest,
  useUserJoinRequests,
} from '../../hooks/useJoinRequests';
import { useAuthStore } from '../../stores/auth';
import { useFriends } from '../../hooks/useFriendships';
import { Modal } from '../ui/Modal';
import { Ionicons } from '@expo/vector-icons';
import { locationService } from '../../services/location';
// Referral handled via /referral page
// import { referralService } from '../../services/referrals';

interface GroupDetailProps {
  group: GroupWithDetails;
  membershipStatus?: 'member' | 'leader' | 'admin' | null;
  onMembershipChange?: () => void;
  onShare?: () => void;
  openFriendsOnMount?: boolean;
}

export const GroupDetail: React.FC<GroupDetailProps> = ({
  group,
  membershipStatus,
  onMembershipChange,
  onShare,
  openFriendsOnMount = false,
}) => {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const [showAllMembers, setShowAllMembers] = useState(false);
  // Removed modal-based join flow in favor of native alert confirmation
  const [showFriendsModal, setShowFriendsModal] = useState(openFriendsOnMount);
  // Referral modal removed in favor of navigation

  const joinGroupMutation = useJoinGroup();
  const leaveGroupMutation = useLeaveGroup();
  const createJoinRequestMutation = useCreateJoinRequest();
  const [canSeeMembers, setCanSeeMembers] = useState(false);
  const { data: userJoinRequests } = useUserJoinRequests(userProfile?.id);
  const friendsQuery = useFriends(userProfile?.id);

  const formatMeetingTime = (day: string, time: string) => {
    const date = new Date(`2000-01-01T${time}`);
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${day}s at ${formattedTime}`;
  };

  const formatLocation = (location: any) => {
    const parsed = locationService.parseGroupLocation(location);
    if (parsed.address && parsed.address.trim().length > 0)
      return parsed.address;
    if (typeof location === 'string' && location.trim().length > 0)
      return location;
    if (location?.room) return `Room ${location.room}`;
    return 'Location TBD';
  };

  const handleJoinGroup = () => {
    if (!userProfile) {
      Alert.alert('Error', 'You must be signed in to join a group');
      return;
    }

    Alert.alert(
      'Send Join Request?',
      'By requesting to join this group, you consent to sharing your contact details with the leaders. Do you wish to send your join request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async () => {
            try {
              await createJoinRequestMutation.mutateAsync({
                group_id: group.id,
                user_id: userProfile.id,
                contact_consent: true,
              });
              onMembershipChange?.();
              Alert.alert(
                'Request Sent',
                'Your request has been sent to the group leaders.'
              );
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'Failed to send join request'
              );
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          if (!userProfile) return;

          try {
            await leaveGroupMutation.mutateAsync({
              groupId: group.id,
              userId: userProfile.id,
            });
            onMembershipChange?.();
            Alert.alert('Success', 'You have left the group');
          } catch (error) {
            Alert.alert(
              'Error',
              error instanceof Error ? error.message : 'Failed to leave group'
            );
          }
        },
      },
    ]);
  };

  const handleWhatsAppPress = () => {
    if (!group.whatsapp_link) return;

    Linking.canOpenURL(group.whatsapp_link)
      .then((supported) => {
        if (supported) {
          Linking.openURL(group.whatsapp_link!);
        } else {
          Alert.alert('Error', 'WhatsApp is not installed on this device');
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Failed to open WhatsApp link');
      });
  };

  // Visibility flags
  const isChurchAdminForService = Boolean(
    userProfile?.roles?.includes('church_admin') &&
      userProfile?.service_id &&
      group?.service_id &&
      userProfile.service_id === group.service_id
  );

  // Compute ability to see members and conditionally fetch them
  React.useEffect(() => {
    setCanSeeMembers(Boolean(membershipStatus || isChurchAdminForService));
  }, [membershipStatus, isChurchAdminForService]);

  // Always fetch leaders; fetch members only if allowed
  const { data: leadersData } = useGroupLeaders(group.id);
  const { data: members, isLoading: membersLoading } = useGroupMembers(
    canSeeMembers ? group.id : undefined
  );
  // Always fetch friends in group regardless of membership status
  const { data: friendsInGroupMemberships } = useFriendsInGroup(
    group.id,
    userProfile?.id
  );
  // Also fetch all members for friends calculation (this is public data)
  const { data: allMembers } = useGroupMembers(group.id);

  const leaders = leadersData || [];
  const regularMembers = (members || []).filter(
    (member) => member.role === 'member'
  );
  const displayMembers = showAllMembers
    ? regularMembers
    : regularMembers.slice(0, 6);

  const isLoading =
    joinGroupMutation.isPending ||
    leaveGroupMutation.isPending ||
    createJoinRequestMutation.isPending;

  // Check if current user is a leader of this group
  const userMembership = members?.find((m) => m.user_id === userProfile?.id);
  const isGroupLeader = userMembership?.role === 'leader';
  const canManageGroup = Boolean(isGroupLeader || isChurchAdminForService);
  // removed duplicate isChurchAdminForService

  // Friends in group - use the same logic as groups list
  const friendsInGroup = useMemo(() => {
    if (!userProfile?.id || !friendsQuery.data) return [];

    // Get friend IDs from friendships
    const friendIds = new Set(
      (friendsQuery.data || [])
        .map((f) => f.friend?.id)
        .filter((id): id is string => !!id)
    );

    // If we have direct friends-in-group data, use it and extract users
    if (friendsInGroupMemberships && friendsInGroupMemberships.length > 0) {
      return (friendsInGroupMemberships || [])
        .map((m: any) => m.user)
        .filter((user: any) => user && user.id !== userProfile.id);
    }

    // Fallback to filtering all members by friendship (same as groups list)
    if (allMembers && allMembers.length > 0) {
      return (allMembers || [])
        .filter(
          (m) => m.status === 'active' && m.user?.id && friendIds.has(m.user.id)
        )
        .map((m) => m.user!)
        .filter((u) => u.id !== userProfile.id);
    }

    return [];
  }, [
    friendsInGroupMemberships,
    friendsQuery.data,
    allMembers,
    userProfile?.id,
  ]);

  // Check if user has a pending join request for this group
  const pendingRequest = userJoinRequests?.find(
    (request) => request.group_id === group.id && request.status === 'pending'
  );

  // Referral submission handled in /referral page

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerContainer}>
        {group.image_url ? (
          <Image source={{ uri: group.image_url }} style={styles.headerImage} />
        ) : (
          <GroupPlaceholderImage style={styles.headerImage} />
        )}

        {/* Badge positioned at top right of image */}
        {membershipStatus && (
          <View
            style={[
              styles.statusBadge,
              styles[`${membershipStatus}Badge`],
              styles.imageBadge,
            ]}
          >
            <Text
              style={[styles.statusText, styles[`${membershipStatus}Text`]]}
            >
              {membershipStatus === 'member'
                ? 'Member'
                : membershipStatus === 'leader'
                  ? 'Leader'
                  : 'Admin'}
            </Text>
          </View>
        )}

        {group.status === 'pending' && isGroupLeader && (
          <View style={styles.imageBadge}>
            <Ionicons name="time-outline" size={16} color="#b45309" />
            <Text>Pending admin approval</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>{group.description}</Text>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Meeting Details</Text>
          <View style={styles.infoRowAlt}>
            <Ionicons name="calendar-outline" size={18} color="#6b7280" />
            <Text style={styles.infoValueAlt} numberOfLines={1}>
              {formatMeetingTime(group.meeting_day, group.meeting_time)}
            </Text>
          </View>
          <View style={styles.infoRowAlt}>
            <Ionicons name="location-outline" size={18} color="#6b7280" />
            <Text style={styles.infoValueAlt} numberOfLines={1}>
              {formatLocation(group.location)}
            </Text>
          </View>
          {!!group.member_count && (
            <View style={styles.infoRowAlt}>
              <Ionicons name="people-outline" size={18} color="#6b7280" />
              <Text style={styles.infoValueAlt} numberOfLines={1}>
                {group.member_count} member{group.member_count !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {friendsInGroup.length > 0 && (
            <TouchableOpacity
              style={[styles.infoRowAlt, styles.friendsRow]}
              onPress={() => setShowFriendsModal(true)}
            >
              <Ionicons
                name="person-circle-outline"
                size={18}
                color="#2563eb"
              />
              <Text
                style={[styles.infoValueAlt, styles.friendsText]}
                numberOfLines={1}
              >
                {friendsInGroup.length} friend
                {friendsInGroup.length !== 1 ? 's' : ''} in this group
              </Text>
              <Ionicons
                name="chevron-forward-outline"
                size={18}
                color="#2563eb"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Leaders Section - hidden when current user is a leader */}
        {!isGroupLeader && leaders.length > 0 && (
          <View style={styles.membersSection}>
            <Text style={styles.sectionTitle}>
              Leader{leaders.length > 1 ? 's' : ''}
            </Text>
            <View style={styles.membersList}>
              {leaders.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={styles.memberItem}
                  onPress={() =>
                    member.user?.id && router.push(`/user/${member.user.id}`)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`View ${member.user?.name || 'user'} profile`}
                >
                  <Avatar
                    size={40}
                    imageUrl={member.user?.avatar_url}
                    name={member.user?.name || 'Unknown'}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.user?.name || 'Unknown'}
                    </Text>
                    <Text style={styles.memberRole}>
                      {member.role === 'admin' ? 'Admin' : 'Leader'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Members Section - visible to members/leaders/admins or service-level church admins */}
        {(membershipStatus || isChurchAdminForService) &&
          regularMembers.length > 0 && (
            <View style={styles.membersSection}>
              <View style={styles.membersSectionHeader}>
                <Text style={styles.sectionTitle}>
                  Members ({regularMembers.length})
                </Text>
                {regularMembers.length > 6 && (
                  <TouchableOpacity
                    onPress={() => setShowAllMembers(!showAllMembers)}
                    style={styles.showMoreButton}
                  >
                    <Text style={styles.showMoreText}>
                      {showAllMembers ? 'Show Less' : 'Show All'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {membersLoading ? (
                <LoadingSpinner size="small" />
              ) : (
                <View style={styles.membersList}>
                  {displayMembers.map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      style={styles.memberItem}
                      onPress={() =>
                        member.user?.id &&
                        router.push(`/user/${member.user.id}`)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`View ${member.user?.name || 'user'} profile`}
                    >
                      <Avatar
                        size={40}
                        imageUrl={member.user?.avatar_url}
                        name={member.user?.name || 'Unknown'}
                      />
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>
                          {member.user?.name || 'Unknown'}
                        </Text>
                        <Text style={styles.memberJoinDate}>
                          Joined{' '}
                          {member.joined_at
                            ? new Date(member.joined_at).toLocaleDateString()
                            : 'Unknown'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {membershipStatus ? (
            <View style={styles.actionButtons}>
              {group.whatsapp_link && (
                <Button
                  title="Open WhatsApp Group"
                  onPress={handleWhatsAppPress}
                  variant="secondary"
                  style={styles.whatsappButton}
                />
              )}
              {group.status !== 'pending' && (
                <Button
                  title="Refer a Friend"
                  onPress={() =>
                    router.push({
                      pathname: '/referral',
                      params: { groupId: group.id, groupName: group.title },
                    })
                  }
                  variant="secondary"
                />
              )}
              <Button
                title="Leave Group"
                onPress={handleLeaveGroup}
                variant="error"
                loading={isLoading}
                disabled={isLoading}
              />
            </View>
          ) : pendingRequest ? (
            <View style={styles.pendingRequestContainer}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="time-outline" size={16} color="#92400e" />
                <Text style={styles.pendingRequestText}>
                  Your join request is pending approval
                </Text>
              </View>
              <Text style={styles.pendingRequestSubtext}>
                Group leaders will review your request and get back to you soon.
              </Text>
            </View>
          ) : (
            <View style={styles.actionButtons}>
              <Button
                title="Request to Join"
                onPress={handleJoinGroup}
                loading={isLoading}
                disabled={isLoading}
              />
              <Button
                title="Refer a Friend"
                onPress={() =>
                  router.push({
                    pathname: '/referral',
                    params: { groupId: group.id, groupName: group.title },
                  })
                }
                variant="secondary"
              />
            </View>
          )}
        </View>

        {/* Join Request Modal removed; using native alert confirmation */}

        {/* Friends in Group Modal */}
        <Modal
          isVisible={showFriendsModal}
          onClose={() => setShowFriendsModal(false)}
          title={`Friends in this Group (${friendsInGroup.length})`}
          size="large"
          scrollable
        >
          {friendsInGroup.length > 0 ? (
            <View style={styles.friendsModalContainer}>
              <View style={styles.friendsList}>
                {friendsInGroup.map((friend) => (
                  <TouchableOpacity
                    key={friend.id}
                    style={styles.friendItem}
                    onPress={() => {
                      setShowFriendsModal(false);
                      router.push(`/user/${friend.id}`);
                    }}
                  >
                    <Avatar
                      size={50}
                      imageUrl={friend.avatar_url}
                      name={friend.name}
                    />
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{friend.name}</Text>
                      {!!friend.email && (
                        <Text style={styles.friendEmail}>{friend.email}</Text>
                      )}
                    </View>
                    <Ionicons
                      name="chevron-forward-outline"
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyFriendsContainer}>
              <Ionicons name="people-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyFriendsText}>
                No friends found in this group
              </Text>
              <Text style={styles.emptyFriendsSubtext}>
                When your friends join this group, they'll appear here
              </Text>
            </View>
          )}
        </Modal>

        {/* Referral Form handled via /referral page */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    marginTop: 0,
    marginBottom: 16,
  },
  imageBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 24,
  },
  pendingText: {
    color: '#92400e',
    fontWeight: '600',
    fontSize: 12,
  },
  content: {
    paddingTop: 0,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  header: {
    display: 'none',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginLeft: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  memberBadge: {
    backgroundColor: 'rgba(227, 242, 253, 0.9)',
    borderColor: 'rgba(25, 118, 210, 0.3)',
  },
  leaderBadge: {
    backgroundColor: 'rgba(255, 243, 224, 0.9)',
    borderColor: 'rgba(245, 124, 0, 0.3)',
  },
  adminBadge: {
    backgroundColor: 'rgba(252, 228, 236, 0.9)',
    borderColor: 'rgba(194, 24, 91, 0.3)',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberText: {
    color: '#1976d2',
    opacity: 0.9,
  },
  leaderText: {
    color: '#f57c00',
    opacity: 0.9,
  },
  adminText: {
    color: '#c2185b',
    opacity: 0.9,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 24,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoRowAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  infoValueAlt: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  friendsRow: {
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 8,
  },
  friendsText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  membersSection: {
    marginBottom: 24,
  },
  membersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  showMoreButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  showMoreText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  membersList: {
    gap: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  memberRole: {
    fontSize: 14,
    color: '#f57c00',
    fontWeight: '500',
  },
  memberJoinDate: {
    fontSize: 14,
    color: '#666',
  },
  loader: {
    marginVertical: 16,
  },
  actionSection: {
    marginTop: 8,
    marginBottom: 32,
  },
  actionButtons: {
    gap: 12,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  friendsModalContainer: {
    flex: 1,
    width: '100%',
  },
  friendsList: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  friendEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyFriendsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
    minHeight: 300,
  },
  emptyFriendsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyFriendsSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  pendingRequestContainer: {
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
    alignItems: 'center',
  },
  pendingRequestText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
    textAlign: 'center',
  },
  pendingRequestSubtext: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 20,
  },
});
