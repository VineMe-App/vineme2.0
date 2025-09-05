import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Text } from '../ui/Text';
import type { GroupWithDetails } from '../../types/database';
import { OptimizedImage } from '../ui/OptimizedImage';
import { Ionicons } from '@expo/vector-icons';
import { locationService } from '../../services/location';

interface GroupCardProps {
  group: GroupWithDetails;
  onPress: () => void;
  membershipStatus?: 'member' | 'leader' | 'admin' | null;
  friendsCount?: number;
  onPressFriends?: () => void;
  style?: ViewStyle;
  distanceKm?: number;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  onPress,
  membershipStatus,
  friendsCount,
  onPressFriends,
  style,
  distanceKm,
}) => {
  if (!group) return null;
  const formatMeetingTime = (day: string, time: string) => {
    return `${day}s at ${time}`;
  };

  const formatLocation = (location: any) => {
    const parsed = locationService.parseGroupLocation(location);
    if (parsed.address && parsed.address.trim().length > 0)
      return parsed.address;
    if (typeof location === 'string' && location.trim().length > 0)
      return location;
    if (location?.room) return `Room ${location.room}`;
    return 'Location TBD';
  };

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {group.image_url && (
          <OptimizedImage
            source={{ uri: group.image_url }}
            style={styles.image}
            quality="medium"
            lazy={true}
            maxWidth={400}
            maxHeight={120}
            resizeMode="cover"
          />
        )}

        <View style={styles.info}>
          <View style={styles.header}>
            <Text variant="h5" style={styles.title} numberOfLines={2} ellipsizeMode="tail">
              {group.title}
            </Text>
            {membershipStatus && (
              <View
                style={[styles.statusBadge, styles[`${membershipStatus}Badge`]]}
              >
                <Text
                  variant="caption"
                  weight="semiBold"
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

          <Text
            variant="body"
            color="secondary"
            style={styles.description}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {group.description}
          </Text>

          <View style={styles.details}>
            {typeof distanceKm === 'number' && (
              <View style={styles.detailRow}>
                <Ionicons name="navigate-outline" size={16} color="#6b7280" />
                <Text variant="bodySmall" style={styles.detailText} numberOfLines={1}>
                  {distanceKm.toFixed(1)} km away
                </Text>
              </View>
            )}
            {group.meeting_day && group.meeting_time && (
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                <Text variant="bodySmall" style={styles.detailText} numberOfLines={1}>
                  {formatMeetingTime(group.meeting_day, group.meeting_time)}
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color="#6b7280" />
              <Text variant="bodySmall" style={styles.detailText} numberOfLines={1}>
                {formatLocation(group.location)}
              </Text>
            </View>
            {group.member_count !== undefined && (
              <View style={styles.detailRow}>
                <Ionicons name="people-outline" size={16} color="#6b7280" />
                <Text variant="bodySmall" style={styles.detailText} numberOfLines={1}>
                  {group.member_count} member
                  {group.member_count !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            {typeof friendsCount === 'number' && friendsCount > 0 && (
              <TouchableOpacity
                style={[styles.detailRow, styles.friendsPill]}
                onPress={onPressFriends || onPress}
                accessibilityRole="button"
                accessibilityLabel={`View ${friendsCount} friends in this group`}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={16}
                  color="#2563eb"
                />
                <Text
                  variant="bodySmall"
                  weight="semiBold"
                  style={[styles.detailText, styles.friendsText]}
                  numberOfLines={1}
                >
                  {friendsCount} friend{friendsCount !== 1 ? 's' : ''} in this
                  group
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {group.service?.name && (
            <Text variant="caption" color="tertiary" style={styles.service} numberOfLines={1} ellipsizeMode="tail">
              Service: {group.service.name}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
  },
  info: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
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
    // Typography handled by Text component variant
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
    marginBottom: 12,
  },
  details: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailText: {
    color: '#333',
    flex: 1,
  },
  friendsPill: {
    backgroundColor: '#eff6ff',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  friendsText: {
    color: '#1d4ed8',
  },
  service: {
    color: '#888',
    fontStyle: 'italic',
  },
});
