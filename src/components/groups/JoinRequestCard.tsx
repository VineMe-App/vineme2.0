import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Text } from '../ui/Text';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  useApproveJoinRequest,
  useDeclineJoinRequest,
  useGetContactInfo,
  useInitiateContactAction,
} from '../../hooks/useJoinRequests';
import type { GroupJoinRequestWithUser } from '../../types/database';

interface JoinRequestCardProps {
  request: GroupJoinRequestWithUser;
  leaderId: string;
  onRequestProcessed?: () => void;
}

export const JoinRequestCard: React.FC<JoinRequestCardProps> = ({
  request,
  leaderId,
  onRequestProcessed,
}) => {
  const [showContactInfo, setShowContactInfo] = useState(false);

  const approveRequestMutation = useApproveJoinRequest();
  const declineRequestMutation = useDeclineJoinRequest();
  const initiateContactMutation = useInitiateContactAction();

  const { data: contactInfo } = useGetContactInfo(
    showContactInfo && request.contact_consent ? request.id : undefined,
    leaderId
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleApprove = () => {
    Alert.alert(
      'Approve Request',
      `Are you sure you want to approve ${request.user?.name || 'this user'}'s request to join the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await approveRequestMutation.mutateAsync({
                requestId: request.id,
                approverId: leaderId,
                groupId: request.group_id,
              });

              Alert.alert(
                'Request Approved',
                `${request.user?.name || 'The user'} has been added to the group!`
              );

              onRequestProcessed?.();
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'Failed to approve request'
              );
            }
          },
        },
      ]
    );
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Request',
      `Are you sure you want to decline ${request.user?.name || 'this user'}'s request to join the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await declineRequestMutation.mutateAsync({
                requestId: request.id,
                declinerId: leaderId,
                groupId: request.group_id,
              });

              Alert.alert(
                'Request Declined',
                'The join request has been declined.'
              );
              onRequestProcessed?.();
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'Failed to decline request'
              );
            }
          },
        },
      ]
    );
  };

  const handleContactPress = async (type: 'email' | 'phone', value: string) => {
    try {
      // Log the contact action first
      await initiateContactMutation.mutateAsync({
        requestId: request.id,
        leaderId: leaderId,
        actionType: type === 'email' ? 'email' : 'call',
        contactValue: value,
      });

      // Then open the contact app
      const url = type === 'email' ? `mailto:${value}` : `tel:${value}`;

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', `Cannot open ${type} app`);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : `Failed to ${type === 'email' ? 'email' : 'call'} user`
      );
    }
  };

  const isProcessing =
    approveRequestMutation.isPending || declineRequestMutation.isPending;

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Avatar
            size={48}
            imageUrl={request.user?.avatar_url}
            name={request.user?.name || 'Unknown'}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {request.user?.name || 'Unknown User'}
            </Text>
            <Text style={styles.requestDate}>
              Requested {formatDate(request.created_at)}
            </Text>
          </View>
        </View>

        <Badge text="Pending" variant="warning" style={styles.statusBadge} />
      </View>

      {request.message && (
        <View style={styles.messageSection}>
          <Text style={styles.messageLabel}>Message:</Text>
          <Text style={styles.messageText}>{request.message}</Text>
        </View>
      )}

      <View style={styles.consentSection}>
        <View style={styles.consentRow}>
          <Text style={styles.consentLabel}>Contact sharing:</Text>
          <Badge
            text={request.contact_consent ? 'Consented' : 'Not consented'}
            variant={request.contact_consent ? 'success' : 'secondary'}
          />
        </View>

        {request.contact_consent && (
          <TouchableOpacity
            onPress={() => setShowContactInfo(!showContactInfo)}
            style={styles.contactToggle}
          >
            <Text style={styles.contactToggleText}>
              {showContactInfo ? 'Hide' : 'Show'} contact info
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showContactInfo && contactInfo && (
        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle}>Contact Information:</Text>
          <View style={styles.contactDetails}>
            {contactInfo.email && (
              <TouchableOpacity
                onPress={() => handleContactPress('email', contactInfo.email!)}
                style={styles.contactItem}
                disabled={initiateContactMutation.isPending}
              >
                <Text style={styles.contactLabel}>Email:</Text>
                <Text style={styles.contactValue}>{contactInfo.email}</Text>
              </TouchableOpacity>
            )}

            {contactInfo.phone && (
              <TouchableOpacity
                onPress={() => handleContactPress('phone', contactInfo.phone)}
                style={styles.contactItem}
                disabled={initiateContactMutation.isPending}
              >
                <Text style={styles.contactLabel}>Phone:</Text>
                <Text style={styles.contactValue}>{contactInfo.phone}</Text>
              </TouchableOpacity>
            )}
          </View>

          {!contactInfo.email && !contactInfo.phone && (
            <Text style={styles.noContactText}>
              Contact information not available due to user privacy settings.
            </Text>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <Button
          title="Decline"
          onPress={handleDecline}
          variant="secondary"
          disabled={isProcessing}
          style={styles.declineButton}
        />
        <Button
          title="Approve"
          onPress={handleApprove}
          loading={approveRequestMutation.isPending}
          disabled={isProcessing}
          style={styles.approveButton}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    marginLeft: 12,
  },
  messageSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  consentSection: {
    marginBottom: 16,
  },
  consentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  consentLabel: {
    fontSize: 14,
    color: '#666',
  },
  contactToggle: {
    alignSelf: 'flex-start',
  },
  contactToggleText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  contactInfo: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  contactDetails: {
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  contactValue: {
    fontSize: 14,
    color: '#007AFF',
    flex: 1,
    textDecorationLine: 'underline',
  },
  noContactText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
  },
  approveButton: {
    flex: 1,
  },
});
