import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Text } from '../ui/Text';
import type { GroupWithDetails, User } from '../../types/database';
import { OptimizedImage } from '../ui/OptimizedImage';
import { Avatar } from '../ui/Avatar';
import { GroupPlaceholderImage } from '../ui/GroupPlaceholderImage';
import { Ionicons } from '@expo/vector-icons';
import { locationService } from '../../services/location';
import { useTheme } from '../../theme/provider/useTheme';

interface GroupCardProps {
  group: GroupWithDetails;
  onPress: () => void;
  membershipStatus?: 'member' | 'leader' | 'admin' | null;
  friendsCount?: number;
  friendsInGroup?: User[];
  leaders?: User[];
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
  leaders,
  onPressFriends,
  style,
  distanceKm,
}) => {
  const { theme } = useTheme();

  if (!group) return null;
  const formatMeetingTime = (day: string, time: string) => {
    const date = new Date(`2000-01-01T${time}`);
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${day}s at ${formattedTime}`;
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
          {group.image_url ? (
            <OptimizedImage
              source={{ uri: group.image_url }}
              style={styles.image}
              quality="medium"
              lazy={true}
              maxWidth={400}
              maxHeight={120}
              resizeMode="cover"
            />
          ) : (
            <GroupPlaceholderImage style={styles.image} />
          )}

          {/* Bottom Left - Members Indicator */}
          {group.member_count !== undefined && (
            <View style={styles.bottomLeftIndicator}>
              <View style={styles.indicator}>
                <Text style={styles.indicatorText}>{group.member_count}</Text>
                <Ionicons name="person-outline" size={14} color="#fff" />
              </View>
            </View>
          )}

          {/* Top Left - Badges */}
          <View style={styles.topLeftBadges}>
            {group.status === 'pending' && (
              <View style={styles.pendingBadge}>
                <Ionicons name="time-outline" size={16} color="#b45309" />
                <Text style={styles.pendingText}>Pending</Text>
              </View>
            )}
            {group.at_capacity && (
              <View style={styles.fullBadge}>
                <Ionicons name="people" size={14} color="#c2410c" />
                <Text style={styles.fullText}>Full</Text>
              </View>
            )}
          </View>

          {/* Bottom Right - Friend Avatars */}
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
                      name={friend.name || undefined}
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
            {leaders && leaders.length > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="star-outline" size={16} color="#6b7280" />
                <View style={styles.leaderTextAndAvatars}>
                  <Text
                    variant="bodySmall"
                    style={styles.leaderText}
                    numberOfLines={1}
                  >
                    Led by{' '}
                    {leaders
                      .slice(0, 3)
                      .map((leader) => leader.name)
                      .join(', ')}
                    {leaders.length > 3 && ` and ${leaders.length - 3} others`}
                  </Text>
                  <View style={styles.leaderAvatars}>
                    {leaders.slice(0, 3).map((leader, index) => (
                      <View
                        key={leader.id}
                        style={[
                          styles.leaderAvatar,
                          { marginLeft: index > 0 ? -4 : 0 },
                        ]}
                      >
                        <Avatar
                          imageUrl={leader.avatar_url}
                          name={leader.name || undefined}
                          size={20}
                        />
                      </View>
                    ))}
                  </View>
                </View>
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
    right: 8,
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
  bottomLeftIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  indicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  indicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  adminText: {
    color: '#c2185b',
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
  leaderTextAndAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  leaderText: {
    color: '#333',
  },
  leaderAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  leaderAvatar: {
    // No border - just clean avatar circles
  },
  service: {
    color: '#888',
    fontStyle: 'italic',
  },
  topLeftBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    color: '#92400e',
    fontWeight: '600',
    fontSize: 12,
  },
  fullBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  fullText: {
    color: '#c2410c',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
