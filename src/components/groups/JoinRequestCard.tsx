import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  ActionSheetIOS,
} from 'react-native';
// expo-clipboard is optional in dev client; gate usage to avoid native module errors
// Lazy load to prevent module initialization errors at load time
let Clipboard: typeof import('expo-clipboard') | null | undefined = undefined;
const getClipboard = (): typeof import('expo-clipboard') | null => {
  if (Clipboard !== undefined) return Clipboard;
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const clipboardModule = require('expo-clipboard');
    Clipboard = clipboardModule;
    return Clipboard;
  } catch (error) {
    // Native module not available - this is expected in some environments
    Clipboard = null;
    if (__DEV__) {
      console.log('[JoinRequestCard] expo-clipboard not available, clipboard functionality disabled');
    }
    return null;
  }
};
import { Text } from '../ui/Text';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Ionicons } from '@expo/vector-icons';
import { MembershipNotesSection } from './MembershipNotesSection';
import { ArchiveRequestModal } from './ArchiveRequestModal';
import {
  useApproveJoinRequest,
  useArchiveJoinRequest,
  useGetContactInfo,
  useInitiateContactAction,
  useUpdateMembershipJourneyStatus,
} from '../../hooks/useJoinRequests';
import type {
  GroupJoinRequestWithUser,
  MembershipJourneyStatus,
} from '../../types/database';
import { getDisplayName, getFullName } from '@/utils/name';

interface JoinRequestCardProps {
  request: GroupJoinRequestWithUser;
  leaderId: string;
  onRequestProcessed?: () => void;
}

// Helper function to ensure phone number has + prefix
const formatPhoneNumber = (phone: string): string => {
  return phone.startsWith('+') ? phone : `+${phone}`;
};

const formatPhoneForWhatsApp = (phone: string): string => {
  return phone.replace(/[^0-9]/g, '');
};

