import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
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
  useUpdateMembershipJourneyStatus,
} from '../../hooks/useJoinRequests';
import type {
  GroupJoinRequestWithUser,
  MembershipJourneyStatus,
} from '../../types/database';

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
  const updateJourneyStatusMutation = useUpdateMembershipJourneyStatus();


  const initialJourneyStatus = useMemo(
    () => (request.journey_status ?? null) as MembershipJourneyStatus | null,
    [request.journey_status]
  );
  const [journeyStatus, setJourneyStatus] =
    useState<MembershipJourneyStatus | null>(initialJourneyStatus);
  const hasContactConsent = request.contact_consent ?? true;
  const { data: contactInfo } = useGetContactInfo(
    showContactInfo && hasContactConsent ? request.id : undefined,
    leaderId
  );
  const isReferral = Boolean(request.referral_id);
  const journeySteps = useMemo(
    () => [
      { value: 1 as MembershipJourneyStatus, label: 'Reached out' },
      { value: 2 as MembershipJourneyStatus, label: 'Spoken to' },
      { value: 3 as MembershipJourneyStatus, label: 'Attended' },
    ],
    []
  );
  const journeyUpdating = updateJourneyStatusMutation.isPending;
  const canActivate = (journeyStatus ?? 0) >= 3 && !journeyUpdating;

  const journeyStageLabel = useMemo(() => {
    if (!journeyStatus || journeyStatus < 1) {
      return 'Waiting for first contact';
    }
    const stage = journeySteps.find((step) => step.value === journeyStatus);
    return stage?.label || 'In progress';
  }, [journeyStatus, journeySteps]);

  useEffect(() => {
    setJourneyStatus(initialJourneyStatus);
  }, [initialJourneyStatus]);

  const handleJourneyStepPress = async (stepValue: MembershipJourneyStatus) => {
    if (journeyUpdating) return;

    let target: MembershipJourneyStatus | null = stepValue;
    if (journeyStatus === stepValue) {
      const fallback = (stepValue - 1) as MembershipJourneyStatus;
      target = fallback >= 1 ? fallback : null;
    }

    try {
      setJourneyStatus(target);
      await updateJourneyStatusMutation.mutateAsync({
        membershipId: request.id,
        leaderId,
        journeyStatus: target,
      });
    } catch (error) {
      setJourneyStatus(initialJourneyStatus);
      Alert.alert(
        'Update Failed',
        error instanceof Error
          ? error.message
          : 'Could not update newcomer progress'
      );
    }
  };

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
    approveRequestMutation.isPending ||
    declineRequestMutation.isPending ||
    journeyUpdating;

  const requestedTimestamp =
    request.joined_at || request.created_at || new Date().toISOString();

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
              Requested {formatDate(requestedTimestamp)}
            </Text>
            <View style={styles.badgeRow}>
              <Badge variant="warning" style={styles.badge}>
                Pending
              </Badge>
              <Badge variant="secondary" style={styles.badge}>
                {isReferral ? 'Referral' : 'Join Request'}
              </Badge>
              {request.user?.newcomer && (
                <Badge variant="success" style={styles.badge}>
                  Newcomer
                </Badge>
              )}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Journey progress</Text>
          <Text style={styles.progressStatus}>
            {journeyUpdating ? 'Updating…' : journeyStageLabel}
          </Text>
        </View>
        <View style={styles.progressSteps}>
          {journeySteps.map((step, index) => {
            const isActive = (journeyStatus ?? 0) >= step.value;
            const isCurrent = journeyStatus === step.value;
            return (
              <React.Fragment key={step.value}>
                <View style={styles.progressStepWrapper}>
                  <TouchableOpacity
                    onPress={() => handleJourneyStepPress(step.value)}
                    style={[
                      styles.progressCircle,
                      isActive && styles.progressCircleActive,
                      journeyUpdating && styles.progressCircleDisabled,
                    ]}
                    disabled={journeyUpdating}
                    accessibilityRole="button"
                    accessibilityLabel={`Mark ${step.label}`}
                  >
                    <Text
                      style={[
                        styles.progressCircleText,
                        isActive && styles.progressCircleTextActive,
                      ]}
                    >
                      {step.value}
                    </Text>
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.progressStepLabel,
                      isCurrent && styles.progressStepLabelActive,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
                {index < journeySteps.length - 1 && (
                  <View
                    style={[
                      styles.progressLine,
                      (journeyStatus ?? 0) > step.value &&
                        styles.progressLineActive,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {request.message && (
        <View style={styles.messageSection}>
          <Text style={styles.messageLabel}>Message</Text>
          <Text style={styles.messageText}>{request.message}</Text>
        </View>
      )}

      {request.referral?.note && (
        <View style={styles.referralNote}>
          <Text style={styles.referralNoteLabel}>Referral note</Text>
          <Text style={styles.referralNoteText}>{request.referral.note}</Text>
        </View>
      )}

      <View style={styles.contactSection}>
        <View style={styles.contactHeader}>
          <Text style={styles.contactTitle}>Contact details</Text>
          <Badge
            variant={hasContactConsent ? 'success' : 'secondary'}
            style={styles.badge}
          >
            {hasContactConsent ? 'Contact allowed' : 'No consent'}
          </Badge>
        </View>
        {hasContactConsent ? (
          <TouchableOpacity
            onPress={() => setShowContactInfo(!showContactInfo)}
            style={styles.contactToggle}
          >
            <Text style={styles.contactToggleText}>
              {showContactInfo ? 'Hide contact info' : 'Show contact info'}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.noContactText}>
            This person has not yet shared their contact details with leaders.
          </Text>
        )}
      </View>

      {showContactInfo && contactInfo && (
        <View style={styles.contactInfo}>
          {contactInfo.email && (
            <TouchableOpacity
              onPress={() => handleContactPress('email', contactInfo.email)}
              style={styles.contactItem}
              disabled={initiateContactMutation.isPending}
            >
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>{contactInfo.email}</Text>
            </TouchableOpacity>
          )}
          {contactInfo.phone && (
            <TouchableOpacity
              onPress={() => handleContactPress('phone', contactInfo.phone)}
              style={styles.contactItem}
              disabled={initiateContactMutation.isPending}
            >
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>{contactInfo.phone}</Text>
            </TouchableOpacity>
          )}
          {!contactInfo.email && !contactInfo.phone && (
            <Text style={styles.noContactText}>
              Contact information is not available right now.
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
          title="Activate"
          onPress={handleApprove}
          loading={approveRequestMutation.isPending}
          disabled={!canActivate || isProcessing}
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
    alignItems: 'flex-start',
    marginBottom: 12,
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
    fontWeight: '600',
    color: '#111827',
  },
  requestDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  badge: {
    marginRight: 8,
    marginBottom: 4,
  },
  progressSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f3ff',
    borderRadius: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressStatus: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressStepWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  progressCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  progressCircleActive: {
    borderColor: '#ec4899',
    backgroundColor: '#fce7f3',
  },
  progressCircleDisabled: {
    opacity: 0.6,
  },
  progressCircleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  progressCircleTextActive: {
    color: '#ec4899',
  },
  progressStepLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
    textAlign: 'center',
  },
  progressStepLabelActive: {
    color: '#111827',
    fontWeight: '600',
  },
  progressLine: {
    height: 2,
    backgroundColor: '#e5e7eb',
    flex: 1,
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: '#ec4899',
  },
  messageSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
  },
  messageLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  messageText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  referralNote: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff7ed',
    borderRadius: 10,
  },
  referralNoteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b45309',
    marginBottom: 6,
  },
  referralNoteText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  contactSection: {
    marginBottom: 12,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  contactToggle: {
    marginTop: 8,
  },
  contactToggleText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  contactInfo: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
  },
  contactItem: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dbeafe',
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  contactValue: {
    fontSize: 14,
    color: '#2563eb',
    marginTop: 2,
  },
  noContactText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'left',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  declineButton: {
    flex: 1,
    marginRight: 8,
  },
  approveButton: {
    flex: 1,
    marginLeft: 8,
  },
});
