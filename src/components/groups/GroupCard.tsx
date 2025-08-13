import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { GroupWithDetails } from '../../types/database';
import { OptimizedImage } from '../ui/OptimizedImage';

interface GroupCardProps {
  group: GroupWithDetails;
  onPress: () => void;
  membershipStatus?: 'member' | 'leader' | 'admin' | null;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  onPress,
  membershipStatus,
}) => {
  if (!group) return null;
  const formatMeetingTime = (day: string, time: string) => {
    return `${day}s at ${time}`;
  };

  const formatLocation = (location: any) => {
    if (!location) return 'Location TBD';
    if (typeof location === 'string') return location;
    if (location.address) return location.address;
    if (location.room) return `Room ${location.room}`;
    return 'Location TBD';
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
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
            <Text style={styles.title} numberOfLines={2}>
              {group.title}
            </Text>
            {membershipStatus && (
              <View
                style={[styles.statusBadge, styles[`${membershipStatus}Badge`]]}
              >
                <Text
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

          <Text style={styles.description} numberOfLines={2}>
            {group.description}
          </Text>

          <View style={styles.details}>
            {group.meeting_day && group.meeting_time && (
              <Text style={styles.meetingTime}>
                📅 {formatMeetingTime(group.meeting_day, group.meeting_time)}
              </Text>
            )}
            <Text style={styles.location}>
              📍 {formatLocation(group.location)}
            </Text>
            {group.member_count !== undefined && (
              <Text style={styles.memberCount}>
                👥 {group.member_count} member
                {group.member_count !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {group.service?.name && (
            <Text style={styles.service}>Service: {group.service.name}</Text>
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
    fontSize: 18,
    fontWeight: 'bold',
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
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  details: {
    marginBottom: 8,
  },
  meetingTime: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  service: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});
