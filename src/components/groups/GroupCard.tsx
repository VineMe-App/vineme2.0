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
import {
  getDisplayName,
  getFirstName,
  getLastName,
  getFullName,
} from '../../utils/name';

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
  friendIds?: string[];
  viewerIsChurchAdmin?: boolean;
}

type LeaderDisplay = {
  id: string;
  name: string;
  avatar?: string | null;
};

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
  friendIds,
  viewerIsChurchAdmin = false,
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

  const [showPendingTip, setShowPendingTip] = React.useState(false);

  const friendIdSet = React.useMemo(() => {
    return new Set((friendIds || []).filter((id): id is string => !!id));
  }, [friendIds]);

  const canRevealLeaderName = React.useCallback(
    (leader: User | null | undefined) => {
      if (!leader?.id) return viewerIsChurchAdmin;
      if (viewerIsChurchAdmin) return true;
      if (currentUserId && leader.id === currentUserId) return true;
      return friendIdSet.has(leader.id);
    },
    [viewerIsChurchAdmin, currentUserId, friendIdSet]
  );

  const formatLeaderName = React.useCallback(
    (leader: User) => {
      const first = getFirstName(leader) || leader.name?.split(' ')[0]?.trim();
      const last = getLastName(leader)?.trim();
      const displayFirst = first || getDisplayName(leader, { fallback: 'first' });
      const fallbackName = displayFirst || 'Group leader';
      const lastInitial = last ? last.charAt(0).toUpperCase() : '';

      if (canRevealLeaderName(leader)) {
        const full = getFullName(leader);
        if (full && full.trim().length > 0) {
          return full;
        }
        if (displayFirst && last) {
          return `${displayFirst} ${last}`;
        }
        return fallbackName;
      }

      if (displayFirst && lastInitial) {
        return `${displayFirst} ${lastInitial}.`;
      }

      return fallbackName;
    },
    [canRevealLeaderName]
  );

  const formattedLeaders = React.useMemo<LeaderDisplay[]>(() => {
    if (!leaders || leaders.length === 0) return [];

    return leaders.slice(0, 3).map((leader) => ({
      id: leader.id,
      name: formatLeaderName(leader),
      avatar: leader.avatar_url || null,
    }));
  }, [leaders, formatLeaderName]);

  const isAwaitingVerification = group.status === 'pending';
  const hasCustomPending = Boolean(pendingLabel);
  const isCreator = currentUserId && group.created_by === currentUserId;
  
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
        { backgroundColor: theme.colors.surface.secondary }, // Faded pink background
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
            {showPendingBadge && (
              <TouchableOpacity
                style={styles.pendingBadge}
                onPress={() => setShowPendingTip((v) => !v)}
                activeOpacity={0.85}
                accessibilityRole={tooltipMessage ? 'button' : 'text'}
                accessibilityLabel={tooltipMessage ? badgeLabel : undefined}
                accessibilityHint={
                  tooltipMessage ? 'Tap to view details' : undefined
                }
              >
                <Ionicons name="time-outline" size={16} color="#b45309" />
                <Text style={styles.pendingText}>{badgeLabel}</Text>
                {tooltipMessage && (
                  <Ionicons
                    name="information-circle"
                    size={16}
                    color="#b45309"
                    style={{ marginLeft: 6 }}
                  />
                )}
              </TouchableOpacity>
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
            {formattedLeaders.length > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="star-outline" size={16} color="#6b7280" />
                <View style={styles.leaderTextAndAvatars}>
                  <Text
                    variant="bodySmall"
                    style={styles.leaderText}
                    numberOfLines={1}
                  >
                    Led by{' '}
                    {formattedLeaders.map((leader) => leader.name).join(', ')}
                    {leaders && leaders.length > 3 &&
                      ` and ${leaders.length - 3} others`}
                  </Text>
                  <View style={styles.leaderAvatars}>
                    {formattedLeaders.map((leader, index) => (
                      <View
                        key={leader.id}
                        style={[
                          styles.leaderAvatar,
                          { marginLeft: index > 0 ? -4 : 0 },
                        ]}
                      >
                        <Avatar
                          imageUrl={leader.avatar || undefined}
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

          {churchAndServiceLabel && (
            <Text
              variant="caption"
              color="tertiary"
              style={styles.service}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {churchAndServiceLabel}
            </Text>
          )}
        </View>
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
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    // Background color now set dynamically with theme
  },
  content: {
    padding: 16,
    position: 'relative',
    zIndex: 1,
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
    zIndex: 2,
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
