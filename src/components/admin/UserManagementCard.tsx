import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  AccessibilityHelpers,
  AdminAccessibilityLabels,
} from '@/utils/accessibility';
import type { UserWithGroupStatus } from '@/services/admin';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { getDisplayName, getFullName } from '@/utils/name';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/services/supabase';
import { adminServiceWrapper } from '@/services/adminServiceWrapper';
import { useQueryClient } from '@tanstack/react-query';

interface UserManagementCardProps {
  user: UserWithGroupStatus;
  onPress?: () => void;
}

export function UserManagementCard({ user, onPress }: UserManagementCardProps) {
  const queryClient = useQueryClient();
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [contactInfo, setContactInfo] = useState<{
    email?: string;
    phone?: string;
  } | null>(null);
  const [contactLoaded, setContactLoaded] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  const formatPhoneNumber = (phone: string): string => {
    return phone.startsWith('+') ? phone : `+${phone}`;
  };

  const formatPhoneForWhatsApp = (phone: string): string => {
    return phone.replace(/[^0-9]/g, '');
  };

  const handleContactPress = async (type: 'email' | 'phone', value: string) => {
    const url = type === 'email' ? `mailto:${value}` : `tel:${value}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Action unavailable',
        'Would you like to copy this contact info?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Copy',
            onPress: async () => {
              await Clipboard.setStringAsync(value);
              Alert.alert('Copied', 'Contact info copied to clipboard');
            },
          },
        ]
      );
    }
  };

  const handlePhoneOption = async (
    option: 'whatsapp' | 'sms' | 'call',
    phone: string
  ) => {
    const url =
      option === 'whatsapp'
        ? `whatsapp://send?phone=${formatPhoneForWhatsApp(phone)}`
        : option === 'sms'
        ? `sms:${formatPhoneNumber(phone)}`
        : `tel:${formatPhoneNumber(phone)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Action unavailable',
        'Would you like to copy this contact info?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Copy',
            onPress: async () => {
              await Clipboard.setStringAsync(phone);
              Alert.alert('Copied', 'Contact info copied to clipboard');
            },
          },
        ]
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

  const loadContactInfo = async () => {
    if (contactLoaded || contactLoading) return;
    setContactLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        'get_user_contact_admin',
        {
          target_user_id: user.id,
        }
      );
      if (error) {
        throw error;
      }
      setContactInfo(data ?? null);
      setContactLoaded(true); // Only set to true on successful fetch
    } catch (error) {
      console.error('Failed to load contact info:', error);
      Alert.alert(
        'Unable to load contact info',
        'Please try again later or contact support.'
      );
      // Don't set contactLoaded to true on error, allowing retry
    } finally {
      setContactLoading(false);
    }
  };

  const toggleContactInfo = () => {
    const next = !showContactInfo;
    setShowContactInfo(next);
    if (next) {
      loadContactInfo();
    }
  };

  const handleMarkContacted = async () => {
    try {
      const result = await adminServiceWrapper.updateUserGroupHelpStatus(
        user.id,
        {
          cannot_find_group_contacted_at: new Date().toISOString(),
        },
        { context: { action: 'markContacted', userId: user.id } }
      );

      if (result.error) throw result.error;

      queryClient.invalidateQueries({ queryKey: ['admin', 'church-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'church-summary'] });

      Alert.alert('Success', 'User marked as contacted');
    } catch (error) {
      console.error('Failed to mark user as contacted:', error);
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const handleMarkResolved = async () => {
    try {
      const result = await adminServiceWrapper.updateUserGroupHelpStatus(
        user.id,
        {
          cannot_find_group: false,
          cannot_find_group_resolved_at: new Date().toISOString(),
        },
        { context: { action: 'markResolved', userId: user.id } }
      );

      if (result.error) throw result.error;

      queryClient.invalidateQueries({ queryKey: ['admin', 'church-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'church-summary'] });

      Alert.alert('Success', 'User marked as resolved');
    } catch (error) {
      console.error('Failed to mark user as resolved:', error);
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const getConnectionStatusText = () => {
    return user.is_connected ? 'Connected' : 'Unconnected';
  };

  const fullName = getFullName(user);
  const displayName = getDisplayName(user) || fullName || 'Member';

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.7}
        {...AccessibilityHelpers.createNavigationProps(
          AdminAccessibilityLabels.userConnectionStatus(
            displayName,
            user.is_connected,
            user.group_count
          ),
          'Double tap to view user details'
        )}
      >
        <View style={styles.header}>
          <Avatar
            size={50}
            imageUrl={user.avatar_url}
            name={fullName || displayName}
            accessibilityLabel={`Profile picture for ${displayName}`}
          />
          <View style={styles.userInfo}>
            <Text
              style={styles.userName}
              accessibilityRole="header"
              accessibilityLevel={3}
            >
              {displayName}
            </Text>
            {user.newcomer && (
              <Badge
                variant="warning"
                size="small"
                style={styles.newcomerBadge}
                accessibilityLabel="Newcomer"
              >
                Newcomer
              </Badge>
            )}
            {user.cannot_find_group && (
              <Badge
                variant="error"
                size="small"
                style={styles.needsHelpBadge}
                accessibilityLabel="Needs group help"
              >
                Needs Help
              </Badge>
            )}
            <Text
              style={styles.userEmail}
              accessibilityLabel={`Email: ${user.email}`}
            >
              {user.email}
            </Text>
            <View
              style={styles.statusContainer}
              accessibilityRole="group"
              accessibilityLabel={AdminAccessibilityLabels.userConnectionStatus(
                displayName,
                user.is_connected,
                user.group_count
              )}
            >
              <Badge
                variant={user.is_connected ? 'success' : 'warning'}
                size="small"
                accessibilityLabel={`Connection status: ${getConnectionStatusText()}`}
              >
                {getConnectionStatusText()}
              </Badge>
              <Text
                style={styles.groupCount}
                accessibilityLabel={`Member of ${user.group_count} ${user.group_count === 1 ? 'group' : 'groups'}`}
              >
                {user.group_count} group{user.group_count !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Admin Actions for Group Help */}
        {user.cannot_find_group && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.contactButton]}
              onPress={handleMarkContacted}
            >
              <Text style={styles.actionButtonText}>Mark Contacted</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.resolveButton]}
              onPress={handleMarkResolved}
            >
              <Text style={styles.actionButtonText}>Mark Resolved</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Member Since:</Text>
            <Text style={styles.detailValue}>
              {new Date(user.created_at).toLocaleDateString()}
            </Text>
          </View>

          {user.cannot_find_group && user.cannot_find_group_requested_at && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Help Requested:</Text>
              <Text style={styles.detailValue}>
                {new Date(user.cannot_find_group_requested_at).toLocaleDateString()}
              </Text>
            </View>
          )}

          {user.cannot_find_group_contacted_at && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Contacted:</Text>
              <Text style={styles.detailValue}>
                {new Date(user.cannot_find_group_contacted_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.contactSection}>
          <View style={styles.contactHeader}>
            <Text style={styles.contactTitle}>Contact Details</Text>
            <TouchableOpacity
              onPress={toggleContactInfo}
              style={styles.contactToggle}
            >
              <Text style={styles.contactToggleText}>
                {showContactInfo ? 'Hide' : 'Show'} contact info
              </Text>
              <Ionicons
                name={showContactInfo ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#007AFF"
              />
            </TouchableOpacity>
          </View>

          {showContactInfo && (
            <View style={styles.contactInfoContainer}>
              {contactLoading ? (
                <View style={styles.contactLoading}>
                  <LoadingSpinner size="small" />
                  <Text style={styles.contactLoadingText}>
                    Loading contact info...
                  </Text>
                </View>
              ) : (
                <>
                  {contactInfo?.email && (
                    <View style={styles.contactItem}>
                      <TouchableOpacity
                        style={styles.contactMain}
                          onPress={() =>
                            handleContactPress('email', contactInfo.email!)
                          }
                      >
                        <Text style={styles.contactLabel}>Email</Text>
                        <Text style={styles.contactValue}>
                          {contactInfo.email}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.copyButton}
                        onPress={async () => {
                            await Clipboard.setStringAsync(
                              contactInfo.email!
                            );
                          Alert.alert('Copied', 'Email copied to clipboard');
                        }}
                      >
                        <Ionicons name="copy-outline" size={18} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {contactInfo?.phone && (
                    <View style={styles.contactItem}>
                      <TouchableOpacity
                        style={styles.contactMain}
                        onPress={() => handlePhonePress(contactInfo.phone!)}
                      >
                        <Text style={styles.contactLabel}>Phone</Text>
                        <Text style={styles.contactValue}>
                          {contactInfo.phone}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.copyButton}
                        onPress={async () => {
                            await Clipboard.setStringAsync(
                              contactInfo.phone!
                            );
                          Alert.alert('Copied', 'Phone number copied to clipboard');
                        }}
                      >
                        <Ionicons name="copy-outline" size={18} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {!contactInfo?.email &&
                    !contactInfo?.phone &&
                    contactLoaded && (
                    <Text style={styles.noContactText}>
                      Contact information not available.
                    </Text>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newcomerBadge: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  needsHelpBadge: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    marginLeft: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactButton: {
    backgroundColor: '#3b82f6',
  },
  resolveButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  groupCount: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  details: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
  },
  contactSection: {
    marginTop: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactToggleText: {
    fontSize: 12,
    color: '#007AFF',
  },
  contactInfoContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactMain: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  copyButton: {
    padding: 6,
  },
  contactLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  contactLoadingText: {
    fontSize: 12,
    color: '#6b7280',
  },
  noContactText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