export const JoinRequestCard: React.FC<JoinRequestCardProps> = ({
  request,
  leaderId,
  onRequestProcessed,
}) => {
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const approveRequestMutation = useApproveJoinRequest();
  const archiveRequestMutation = useArchiveJoinRequest();
  const initiateContactMutation = useInitiateContactAction();
  const updateJourneyStatusMutation = useUpdateMembershipJourneyStatus();

  const initialJourneyStatus = useMemo(
    () => (request.journey_status ?? null) as MembershipJourneyStatus | null,
    [request.journey_status]
  );
  const [journeyStatus, setJourneyStatus] =
    useState<MembershipJourneyStatus | null>(initialJourneyStatus);
  const { data: contactInfo } = useGetContactInfo(
    showContactInfo ? request.id : undefined,
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
  const requesterFullName = getFullName(request.user);
  const requesterShortName = getDisplayName(request.user, {
    lastInitial: true,
    fallback: 'full',
  });
  const requesterFriendlyName =
    requesterShortName || requesterFullName || 'this person';

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
      `Are you sure you want to approve ${requesterFriendlyName}'s request to join the group?`,
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
                `${requesterFriendlyName} has been added to the group!`
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

  const handleArchive = () => {
    setShowArchiveModal(true);
  };

  const handleConfirmArchive = async (reason: string, notes?: string) => {
    try {
      await archiveRequestMutation.mutateAsync({
        requestId: request.id,
        declinerId: leaderId,
        groupId: request.group_id,
        reason: reason,
        notes: notes,
      });

      setShowArchiveModal(false);
      Alert.alert('Request Archived', 'The join request has been archived.');
      onRequestProcessed?.();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to archive request'
      );
    }
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
      let url: string;
      let fallbackMessage: string;

      if (type === 'email') {
        url = `mailto:${value}`;
        fallbackMessage =
          'No email app is configured on this device. You can copy the email address and use your preferred email app.';
      } else {
        // For phone, use tel: scheme
        url = `tel:${value}`;
        fallbackMessage =
          'No phone app is configured on this device. You can copy the phone number and use your preferred calling app.';
      }

      try {
        // Add debugging information
        console.log(`Attempting to open ${type} URL:`, url);
        console.log('Platform:', Platform.OS);

        // Try to open the URL directly
        await Linking.openURL(url);
        console.log(`Successfully opened ${type} app`);
      } catch (linkingError) {
        console.log('Linking error:', linkingError);
        console.log('URL that failed:', url);

        // If direct opening fails, show a more helpful error with options
        const buttons = [
          { text: 'Cancel', style: 'cancel' as const },
          {
            text: 'Copy to Clipboard',
            onPress: async () => {
              const clipboard = getClipboard();
              if (!clipboard) {
                Alert.alert(
                  'Not Available',
                  'Clipboard functionality is not available on this device.'
                );
                return;
              }
              try {
                await clipboard.setStringAsync(value);
                Alert.alert(
                  'Copied',
                  `${type === 'email' ? 'Email' : 'Phone number'} copied to clipboard`
                );
              } catch (clipboardError) {
                console.error('Clipboard error:', clipboardError);
                Alert.alert('Error', 'Failed to copy to clipboard');
              }
            },
          },
        ];

        // Add WhatsApp option for phone numbers
        if (type === 'phone') {
          buttons.push({
            text: 'Try WhatsApp',
            onPress: async () => {
              try {
                // Remove any non-digits and format for WhatsApp
                const cleanPhone = value.replace(/\D/g, '');
                const whatsappUrl = `whatsapp://send?phone=${cleanPhone}`;
                console.log('Attempting WhatsApp URL:', whatsappUrl);
                await Linking.openURL(whatsappUrl);
              } catch (whatsappError) {
                console.log('WhatsApp error:', whatsappError);
                Alert.alert(
                  'Error',
                  'WhatsApp is not installed or cannot be opened'
                );
              }
            },
          });
        }

        Alert.alert('Cannot Open App', fallbackMessage, buttons);
      }
    } catch (error) {
      console.error('Contact action error:', error);
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : `Failed to ${type === 'email' ? 'email' : 'call'} user`
      );
    }
  };

  const handlePhoneOption = async (
    option: 'whatsapp' | 'sms' | 'call',
    phone: string
  ) => {
    try {
      await initiateContactMutation.mutateAsync({
        requestId: request.id,
        leaderId,
        actionType: option === 'call' ? 'call' : 'message',
        contactValue: phone,
      });

      const url =
        option === 'whatsapp'
          ? `whatsapp://send?phone=${formatPhoneForWhatsApp(phone)}`
          : option === 'sms'
          ? `sms:${formatPhoneNumber(phone)}`
          : `tel:${formatPhoneNumber(phone)}`;

      try {
        await Linking.openURL(url);
      } catch {
        const clipboard = getClipboard();
        if (!clipboard) {
          Alert.alert(
            'Not Available',
            'Clipboard functionality is not available on this device.'
          );
          return;
        }
        Alert.alert(
          'Action unavailable',
          'Would you like to copy this contact info?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Copy',
              onPress: async () => {
                await clipboard.setStringAsync(phone);
                Alert.alert('Copied', 'Phone number copied to clipboard');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Contact action error:', error);
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to contact user'
      );
    }
  };

  const handlePhonePress = (phone: string) => {
    const options = ['WhatsApp', 'SMS', 'Call', 'Cancel'];
    const cancelButtonIndex = 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handlePhoneOption('whatsapp', phone);
          } else if (buttonIndex === 1) {
            handlePhoneOption('sms', phone);
          } else if (buttonIndex === 2) {
            handlePhoneOption('call', phone);
          }
        }
      );
      return;
    }

    Alert.alert('Contact via', 'Choose an option', [
      { text: 'WhatsApp', onPress: () => handlePhoneOption('whatsapp', phone) },
      { text: 'SMS', onPress: () => handlePhoneOption('sms', phone) },
      { text: 'Call', onPress: () => handlePhoneOption('call', phone) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const isProcessing =
    approveRequestMutation.isPending ||
    archiveRequestMutation.isPending ||
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
            name={requesterFullName || 'Unknown'}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {requesterShortName || requesterFullName || 'Unknown User'}
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
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{contactInfo.email}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!contactInfo.email) return;
                  const clipboard = getClipboard();
                  if (!clipboard) {
                    Alert.alert(
                      'Not Available',
                      'Clipboard functionality is not available on this device.'
                    );
                    return;
                  }
                  try {
                    await clipboard.setStringAsync(contactInfo.email);
                    Alert.alert('Copied', 'Email copied to clipboard');
                  } catch (error) {
                    console.error('Copy error:', error);
                    Alert.alert('Error', 'Failed to copy email');
                  }
                }}
                style={styles.copyButton}
                disabled={initiateContactMutation.isPending}
              >
                <Ionicons name="copy-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
          )}
          {contactInfo.phone && (
            <View style={styles.contactItem}>
              <TouchableOpacity
                onPress={() => {
                  if (!contactInfo.phone) return;
                  handlePhonePress(contactInfo.phone);
                }}
                style={styles.contactMain}
                disabled={initiateContactMutation.isPending}
              >
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>
                  {formatPhoneNumber(contactInfo.phone)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!contactInfo.phone) return;
                  const clipboard = getClipboard();
                  if (!clipboard) {
                    Alert.alert(
                      'Not Available',
                      'Clipboard functionality is not available on this device.'
                    );
                    return;
                  }
                  try {
                    const formattedPhone = formatPhoneNumber(contactInfo.phone);
                    await clipboard.setStringAsync(formattedPhone);
                    Alert.alert('Copied', 'Phone number copied to clipboard');
                  } catch (error) {
                    console.error('Copy error:', error);
                    Alert.alert('Error', 'Failed to copy phone number');
                  }
                }}
                style={styles.copyButton}
                disabled={initiateContactMutation.isPending}
              >
                <Ionicons name="copy-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
          )}
          {!contactInfo.email && !contactInfo.phone && (
            <Text style={styles.noContactText}>
              Contact information is not available right now.
            </Text>
          )}
        </View>
      )}

      <MembershipNotesSection
        membershipId={request.id}
        groupId={request.group_id}
        userId={request.user_id}
        leaderId={leaderId}
      />

      <View style={styles.actions}>
        <View style={styles.actionButtonWrapper}>
          <Button
            title="Archive"
            onPress={handleArchive}
            variant="secondary"
            size="small"
            disabled={isProcessing}
            style={styles.archiveButton}
          />
        </View>
        <View style={styles.actionButtonWrapper}>
          <Button
            title="Add to group"
            onPress={handleApprove}
            variant="secondary"
            size="small"
            loading={approveRequestMutation.isPending}
            disabled={!canActivate || isProcessing}
            style={styles.approveButton}
          />
        </View>
      </View>

      <ArchiveRequestModal
        visible={showArchiveModal}
        requesterName={requesterFriendlyName}
        onClose={() => setShowArchiveModal(false)}
        onArchive={handleConfirmArchive}
        loading={archiveRequestMutation.isPending}
      />
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
    justifyContent: 'center',
    gap: 16,
  },
  progressStepWrapper: {
    alignItems: 'center',
    minWidth: 60,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dbeafe',
  },
  contactMain: {
    flex: 1,
  },
  copyButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
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
    width: '100%',
    alignItems: 'stretch',
    gap: 6,
    marginTop: 12,
  },
  actionButtonWrapper: {
    flex: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  archiveButton: {
    width: '100%',
    minWidth: 0,
    paddingHorizontal: 8,
  },
  approveButton: {
    width: '100%',
    minWidth: 0,
    paddingHorizontal: 8,
  },
});
