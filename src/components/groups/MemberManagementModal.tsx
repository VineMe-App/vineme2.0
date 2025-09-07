import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import type { GroupMembershipWithUser } from '../../types/database';

interface MemberManagementModalProps {
  visible: boolean;
  member: GroupMembershipWithUser | null;
  isLastLeader: boolean;
  onClose: () => void;
  onPromoteToLeader: () => void;
  onDemoteFromLeader: () => void;
  onRemoveMember: () => void;
  loading: boolean;
}

export const MemberManagementModal: React.FC<MemberManagementModalProps> = ({
  visible,
  member,
  isLastLeader,
  onClose,
  onPromoteToLeader,
  onDemoteFromLeader,
  onRemoveMember,
  loading,
}) => {
  if (!member) return null;

  const isLeader = member.role === 'leader';
  const joinDate = new Date(member.joined_at).toLocaleDateString();

  return (
    <Modal visible={visible} onClose={onClose} title="Manage Member">
      <View style={styles.container}>
        {/* Member Info */}
        <View style={styles.memberInfo}>
          <Avatar
            size={60}
            imageUrl={member.user?.avatar_url}
            name={member.user?.name || 'Unknown'}
          />
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>
              {member.user?.name || 'Unknown'}
            </Text>
            <View style={styles.roleContainer}>
              <Ionicons
                name={isLeader ? 'star' : 'person'}
                size={16}
                color={isLeader ? '#f57c00' : '#666'}
              />
              <Text style={[styles.memberRole, isLeader && styles.leaderRole]}>
                {isLeader ? 'Leader' : 'Member'}
              </Text>
            </View>
            <Text style={styles.joinDate}>Joined {joinDate}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {isLeader ? (
            <>
              <Button
                title="Demote to Member"
                onPress={onDemoteFromLeader}
                variant="secondary"
                loading={loading}
                disabled={loading || isLastLeader}
                style={styles.actionButton}
                icon={<Ionicons name="arrow-down" size={16} color="#666" />}
              />
              {isLastLeader && (
                <View style={styles.warningContainer}>
                  <Ionicons name="warning-outline" size={16} color="#ff9800" />
                  <Text style={styles.warningText}>
                    Cannot demote the last leader. Promote another member first.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Button
              title="Promote to Leader"
              onPress={onPromoteToLeader}
              variant="primary"
              loading={loading}
              disabled={loading}
              style={styles.actionButton}
              icon={<Ionicons name="arrow-up" size={16} color="#fff" />}
            />
          )}

          <Button
            title="Remove from Group"
            onPress={onRemoveMember}
            variant="danger"
            loading={loading}
            disabled={loading || isLastLeader}
            style={styles.actionButton}
            icon={<Ionicons name="person-remove" size={16} color="#fff" />}
          />

          {isLastLeader && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning-outline" size={16} color="#ff9800" />
              <Text style={styles.warningText}>
                Cannot remove the last leader. Promote another member first.
              </Text>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#666"
            />
            <Text style={styles.infoText}>
              {isLeader
                ? 'Leaders can edit group details and manage members.'
                : 'Members can participate in group activities and discussions.'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Close"
          onPress={onClose}
          variant="secondary"
          style={styles.closeButton}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  memberDetails: {
    flex: 1,
    marginLeft: 16,
  },
  memberName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  leaderRole: {
    color: '#f57c00',
  },
  joinDate: {
    fontSize: 14,
    color: '#999',
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#e65100',
    marginLeft: 8,
    lineHeight: 20,
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  closeButton: {
    width: '100%',
  },
});
