import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Text } from '../ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { MembershipNotesSection } from './MembershipNotesSection';
import type { GroupMembershipWithUser } from '../../types/database';
import { getDisplayName, getFullName } from '@/utils/name';
import {
  useGetContactInfo,
  useInitiateContactAction,
} from '../../hooks/useJoinRequests';

interface MemberManagementModalProps {
  visible: boolean;
  member: GroupMembershipWithUser | null;
  isLastLeader: boolean;
  groupId: string;
  leaderId: string;
  onClose: () => void;
  onPromoteToLeader: () => void;
  onDemoteFromLeader: () => void;
  onRemoveMember: () => void;
  loading: boolean;
}

// Helper function to ensure phone number has + prefix
const formatPhoneNumber = (phone: string): string => {
  return phone.startsWith('+') ? phone : `+${phone}`;
};

export const MemberManagementModal: React.FC<MemberManagementModalProps> = ({
  visible,
  member,
  isLastLeader,
  groupId,
  leaderId,
  onClose,
  onPromoteToLeader,
  onDemoteFromLeader,
  onRemoveMember,
  loading,
}) => {
  const [showContactInfo, setShowContactInfo] = useState(false);

  // All hooks must be called before any conditional returns
  const { data: contactInfo } = useGetContactInfo(
    showContactInfo && member?.id ? member.id : undefined,
    leaderId
  );
  const initiateContactMutation = useInitiateContactAction();

  if (!member) return null;

  const isLeader = member.role === 'leader';
  const joinDate = new Date(member.joined_at).toLocaleDateString();
  const fullName = getFullName(member.user);
  const shortName = getDisplayName(member.user, { fallback: 'full' });

  const handleContactPress = async (type: 'phone' | 'email', value: string) => {
    try {
      const actionType = type === 'phone' ? 'call' : 'email';
      await initiateContactMutation.mutateAsync({
        requestId: member.id,
        leaderId,
        actionType,
        contactValue: value,
      });

      if (type === 'phone') {
        const url = `tel:${formatPhoneNumber(value)}`;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Unable to make phone calls on this device');
        }
      } else if (type === 'email') {
        const url = `mailto:${value}`;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Unable to open email on this device');
        }
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to initiate contact'
      );
    }
  };

  return (
    <Modal isVisible={visible} onClose={onClose} title="Manage Member">
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {/* Member Info */}
          <View style={styles.memberInfo}>
            <Avatar
              size={60}
              imageUrl={member.user?.avatar_url}
              name={fullName || 'Unknown'}
            />
            <View style={styles.memberDetails}>
              <Text style={styles.memberName}>
                {shortName || fullName || 'Unknown'}
              </Text>
              <View style={styles.roleContainer}>
                <Ionicons
                  name={isLeader ? 'star' : 'person'}
                  size={16}
                  color={isLeader ? '#f57c00' : '#666'}
                />
                <Text
                  style={[styles.memberRole, isLeader && styles.leaderRole]}
                >
                  {isLeader ? 'Leader' : 'Member'}
                </Text>
              </View>
              <Text style={styles.joinDate}>Joined {joinDate}</Text>
            </View>
          </View>

          {/* Contact Section */}
          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>Contact details</Text>
            <TouchableOpacity
              onPress={() => setShowContactInfo(!showContactInfo)}
              style={styles.contactToggle}
            >
              <Text style={styles.contactToggleText}>
                {showContactInfo ? 'Hide contact info' : 'Show contact info'}
              </Text>
            </TouchableOpacity>
          </View>

          {showContactInfo && contactInfo && (
            <View style={styles.contactInfo}>
              {contactInfo.email && (
                <View style={styles.contactItem}>
                  <TouchableOpacity
                    onPress={() =>
                      contactInfo.email &&
                      handleContactPress('email', contactInfo.email)
                    }
                    style={styles.contactMain}
                    disabled={initiateContactMutation.isPending}
                  >
                    <Ionicons name="mail-outline" size={20} color="#007AFF" />
                    <Text style={styles.contactValue}>{contactInfo.email}</Text>
                  </TouchableOpacity>
                </View>
              )}
              {contactInfo.phone_number && (
                <View style={styles.contactItem}>
                  <TouchableOpacity
                    onPress={() =>
                      contactInfo.phone_number &&
                      handleContactPress('phone', contactInfo.phone_number)
                    }
                    style={styles.contactMain}
                    disabled={initiateContactMutation.isPending}
                  >
                    <Ionicons name="call-outline" size={20} color="#007AFF" />
                    <Text style={styles.contactValue}>
                      {contactInfo.phone_number}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Notes Section */}
          <View style={styles.notesContainer}>
            <MembershipNotesSection
              membershipId={member.id}
              groupId={groupId}
              userId={member.user_id}
              leaderId={leaderId}
            />
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
                    <Ionicons
                      name="warning-outline"
                      size={16}
                      color="#ff9800"
                    />
                    <Text style={styles.warningText}>
                      Cannot demote the last leader. Promote another member
                      first.
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
      </ScrollView>

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
  scrollView: {
    maxHeight: 600,
  },
  container: {
    padding: 16,
  },
  notesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  contactSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  badge: {
    alignSelf: 'flex-start',
  },
  contactToggle: {
    paddingVertical: 8,
  },
  contactToggleText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  noContactText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  contactInfo: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contactItem: {
    marginBottom: 12,
  },
  contactMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contactValue: {
    marginLeft: 12,
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
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
