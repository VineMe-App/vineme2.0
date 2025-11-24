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
  category?: 'service' | 'church' | 'outside'; // Color coding category
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  onPress,
  membershipStatus,
  friendsCount,
  friendsInGroup,
  category,
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

  // Get border color based on category (matching map marker colors)
  const getBorderColor = () => {
    if (!category) return '#EDEDED'; // Default
    switch (category) {
      case 'service':
        return '#FF0083'; // Primary pink color
      case 'church':
        return '#96115c'; // Blend of pink and dark (50% pink, 50% dark) - darker
      case 'outside':
        return '#2C2235'; // Dark color
      default:
        return '#EDEDED';
    }
  };

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
            <GroupPlaceholderImage style={styles.image} category={category} />
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

          {/* Friends Overlay - Bottom Right */}
          {friendsInGroup && friendsInGroup.length > 0 && (
            <TouchableOpacity
              style={styles.friendsOverlay}
              onPress={onPressFriends}
              activeOpacity={0.8}
            >
              <View style={styles.friendAvatars}>
                {friendsInGroup.slice(0, 3).map((friend, index) => (
                  <View
                    key={friend.id}
                    style={[
                      styles.friendAvatar,
                      {
                        marginLeft: index > 0 ? -6 : 0,
                        zIndex: 3 - index,
                      },
                    ]}
                  >
                    <Avatar
                      imageUrl={friend.avatar_url}
                      name={friend.name || undefined}
                      size={20}
                    />
                  </View>
                ))}
              </View>
              {friendsCount !== undefined && friendsCount > 0 && (
                <Text style={styles.friendsCount}>
                  {friendsCount} {friendsCount === 1 ? 'friend' : 'friends'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Info Section */}
        {/* Apply infoMyGroups to ALL cards on my-groups page, regardless of leader status */}
        <View style={[
          styles.info,
          variant === 'my-groups' ? styles.infoMyGroups : styles.infoAllGroups,
          // Add extra padding when there are 4 or more leaders to prevent text from getting too close
          // Square container is 108px wide, positioned 20px from right = 128px minimum + extra spacing
          leaders && leaders.length >= 4 
            ? { paddingRight: variant === 'all-groups' ? 140 : 130 }
            : null
        ]}>
          {/* Group Name */}
          <Text
            variant="h6"
            weight="bold"
            style={styles.groupName}
            numberOfLines={2}
            ellipsizeMode="tail"
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
                  numberOfLines={2}
                  ellipsizeMode="tail"
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
                  numberOfLines={2}
                  ellipsizeMode="tail"
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
                numberOfLines={2}
                ellipsizeMode="tail"
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
                  style={[styles.detailText, styles.ledByText]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {leaders.length === 1
                    ? `Led by ${leaders[0].name || 'Unknown'}`
                    : leaders.length === 2
                    ? `Led by ${leaders[0].name || 'Unknown'} and ${leaders[1].name || 'Unknown'}`
                    : `Led by ${leaders.slice(0, -1).map(l => l.name || 'Unknown').join(', ')}, and ${leaders[leaders.length - 1].name || 'Unknown'}`}
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
                  numberOfLines={2}
                  ellipsizeMode="tail"
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
              <Ionicons name="person-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
            </View>
          </View>
        )}

        {/* Profile Pictures - Center of Description Section - Show all group leaders */}
        {leaders && leaders.length > 0 && (
          <View style={styles.profilePicturesContainer}>
            {leaders.length === 1 ? (
              // Single leader - 60px
              <View
                style={[
                  styles.profilePicture,
                  {
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                  },
                ]}
              >
                <Avatar
                  imageUrl={leaders[0].avatar_url}
                  name={leaders[0].name || undefined}
                  size={60}
                />
              </View>
            ) : leaders.length === 2 ? (
              // Two leaders - side by side, 55px each
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={[
                    styles.profilePicture,
                    {
                      width: 59,
                      height: 59,
                      borderRadius: 29.5,
                      marginRight: -8,
                    },
                  ]}
                >
                  <Avatar
                    imageUrl={leaders[0].avatar_url}
                    name={leaders[0].name || undefined}
                    size={55}
                  />
                </View>
                <View
                  style={[
                    styles.profilePicture,
                    {
                      width: 59,
                      height: 59,
                      borderRadius: 29.5,
                    },
                  ]}
                >
                  <Avatar
                    imageUrl={leaders[1].avatar_url}
                    name={leaders[1].name || undefined}
                    size={55}
                  />
                </View>
              </View>
            ) : leaders.length === 3 ? (
              // Three leaders - pyramid formation (2 on top, 1 below), 50px each
              <View style={styles.pyramidContainer}>
                <View style={styles.pyramidRow}>
                  <View
                    style={[
                      styles.profilePicture,
                      {
                        width: 54,
                        height: 54,
                        borderRadius: 27,
                        marginRight: -8,
                      },
                    ]}
                  >
                    <Avatar
                      imageUrl={leaders[0].avatar_url}
                      name={leaders[0].name || undefined}
                      size={50}
                    />
                  </View>
                  <View
                    style={[
                      styles.profilePicture,
                      {
                        width: 54,
                        height: 54,
                        borderRadius: 27,
                      },
                    ]}
                  >
                    <Avatar
                      imageUrl={leaders[1].avatar_url}
                      name={leaders[1].name || undefined}
                      size={50}
                    />
                  </View>
                </View>
                <View style={[styles.pyramidRow, { marginTop: -8 }]}>
                  <View
                    style={[
                      styles.profilePicture,
                      {
                        width: 54,
                        height: 54,
                        borderRadius: 27,
                        marginLeft: 23, // Center the bottom avatar under the gap between top two
                      },
                    ]}
                  >
                    <Avatar
                      imageUrl={leaders[2].avatar_url}
                      name={leaders[2].name || undefined}
                      size={50}
                    />
                  </View>
                </View>
              </View>
            ) : (
              // Four or more leaders - square/2x2 grid formation, 50px each
              <View style={styles.squareContainer}>
                {/* Top row: first 2 leaders */}
                <View style={[styles.squareRow, { marginTop: 0 }]}>
                  {leaders.slice(0, 2).map((leader, index) => (
                    <View
                      key={leader.id || `leader-${index}`}
                      style={[
                        styles.profilePicture,
                        styles.squareAvatarItem,
                        {
                          width: 54,
                          height: 54,
                          borderRadius: 27,
                          marginRight: index === 0 ? -8 : 0,
                        },
                      ]}
                    >
                      <Avatar
                        imageUrl={leader.avatar_url}
                        name={leader.name || undefined}
                        size={50}
                      />
                    </View>
                  ))}
                </View>
                {/* Bottom row: next 2 leaders (or "+N" indicator) */}
                <View style={[styles.squareRow, { marginTop: -8 }]}>
                  {leaders.length === 4 ? (
                    // Show both leaders if exactly 4
                    leaders.slice(2, 4).map((leader, index) => (
                      <View
                        key={leader.id || `leader-${index + 2}`}
                        style={[
                          styles.profilePicture,
                          styles.squareAvatarItem,
                          {
                            width: 54,
                            height: 54,
                            borderRadius: 27,
                            marginRight: index === 0 ? -8 : 0,
                          },
                        ]}
                      >
                        <Avatar
                          imageUrl={leader.avatar_url}
                          name={leader.name || undefined}
                          size={50}
                        />
                      </View>
                    ))
                  ) : (
                    // Show 3rd leader and "+N" indicator if more than 4
                    <>
                      <View
                        style={[
                          styles.profilePicture,
                          styles.squareAvatarItem,
                          {
                            width: 54,
                            height: 54,
                            borderRadius: 27,
                            marginRight: -8,
                          },
                        ]}
                      >
                        <Avatar
                          imageUrl={leaders[2].avatar_url}
                          name={leaders[2].name || undefined}
                          size={50}
                        />
                      </View>
                      <View
                        style={[
                          styles.profilePicture,
                          {
                            width: 54,
                            height: 54,
                            borderRadius: 27,
                            backgroundColor: 'rgba(44, 34, 53, 0.9)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          },
                        ]}
                      >
                        <Text style={styles.moreLeadersIndicatorText}>
                          +{leaders.length - 3}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            )}
          </View>
        )}
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
    backgroundColor: '#ff0083', // Primary pink color
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  friendAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatar: {
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  friendsCount: {
    color: '#FFFFFF',
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
    paddingRight: 100, // Restored original padding for profile pictures
    paddingBottom: 12, // Different bottom padding for All Groups page
  },
  groupName: {
    color: '#000000',
    fontSize: 20,
    letterSpacing: -0.66,
    lineHeight: 28,
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
    backgroundColor: 'rgba(44, 34, 53, 0.75)', // Dark purple, slightly greyed out (matching no group fits button style)
    borderRadius: 16, // Match button border radius
    paddingHorizontal: 10, // Match button padding
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // Match button gap
    minWidth: 46,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  memberCountText: {
    color: 'rgba(255, 255, 255, 0.9)', // White text, slightly greyed out
    fontSize: 12, // Match button text size
    fontWeight: '500',
  },
  profilePicturesContainer: {
    position: 'absolute',
    right: 20,
    top: 200,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    zIndex: 1,
    overflow: 'visible',
  },
  pyramidContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pyramidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareContainer: {
    width: 108, // 2 avatars × 54px (with -8px overlap)
    height: 108, // 2 rows × 54px (with -8px overlap)
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    position: 'relative',
    overflow: 'visible',
  },
  squareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  squareAvatarItem: {
    // Ensure each square avatar item has proper positioning
    position: 'relative',
  },
  profilePicture: {
    borderWidth: 2,
    borderColor: '#FF0083', // Pink border
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  moreLeadersIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  detailText: {
    color: '#000000',
    fontSize: 12,
    letterSpacing: -0.22,
    lineHeight: 18,
    flex: 1,
    fontWeight: '500',
    flexShrink: 1,
    includeFontPadding: false,
  },
  ledByText: {
    color: '#2C2235',
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
