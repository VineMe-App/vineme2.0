import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { EditGroupModal } from './EditGroupModal';
import { MemberManagementModal } from './MemberManagementModal';
import { JoinRequestsPanel } from './JoinRequestsPanel';
import type { GroupWithDetails, GroupMembershipWithUser } from '../../types/database';
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMembershipWithUser | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'requests'>('members');

  const { data: members, isLoading: membersLoading } = useGroupMembers(group.id);
  const { data: joinRequests } = useGroupJoinRequests(group.id, userProfile?.id);
  const {
    promoteToLeaderMutation,
    demoteFromLeaderMutation,
    removeMemberMutation,
  } = useGroupLeaderActions();

  // Check if current user is a leader of this group
  const userMembership = members?.find(m => m.user_id === userProfile?.id);
  const isGroupLeader = userMembership?.role === 'leader';

  if (!isGroupLeader) {
    return null; // Don't show panel if user is not a leader
  }

  const leaders = members?.filter(m => m.role === 'leader') || [];
  const regularMembers = members?.filter(m => m.role === 'member') || [];
  const pendingRequestsCount = joinRequests?.filter(r => r.status === 'pending').length || 0;

  const handleMemberPress = (member: GroupMembershipWithUser) => {
    setSelectedMember(member);
    setShowMemberModal(true);
  };

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
              Alert.alert('Success', `${member.user?.name} has been promoted to leader`);
              setShowMemberModal(false);
              onGroupUpdated?.();
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to promote member'
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
              Alert.alert('Success', `${member.user?.name} has been demoted to member`);
              setShowMemberModal(false);
              onGroupUpdated?.();
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to demote leader'
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
              Alert.alert('Success', `${member.user?.name} has been removed from the group`);
              setShowMemberModal(false);
              onGroupUpdated?.();
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to remove member'
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Ionicons name="settings-outline" size={24} color="#007AFF" />
          <Text style={styles.title}>Group Management</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowEditModal(true)}
          style={styles.editButton}
        >
          <Ionicons name="pencil-outline" size={20} color="#007AFF" />
          <Text style={styles.editButtonText}>Edit Details</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.activeTab]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>
            Members
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Join Requests
          </Text>
          {pendingRequestsCount > 0 && (
            <View style={styles.requestsBadge}>
              <Text style={styles.requestsBadgeText}>{pendingRequestsCount}</Text>
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
                    onPress={() => handleMemberPress(leader)}
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
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Members ({regularMembers.length})</Text>
            {membersLoading ? (
            <LoadingSpinner size="small" />
            ) : (
              <ScrollView style={styles.membersScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.membersList}>
                  {regularMembers.map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      style={styles.memberItem}
                      onPress={() => handleMemberPress(member)}
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
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#666" />
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

      {/* Edit Group Modal */}
      <EditGroupModal
        visible={showEditModal}
        group={group}
        onClose={() => setShowEditModal(false)}
        onGroupUpdated={() => {
          setShowEditModal(false);
          onGroupUpdated?.();
        }}
      />

      {/* Member Management Modal */}
      <MemberManagementModal
        visible={showMemberModal}
        member={selectedMember}
        isLastLeader={selectedMember?.role === 'leader' && leaders.length === 1}
        onClose={() => {
          setShowMemberModal(false);
          setSelectedMember(null);
        }}
        onPromoteToLeader={() => selectedMember && handlePromoteToLeader(selectedMember)}
        onDemoteFromLeader={() => selectedMember && handleDemoteFromLeader(selectedMember)}
        onRemoveMember={() => selectedMember && handleRemoveMember(selectedMember)}
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
    backgroundColor: '#ff3b30',
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
  },
});
