import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Text } from '../ui/Text';
import type { GroupWithDetails, User } from '../../types/database';
import { OptimizedImage } from '../ui/OptimizedImage';
import { Avatar } from '../ui/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { locationService } from '../../services/location';
import { useTheme } from '../../theme/provider/useTheme';

interface GroupCardProps {
  group: GroupWithDetails;
  onPress: () => void;
  membershipStatus?: 'member' | 'leader' | 'admin' | null;
  friendsCount?: number;
  friendsInGroup?: User[];
  onPressFriends?: () => void;
  style?: ViewStyle;
  distanceKm?: number;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  onPress,
  membershipStatus,
  friendsCount,
  friendsInGroup,
  onPressFriends,
  style,
  distanceKm,
}) => {
  const { theme } = useTheme();

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
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface.secondary }, // Faded pink background
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Group Image with Friend Avatars Overlay */}
        <View style={styles.imageContainer}>
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

          {/* Friend Avatars Overlay */}
          {friendsInGroup && friendsInGroup.length > 0 && (
            <View style={styles.friendsOverlay}>
              <View style={styles.friendAvatars}>
                {friendsInGroup.map((friend, index) => (
                  <View
                    key={friend.id}
                    style={[
                      styles.friendAvatar,
                      { marginLeft: index > 0 ? -8 : 0 },
                    ]}
                  >
                    <Avatar
                      imageUrl={friend.avatar_url}
                      name={friend.name}
                      size={24}
                    />
                  </View>
                ))}
              </View>
              <Text variant="caption" style={styles.friendsCount}>
                {friendsCount} friend{friendsCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          {/* Title and Status */}
          <View style={styles.header}>
            <Text
              variant="h6"
              style={styles.title}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
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
                <Text
                  variant="bodySmall"
                  style={styles.detailText}
                  numberOfLines={1}
                >
                  {distanceKm.toFixed(1)} km away
                </Text>
              </View>
            )}
            {group.meeting_day && group.meeting_time && (
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                <Text
                  variant="bodySmall"
                  style={styles.detailText}
                  numberOfLines={1}
                >
                  {formatMeetingTime(group.meeting_day, group.meeting_time)}
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color="#6b7280" />
              <Text
                variant="bodySmall"
                style={styles.detailText}
                numberOfLines={1}
              >
                {formatLocation(group.location)}
              </Text>
            </View>
            {group.member_count !== undefined && (
              <View style={styles.detailRow}>
                <Ionicons name="people-outline" size={16} color="#6b7280" />
                <Text
                  variant="bodySmall"
                  style={styles.detailText}
                  numberOfLines={1}
                >
                  {group.member_count} member
                  {group.member_count !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {group.service?.name && (
            <Text
              variant="caption"
              color="tertiary"
              style={styles.service}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
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
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    // Background color now set dynamically with theme
  },
  content: {
    padding: 16,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  friendsOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  friendAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatar: {
    // No border - just clean avatar circles
  },
  friendsCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
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
  service: {
    color: '#888',
    fontStyle: 'italic',
  },
});
