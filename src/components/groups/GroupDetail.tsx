import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, Alert } from 'react-native';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useRouter } from 'expo-router';
import type { GroupWithDetails } from '../../types/database';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { GroupLeaderPanel } from './GroupLeaderPanel';
import { JoinRequestModal } from './JoinRequestModal';
import {
  useJoinGroup,
  useLeaveGroup,
  useGroupMembers,
} from '../../hooks/useGroups';
import { useUserJoinRequests } from '../../hooks/useJoinRequests';
import type { GroupMembershipWithUser } from '../../types/database';
import { useAuthStore } from '../../stores/auth';

interface GroupDetailProps {
  group: GroupWithDetails;
  membershipStatus?: 'member' | 'leader' | 'admin' | null;
  onMembershipChange?: () => void;
  onShare?: () => void;
}

export const GroupDetail: React.FC<GroupDetailProps> = ({
  group,
  membershipStatus,
  onMembershipChange,
  onShare,
}) => {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [showJoinRequestModal, setShowJoinRequestModal] = useState(false);

  const joinGroupMutation = useJoinGroup();
  const leaveGroupMutation = useLeaveGroup();
  const { data: members, isLoading: membersLoading } = useGroupMembers(
    group.id
  );
  const { data: userJoinRequests } = useUserJoinRequests(userProfile?.id);

  const formatMeetingTime = (day: string, time: string) => {
    return `${day}s at ${time}`;
  };

  const formatLocation = (location: any) => {
    if (!location) return 'Location TBD';
    if (typeof location === 'string') return location;
    if (location.address) return location.address;
    if (location.room) return `Room ${location.room}`;
    return 'Location TBD';
  };

  const handleJoinGroup = () => {
    if (!userProfile) {
      Alert.alert('Error', 'You must be signed in to join a group');
      return;
    }

    setShowJoinRequestModal(true);
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

  const leaders =
    members?.filter(
      (member) => member.role === 'leader' || member.role === 'admin'
    ) || [];
  const regularMembers =
    members?.filter((member) => member.role === 'member') || [];
  const displayMembers = showAllMembers
    ? regularMembers
    : regularMembers.slice(0, 6);

  const isLoading = joinGroupMutation.isPending || leaveGroupMutation.isPending;

  // Check if current user is a leader of this group
  const userMembership = members?.find(m => m.user_id === userProfile?.id);
  const isGroupLeader = userMembership?.role === 'leader';

  // Check if user has a pending join request for this group
  const pendingRequest = userJoinRequests?.find(
    request => request.group_id === group.id && request.status === 'pending'
  );

  const handleGroupUpdated = () => {
    onMembershipChange?.();
  };

  const handleJoinRequestSubmitted = () => {
    setShowJoinRequestModal(false);
    onMembershipChange?.();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {group.image_url && (
        <Image source={{ uri: group.image_url }} style={styles.headerImage} />
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>{group.title}</Text>
            {membershipStatus && (
              <View
                style={[styles.statusBadge, styles[`${membershipStatus}Badge`]]}
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
          </View>
          {onShare && (
            <TouchableOpacity onPress={onShare} style={styles.shareButton}>
              <Text style={styles.shareIcon}>📤</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.description}>{group.description}</Text>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Meeting Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📅 When:</Text>
            <Text style={styles.infoValue}>
              {formatMeetingTime(group.meeting_day, group.meeting_time)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📍 Where:</Text>
            <Text style={styles.infoValue}>
              {formatLocation(group.location)}
            </Text>
          </View>
          {group.member_count !== undefined && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>👥 Members:</Text>
              <Text style={styles.infoValue}>
                {group.member_count} member{group.member_count !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {group.service?.name && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>⛪ Service:</Text>
              <Text style={styles.infoValue}>{group.service.name}</Text>
            </View>
          )}
        </View>

        {/* Leaders Section */}
        {leaders.length > 0 && (
          <View style={styles.membersSection}>
            <Text style={styles.sectionTitle}>
              Leader{leaders.length > 1 ? 's' : ''}
            </Text>
            <View style={styles.membersList}>
              {leaders.map((member) => (
                <View key={member.id} style={styles.memberItem}>
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
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Members Section */}
        {regularMembers.length > 0 && (
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
                  <View key={member.id} style={styles.memberItem}>
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
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Group Leader Panel */}
        {isGroupLeader && (
          <GroupLeaderPanel
            group={group}
            onGroupUpdated={handleGroupUpdated}
          />
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {membershipStatus ? (
            <View style={styles.actionButtons}>
              {group.whatsapp_link && (
                <Button
                  title="Join WhatsApp Group"
                  onPress={handleWhatsAppPress}
                  variant="secondary"
                  style={styles.whatsappButton}
                />
              )}
              <Button
                title="Leave Group"
                onPress={handleLeaveGroup}
                variant="danger"
                loading={isLoading}
                disabled={isLoading}
              />
            </View>
          ) : pendingRequest ? (
            <View style={styles.pendingRequestContainer}>
              <Text style={styles.pendingRequestText}>
                ⏳ Your join request is pending approval
              </Text>
              <Text style={styles.pendingRequestSubtext}>
                Group leaders will review your request and get back to you soon.
              </Text>
            </View>
          ) : (
            <Button
              title="Request to Join"
              onPress={handleJoinGroup}
              loading={isLoading}
              disabled={isLoading}
            />
          )}
        </View>

        {/* Join Request Modal */}
        {userProfile && (
          <JoinRequestModal
            visible={showJoinRequestModal}
            onClose={() => setShowJoinRequestModal(false)}
            group={group}
            userId={userProfile.id}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  shareButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  shareIcon: {
    fontSize: 20,
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
    borderRadius: 16,
    minWidth: 70,
    alignItems: 'center',
  },
  memberBadge: {
    backgroundColor: '#e3f2fd',
  },
  leaderBadge: {
    backgroundColor: '#fff3e0',
  },
  adminBadge: {
    backgroundColor: '#fce4ec',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberText: {
    color: '#1976d2',
  },
  leaderText: {
    color: '#f57c00',
  },
  adminText: {
    color: '#c2185b',
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    width: 80,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
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
