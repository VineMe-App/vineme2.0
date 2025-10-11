import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text } from '../ui/Text';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { JoinRequestsPanel } from './JoinRequestsPanel';
import { ArchiveModal } from './ArchiveModal';
import { MemberManagementModal } from './MemberManagementModal';
import { useRouter } from 'expo-router';
import type {
  GroupWithDetails,
  GroupMembershipWithUser,
} from '../../types/database';
import { useAuthStore } from '../../stores/auth';
import { useGroupMembers } from '../../hooks/useGroups';
import { useGroupLeaderActions } from '../../hooks/useGroupLeaderActions';
import { useGroupJoinRequests } from '../../hooks/useJoinRequests';

interface GroupLeaderPanelProps {
  group: GroupWithDetails;
  onGroupUpdated?: () => void;
}

export const GroupLeaderPanel: React.FC<GroupLeaderPanelProps> = ({
  group,
  onGroupUpdated,
}) => {
  const { userProfile } = useAuthStore();
  const router = useRouter();
  // Inline actions on each card
  const [activeTab, setActiveTab] = useState<'members' | 'requests'>('members');
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMembershipWithUser | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);

  const { data: members, isLoading: membersLoading } = useGroupMembers(
    group.id
  );
  const { data: joinRequests } = useGroupJoinRequests(
    group.id,
    userProfile?.id
  );
  const {
    promoteToLeaderMutation,
    demoteFromLeaderMutation,
    removeMemberMutation,
    toggleGroupCapacityMutation,
  } = useGroupLeaderActions();

  // Check if current user is a leader of this group
  const userMembership = members?.find((m) => m.user_id === userProfile?.id);
  const isGroupLeader = userMembership?.role === 'leader';

  const isChurchAdminForService = Boolean(
    userProfile?.roles?.includes('church_admin') &&
      userProfile?.service_id &&
      group.service_id &&
      userProfile.service_id === group.service_id
  );

  if (!isGroupLeader && !isChurchAdminForService) {
    return null; // Don't show panel if user is not a leader
  }

  const leaders = members?.filter((m) => m.role === 'leader') || [];
  const regularMembers = members?.filter((m) => m.role === 'member') || [];
  const pendingRequestsCount =
    joinRequests?.filter((r) => r.status === 'pending').length || 0;

  const handlePromoteToLeader = async (member: GroupMembershipWithUser) => {
    if (!userProfile) return;

    Alert.alert(
      'Promote to Leader',
      `Are you sure you want to promote ${member.user?.name} to group leader?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            try {
              await promoteToLeaderMutation.mutateAsync({
                groupId: group.id,
                userId: member.user_id,
                promoterId: userProfile.id,
              });
              Alert.alert(
                'Success',
                `${member.user?.name} has been promoted to leader`
              );
              onGroupUpdated?.();
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'Failed to promote member'
              );
            }
          },
        },
      ]
    );
  };

  const handleDemoteFromLeader = async (member: GroupMembershipWithUser) => {
    if (!userProfile) return;

    // Check if this is the last leader
    if (leaders.length === 1) {
      Alert.alert(
        'Cannot Demote',
        'You cannot demote the last leader of the group. Promote another member to leader first.'
      );
      return;
    }

    Alert.alert(
      'Demote from Leader',
      `Are you sure you want to demote ${member.user?.name} from group leader?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Demote',
          style: 'destructive',
          onPress: async () => {
            try {
              await demoteFromLeaderMutation.mutateAsync({
                groupId: group.id,
                userId: member.user_id,
                demoterId: userProfile.id,
              });
              Alert.alert(
                'Success',
                `${member.user?.name} has been demoted to member`
              );
              onGroupUpdated?.();
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'Failed to demote leader'
              );
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = async (member: GroupMembershipWithUser) => {
    if (!userProfile) return;

    // Check if trying to remove the last leader
    if (member.role === 'leader' && leaders.length === 1) {
      Alert.alert(
        'Cannot Remove',
        'You cannot remove the last leader of the group. Promote another member to leader first.'
      );
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.user?.name} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMemberMutation.mutateAsync({
                groupId: group.id,
                userId: member.user_id,
                removerId: userProfile.id,
              });
              Alert.alert(
                'Success',
                `${member.user?.name} has been removed from the group`
              );
              onGroupUpdated?.();
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'Failed to remove member'
              );
            }
          },
        },
      ]
    );
  };

  const isLoading =
    promoteToLeaderMutation.isPending ||
    demoteFromLeaderMutation.isPending ||
    removeMemberMutation.isPending;

  const handleMemberClick = (member: GroupMembershipWithUser) => {
    setSelectedMember(member);
    setShowMemberModal(true);
  };

  const handleCloseMemberModal = () => {
    setShowMemberModal(false);
    setSelectedMember(null);
  };

  const handleToggleCapacity = async () => {
    if (!userProfile?.id) return;

    const newCapacityStatus = !group.at_capacity;
    const message = newCapacityStatus
      ? 'This will mark the group as full. Members can still apply but will see a warning that acceptance is unlikely.'
      : 'This will mark the group as accepting new members.';

    Alert.alert(
      newCapacityStatus ? 'Mark as Full?' : 'Mark as Available?',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await toggleGroupCapacityMutation.mutateAsync({
                groupId: group.id,
                userId: userProfile.id,
                atCapacity: newCapacityStatus,
              });
              onGroupUpdated?.();
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'Failed to update capacity status'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Ionicons name="settings-outline" size={24} color="#007AFF" />
          <Text style={styles.title}>Group Management</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowArchiveModal(true)}
            style={styles.archiveButton}
          >
            <Ionicons name="archive-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/group-management/${group.id}/edit`)}
            style={styles.editButton}
          >
            <Ionicons name="pencil-outline" size={20} color="#007AFF" />
            <Text style={styles.editButtonText}>Edit Details</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Capacity Status */}
      <View style={styles.capacitySection}>
        <View style={styles.capacityInfo}>
          <Ionicons
            name={group.at_capacity ? 'people' : 'checkmark-circle'}
            size={20}
            color={group.at_capacity ? '#f97316' : '#10b981'}
          />
          <View style={styles.capacityTextContainer}>
            <Text style={styles.capacityLabel}>
              {group.at_capacity ? 'Group is Full' : 'Accepting New Members'}
            </Text>
            <Text style={styles.capacityDescription}>
              {group.at_capacity
                ? 'Members can still apply but will see a warning'
                : 'Group is open for new member applications'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleToggleCapacity}
          style={[
            styles.capacityToggle,
            group.at_capacity ? styles.capacityToggleFull : styles.capacityToggleAvailable,
          ]}
          disabled={toggleGroupCapacityMutation.isPending}
        >
          {toggleGroupCapacityMutation.isPending ? (
            <LoadingSpinner size="small" />
          ) : (
            <>
              <Ionicons
                name={group.at_capacity ? 'checkmark-circle-outline' : 'close-circle-outline'}
                size={16}
                color={group.at_capacity ? '#10b981' : '#f97316'}
              />
              <Text
                style={[
                  styles.capacityToggleText,
                  group.at_capacity ? styles.capacityToggleTextAvailable : styles.capacityToggleTextFull,
                ]}
              >
                {group.at_capacity ? 'Mark as Available' : 'Mark as Full'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.activeTab]}
          onPress={() => setActiveTab('members')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'members' && styles.activeTabText,
            ]}
          >
            Members
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'requests' && styles.activeTabText,
            ]}
          >
            Newcomers
          </Text>
          {pendingRequestsCount > 0 && (
            <View style={styles.requestsBadge}>
              <Text style={styles.requestsBadgeText}>
                {pendingRequestsCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'members' ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Leaders ({leaders.length})</Text>
            {membersLoading ? (
              <LoadingSpinner size="small" />
            ) : (
              <View style={styles.membersList}>
                {leaders.map((leader) => (
                  <TouchableOpacity
                    key={leader.id}
                    style={styles.memberItem}
                    onPress={() => handleMemberClick(leader)}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      size={40}
                      imageUrl={leader.user?.avatar_url}
                      name={leader.user?.name || 'Unknown'}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {leader.user?.name || 'Unknown'}
                      </Text>
                      <Text style={styles.memberRole}>Leader</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Members ({regularMembers.length})
            </Text>
            {membersLoading ? (
              <LoadingSpinner size="small" />
            ) : (
              <ScrollView
                style={styles.membersScrollView}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.membersList}>
                  {regularMembers.map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      style={styles.memberItem}
                      onPress={() => handleMemberClick(member)}
                      activeOpacity={0.7}
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
                          {new Date(member.joined_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </>
      ) : (
        <View style={styles.requestsContainer}>
          <JoinRequestsPanel
            group={group}
            leaderId={userProfile?.id || ''}
            onRequestProcessed={onGroupUpdated}
          />
        </View>
      )}

      <ArchiveModal
        visible={showArchiveModal}
        groupId={group.id}
        leaderId={userProfile?.id || ''}
        onClose={() => setShowArchiveModal(false)}
      />

      <MemberManagementModal
        visible={showMemberModal}
        member={selectedMember}
        isLastLeader={leaders.length === 1 && selectedMember?.role === 'leader'}
        groupId={group.id}
        leaderId={userProfile?.id || ''}
        onClose={handleCloseMemberModal}
        onPromoteToLeader={() => {
          if (selectedMember) {
            handlePromoteToLeader(selectedMember);
            handleCloseMemberModal();
          }
        }}
        onDemoteFromLeader={() => {
          if (selectedMember) {
            handleDemoteFromLeader(selectedMember);
            handleCloseMemberModal();
          }
        }}
        onRemoveMember={() => {
          if (selectedMember) {
            handleRemoveMember(selectedMember);
            handleCloseMemberModal();
          }
        }}
        loading={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  archiveButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  capacitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  capacityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  capacityTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  capacityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  capacityDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  capacityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 12,
  },
  capacityToggleFull: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  capacityToggleAvailable: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  capacityToggleText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  capacityToggleTextAvailable: {
    color: '#10b981',
  },
  capacityToggleTextFull: {
    color: '#f97316',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  membersList: {
    gap: 8,
  },
  membersScrollView: {
    maxHeight: 200,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
  },
  requestsBadge: {
    marginLeft: 6,
    backgroundColor: '#ec4899',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  requestsBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  requestsContainer: {
    flex: 1,
    minHeight: 200,
    paddingTop: 8,
  },
});
