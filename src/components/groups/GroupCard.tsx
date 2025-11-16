import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Animated,
  Easing,
} from 'react-native';
import { Text } from '../ui/Text';
import type { GroupWithDetails, User } from '../../types/database';
import { OptimizedImage } from '../ui/OptimizedImage';
import { Avatar } from '../ui/Avatar';
import { GroupPlaceholderImage } from '../ui/GroupPlaceholderImage';
import { Ionicons } from '@expo/vector-icons';
import { locationService } from '../../services/location';
import { useTheme } from '../../theme/provider/useTheme';

interface GroupCardProps {
  group: GroupWithDetails | null | undefined;
  onPress?: () => void;
  membershipStatus?: 'member' | 'leader' | 'admin' | null;
  friendsCount?: number;
  friendsInGroup?: User[];
  leaders?: User[];
  onPressFriends?: () => void;
  style?: ViewStyle;
  distanceKm?: number;
  pendingLabel?: string;
  pendingTooltip?: string;
  currentUserId?: string; // ID of the current user to determine if they're the creator
  variant?: 'my-groups' | 'all-groups'; // Variant to determine padding based on page
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
  pendingLabel,
  pendingTooltip,
  currentUserId,
  variant = 'all-groups', // Default to 'all-groups' for backward compatibility
}) => {
  // Guard against null/undefined groups coming from callers
  if (!group) return null;

  const { theme } = useTheme();

  const churchName = group?.church?.name?.trim();
  const serviceName = group?.service?.name?.trim();
  const churchAndServiceLabel = [churchName, serviceName]
    .filter((value) => !!value && value.length > 0)
    .join(', ');

  const formatMeetingTime = (day: string, time: string) => {
    const date = new Date(`2000-01-01T${time}`);
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    // Format like "Mondays 7pm" for Figma design
    const dayName = day.charAt(0).toUpperCase() + day.slice(1);
    const timeStr = formattedTime.toLowerCase().replace(/\s/g, '');
    return `${dayName}s ${timeStr}`;
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

  const [showPendingTip, setShowPendingTip] = React.useState(false);

  const isAwaitingVerification = group.status === 'pending';
  const hasCustomPending = Boolean(pendingLabel);
  const isCreator = currentUserId && group.created_by === currentUserId;
  
  // Check if current user is a leader
  const isCurrentUserLeader = React.useMemo(() => {
    if (!currentUserId || !leaders) return false;
    return leaders.some((leader) => leader.id === currentUserId);
  }, [currentUserId, leaders]);
  
  const badgeLabel = hasCustomPending
    ? pendingLabel || 'Join request pending'
    : isCreator
    ? 'Group creation pending'
    : 'Awaiting Confirmation';
  const tooltipMessage = hasCustomPending
    ? pendingTooltip
    : isCreator
    ? 'Your group request has been sent to church administrators for approval. They will be in touch to discuss your group.'
    : 'A member of your clergy has received your request and will be in touch to approve or discuss.';
  const showPendingBadge = isAwaitingVerification || hasCustomPending;
  const shouldBlockNavigation = showPendingBadge;
  const pressAnim = React.useRef(new Animated.Value(0)).current;

  const handlePressIn = React.useCallback(() => {
    if (!shouldBlockNavigation) return;
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [pressAnim, shouldBlockNavigation]);

  const handlePressOut = React.useCallback(() => {
    if (!shouldBlockNavigation) return;
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [pressAnim, shouldBlockNavigation]);

  const pulseOpacity = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.18],
  });

  return (
    <TouchableOpacity
      style={[
        styles.card,
        style,
      ]}
      onPress={shouldBlockNavigation ? undefined : onPress}
      activeOpacity={0.7}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {showPendingBadge && (
        <View pointerEvents="none" style={styles.pendingWash} />
      )}
      {shouldBlockNavigation && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject as any,
            {
              backgroundColor: '#fff',
              opacity: pulseOpacity,
              borderRadius: 12,
            },
          ]}
        />
      )}
      <View style={styles.content}>
        {/* Group Image */}
        <View style={styles.imageContainer}>
          {group.image_url ? (
            <OptimizedImage
              source={{ uri: group.image_url }}
              style={styles.image}
              quality="medium"
              lazy={true}
              maxWidth={400}
              maxHeight={167}
              resizeMode="cover"
            />
          ) : (
            <GroupPlaceholderImage style={styles.image} />
          )}

          {/* Leader Badge - Top Right */}
          {(membershipStatus === 'leader' || isCurrentUserLeader) && (
            <View style={styles.leaderBadge}>
              <Text style={styles.leaderBadgeText}>Leader</Text>
            </View>
          )}

          {/* Pending Badge */}
          {showPendingBadge && (
            <TouchableOpacity
              style={styles.pendingBadge}
              onPress={() => setShowPendingTip((v) => !v)}
              activeOpacity={0.85}
            >
              <Ionicons name="time-outline" size={16} color="#b45309" />
              <Text style={styles.pendingText}>{badgeLabel}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Section */}
        {/* Apply infoMyGroups to ALL cards on my-groups page, regardless of leader status */}
        <View style={[
          styles.info,
          variant === 'my-groups' ? styles.infoMyGroups : styles.infoAllGroups
        ]}>
          {/* Group Name */}
          <Text
            variant="h6"
            weight="bold"
            style={styles.groupName}
            numberOfLines={1}
          >
            {group.title}
          </Text>

          {/* Details */}
          <View style={[
            styles.details,
            variant === 'my-groups' ? styles.detailsMyGroups : styles.detailsAllGroups
          ]}>
            {/* Time */}
            {group.meeting_day && group.meeting_time && (
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={16} color="#2C2235" />
                <Text
                  variant="bodySmall"
                  weight="medium"
                  style={styles.detailText}
                >
                  {formatMeetingTime(group.meeting_day, group.meeting_time)}
                </Text>
              </View>
            )}
            {/* Distance (shown when sorting by distance) */}
            {typeof distanceKm === 'number' && (
              <View style={styles.detailRow}>
                <Ionicons name="navigate-outline" size={16} color="#2C2235" />
                <Text
                  variant="bodySmall"
                  weight="medium"
                  style={styles.detailText}
                >
                  {distanceKm.toFixed(1)} km away
                </Text>
              </View>
            )}

            {/* Location */}
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color="#2C2235" />
              <Text
                variant="bodySmall"
                weight="medium"
                style={styles.detailText}
              >
                {formatLocation(group.location)}
              </Text>
            </View>

            {/* Leader */}
            {leaders && leaders.length > 0 && (
              <View style={styles.detailRow}>
                <Avatar
                  imageUrl={leaders[0].avatar_url}
                  name={leaders[0].name || undefined}
                  size={16}
                />
                <Text
                  variant="bodySmall"
                  weight="medium"
                  style={styles.detailText}
                >
                  Led by {leaders[0].name}
                </Text>
              </View>
            )}

            {/* Church and Service */}
            {churchAndServiceLabel && (
              <View style={styles.detailRow}>
                <Ionicons name="business-outline" size={16} color="#2C2235" />
                <Text
                  variant="bodySmall"
                  weight="medium"
                  style={styles.detailText}
                >
                  {churchAndServiceLabel}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Member Count Badge - Over Image */}
        {group.member_count !== undefined && (
          <View style={styles.memberCountBadge}>
            <View style={styles.memberCountInner}>
              <Text style={styles.memberCountText}>{group.member_count}</Text>
              <Ionicons name="person-outline" size={16} color="#2C2235" />
            </View>
          </View>
        )}

        {/* Profile Pictures - Center of Description Section */}
        {(friendsInGroup && friendsInGroup.length > 0) || (leaders && leaders.length > 0) ? (
          <View style={styles.profilePicturesContainer}>
            {friendsInGroup && friendsInGroup.length > 0 ? (
              friendsInGroup.slice(0, 3).map((friend, index) => {
                const avatarSize = index === 0 ? 60 : index === 1 ? 57 : 54;
                return (
                  <View
                    key={friend.id}
                    style={[
                      styles.profilePicture,
                      {
                        width: avatarSize + 4,
                        height: avatarSize + 4,
                        borderRadius: (avatarSize + 4) / 2,
                        marginLeft: index > 0 ? -8 : 0,
                        zIndex: 3 - index,
                      },
                    ]}
                  >
                    <Avatar
                      imageUrl={friend.avatar_url}
                      name={friend.name || undefined}
                      size={avatarSize}
                    />
                  </View>
                );
              })
            ) : leaders && leaders.length > 0 ? (
              leaders.slice(0, 3).map((leader, index) => {
                const avatarSize = index === 0 ? 60 : index === 1 ? 57 : 54;
                return (
                  <View
                    key={leader.id}
                    style={[
                      styles.profilePicture,
                      {
                        width: avatarSize + 4,
                        height: avatarSize + 4,
                        borderRadius: (avatarSize + 4) / 2,
                        marginLeft: index > 0 ? -8 : 0,
                        zIndex: 3 - index,
                      },
                    ]}
                  >
                    <Avatar
                      imageUrl={leader.avatar_url}
                      name={leader.name || undefined}
                      size={avatarSize}
                    />
                  </View>
                );
              })
            ) : null}
          </View>
        ) : null}
      </View>

      {showPendingTip && tooltipMessage && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowPendingTip(false)}
          style={styles.pendingTooltip}
          accessibilityRole="button"
          accessibilityLabel="Hide pending information"
          accessibilityHint="Tap to dismiss"
        >
          <Text variant="caption" style={styles.tooltipText}>
            {tooltipMessage}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginHorizontal: 17,
    marginVertical: 0,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EDEDED',
    backgroundColor: '#F9FAFC',
    minHeight: 300,
    // Background color now set dynamically with theme
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 167,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 167,
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
  pendingWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    zIndex: 0,
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
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  infoMyGroups: {
    paddingRight: 10, // Match padding to prevent text from being covered by profile pictures - applies to ALL cards on my-groups page
    paddingBottom: 40, // Keep bottom padding for my groups page
  },
  infoAllGroups: {
    paddingRight: 100, // Add padding to prevent text from being covered by profile pictures
    paddingBottom: 12, // Different bottom padding for All Groups page
  },
  groupName: {
    color: '#2C2235',
    fontSize: 22,
    letterSpacing: -0.66,
    marginBottom: 8,
    fontWeight: '700',
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
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF0083',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 2,
  },
  leaderBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    letterSpacing: -0.27,
    fontWeight: '700',
  },
  memberCountBadge: {
    position: 'absolute',
    left: 15,
    top: 125,
    zIndex: 3,
  },
  memberCountInner: {
    backgroundColor: 'rgba(217, 217, 217, 0.9)',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 46,
  },
  memberCountText: {
    color: '#2C2235',
    fontSize: 16,
    letterSpacing: -0.48,
    fontWeight: '500',
  },
  profilePicturesContainer: {
    position: 'absolute',
    right: 20,
    top: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  profilePicture: {
    borderWidth: 2,
    borderColor: '#FF0083',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
    gap: 4,
  },
  detailsMyGroups: {
    marginRight: 0, // No margin needed for my-groups since paddingRight handles spacing
  },
  detailsAllGroups: {
    marginRight: 10, // Add margin to prevent text from being covered by profile pictures
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  detailText: {
    color: '#2C2235',
    fontSize: 11,
    letterSpacing: -0.55,
    flex: 1,
    fontWeight: '500',
    flexShrink: 1,
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
    zIndex: 2,
    flexDirection: 'row',
    gap: 6,
  },
  pendingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  pendingText: {
    color: '#92400e',
    fontWeight: '600',
    fontSize: 12,
  },
  pendingTooltip: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    zIndex: 3,
  },
  tooltipText: {
    color: '#1f2937',
    lineHeight: 18,
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
