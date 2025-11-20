import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
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

interface UserManagementCardProps {
  user: UserWithGroupStatus;
  onPress?: () => void;
}

export function UserManagementCard({ user, onPress }: UserManagementCardProps) {
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [contactInfo, setContactInfo] = useState<{
    email?: string;
    phone?: string;
  } | null>(null);
  const [contactLoaded, setContactLoaded] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

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
      setContactLoaded(true);
    } catch (error) {
      console.error('Failed to load contact info:', error);
      Alert.alert(
        'Unable to load contact info',
        'Please try again later or contact support.'
      );
      setContactLoaded(true);
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

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Member Since:</Text>
            <Text style={styles.detailValue}>
              {new Date(user.created_at).toLocaleDateString()}
            </Text>
          </View>

          {user.last_activity && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Last Active:</Text>
              <Text style={styles.detailValue}>
                {new Date(user.last_activity).toLocaleDateString()}
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
                          onPress={() =>
                            handleContactPress('phone', contactInfo.phone!)
                          }
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
