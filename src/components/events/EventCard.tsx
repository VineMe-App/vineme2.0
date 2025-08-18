import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EventWithDetails } from '../../types/database';
import { formatDateTime, isToday } from '../../utils/helpers';
import { OptimizedImage } from '../ui/OptimizedImage';

interface EventCardProps {
  event: EventWithDetails;
  onPress: () => void;
  showTicketStatus?: boolean;
  hasTicket?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onPress,
  showTicketStatus = false,
  hasTicket = false,
}) => {
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (isToday(dateString)) {
      return `Today at ${date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })}`;
    }

    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })}`;
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatEventDuration = () => {
    if (!event.end_date) return null;

    const start = new Date(event.start_date);
    const end = new Date(event.end_date);

    // If same day, show time range
    if (start.toDateString() === end.toDateString()) {
      const startTime = start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const endTime = end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${startTime} - ${endTime}`;
    }

    // Multi-day event
    return `${formatEventDate(event.start_date)} - ${formatEventDate(event.end_date)}`;
  };

  const getLocationText = (location: any) => {
    if (!location) return 'Location TBD';
    if (typeof location === 'string') return location;
    if (location.address) return location.address;
    if (location.name) return location.name;
    if (location.room) return `Room ${location.room}`;
    return 'Location TBD';
  };

  const getRecurrenceText = (pattern: any) => {
    if (!pattern) return null;

    if (pattern.type === 'weekly') {
      return `Repeats weekly on ${pattern.day || 'same day'}`;
    }
    if (pattern.type === 'monthly') {
      return `Repeats monthly`;
    }
    if (pattern.type === 'daily') {
      return `Repeats daily`;
    }

    return 'Recurring event';
  };

  const handleWhatsAppPress = () => {
    if (event.whatsapp_link) {
      Linking.openURL(event.whatsapp_link).catch((err) => {
        console.error('Failed to open WhatsApp link:', err);
      });
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        {event.image_url && (
          <OptimizedImage
            source={{ uri: event.image_url }}
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
              {event.title}
            </Text>
            <View style={styles.badges}>
              {event.category_info && (
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: event.category_info.color || '#007AFF' },
                  ]}
                >
                  <Text style={styles.categoryText}>
                    {event.category_info.name}
                  </Text>
                </View>
              )}
              {showTicketStatus && hasTicket && (
                <View style={styles.ticketBadge}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="#2e7d32" />
                    <Text style={styles.ticketText}>Registered</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {event.description}
          </Text>

          <View style={styles.details}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color="#6b7280" />
              <Text style={styles.eventMeta}>{formatEventDate(event.start_date)}</Text>
            </View>

            {formatEventDuration() && (
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={14} color="#6b7280" />
                <Text style={styles.eventMeta}>{formatEventDuration()}</Text>
              </View>
            )}

            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color="#6b7280" />
              <Text style={styles.eventMeta}>{getLocationText(event.location)}</Text>
            </View>

            {event.host && (
              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={14} color="#6b7280" />
                <Text style={styles.eventMeta}>Hosted by {event.host.name}</Text>
              </View>
            )}

            {event.price && (
              <View style={styles.metaRow}>
                <Ionicons name="cash-outline" size={14} color="#16a34a" />
                <Text style={styles.eventMeta}>${event.price}</Text>
              </View>
            )}

            {event.recurrence_pattern && (
              <View style={styles.metaRow}>
                <Ionicons name="sync-outline" size={14} color="#6b7280" />
                <Text style={styles.eventMeta}>{getRecurrenceText(event.recurrence_pattern)}</Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            {event.whatsapp_link && (
              <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsAppPress}>
                <View style={styles.metaRow}>
                  <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                  <Text style={styles.whatsappText}>Join WhatsApp</Text>
                </View>
              </TouchableOpacity>
            )}

            {event.requires_ticket && event.ticket_count !== undefined && (
              <View style={styles.metaRow}>
                <Ionicons name="ticket-outline" size={14} color="#6b7280" />
                <Text style={styles.ticketCount}>{event.ticket_count} registered</Text>
              </View>
            )}
          </View>
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
  badges: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  ticketBadge: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ticketText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2e7d32',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  details: {
    marginBottom: 12,
    gap: 4,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventMeta: { fontSize: 14, color: '#666' },
  eventDate: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  eventDuration: {
    fontSize: 14,
    color: '#666',
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
  },
  eventHost: {
    fontSize: 14,
    color: '#666',
  },
  eventPrice: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  recurrenceText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  whatsappText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  ticketCount: {
    fontSize: 12,
    color: '#888',
  },
});
