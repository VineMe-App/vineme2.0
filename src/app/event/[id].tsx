import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthLoadingAnimation } from '../../components/auth/AuthLoadingAnimation';
import { useLocalSearchParams, router } from 'expo-router';
import {
  useEvent,
  useUserTicket,
  useCreateTicket,
  useCancelTicket,
} from '../../hooks/useEvents';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { formatDateTime, isToday } from '../../utils/helpers';
import { shareEvent } from '../../utils/deepLinking';
import { OptimizedImage } from '../../components/ui/OptimizedImage';
import { safeGoBack } from '@/utils/navigation';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const { data: event, isLoading: eventLoading, error } = useEvent(id!);
  const { data: ticketStatus } = useUserTicket(id!, user?.id || '');
  const createTicketMutation = useCreateTicket();
  const cancelTicketMutation = useCancelTicket();

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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatEventDuration = () => {
    if (!event?.end_date) return null;

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

    const parts = [];
    if (location.name) parts.push(location.name);
    if (location.address) parts.push(location.address);
    if (location.room) parts.push(`Room ${location.room}`);

    return parts.length > 0 ? parts.join(', ') : 'Location TBD';
  };

  const getRecurrenceText = (pattern: any) => {
    if (!pattern) return null;

    if (pattern.type === 'weekly') {
      return `This event repeats weekly on ${pattern.day || 'the same day'}`;
    }
    if (pattern.type === 'monthly') {
      return `This event repeats monthly`;
    }
    if (pattern.type === 'daily') {
      return `This event repeats daily`;
    }

    return 'This is a recurring event';
  };

  const handleWhatsAppPress = () => {
    if (event?.whatsapp_link) {
      Linking.openURL(event.whatsapp_link).catch((err) => {
        console.error('Failed to open WhatsApp link:', err);
        Alert.alert('Error', 'Could not open WhatsApp link');
      });
    }
  };

  const handleRegister = async () => {
    if (!user?.id || !event?.id) return;

    try {
      await createTicketMutation.mutateAsync({
        eventId: event.id,
        userId: user.id,
      });
      Alert.alert('Success', 'You have been registered for this event!');
    } catch (error) {
      Alert.alert('Error', 'Failed to register for event. Please try again.');
    }
  };

  const handleCancelRegistration = async () => {
    if (!user?.id || !event?.id) return;

    Alert.alert(
      'Cancel Registration',
      'Are you sure you want to cancel your registration for this event?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelTicketMutation.mutateAsync({
                eventId: event.id,
                userId: user.id,
              });
              Alert.alert('Cancelled', 'Your registration has been cancelled.');
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to cancel registration. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  const handleShare = () => {
    if (event) {
      shareEvent(event.id, event.title, event.start_date);
    }
  };

  if (eventLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <AuthLoadingAnimation />
          <Text style={styles.loadingText}>Loading event details...</Text>
        </View>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Event not found</Text>
          <Text style={styles.errorSubtext}>
            {error?.message ||
              'The event you are looking for could not be found.'}
          </Text>
          <Button
            title="Go Back"
            onPress={() => safeGoBack(router)}
            style={styles.backButton}
          />
        </View>
      </View>
    );
  }

  const hasTicket = ticketStatus?.hasTicket || false;
  const isLoading =
    createTicketMutation.isPending || cancelTicketMutation.isPending;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {event.image_url && (
        <OptimizedImage
          source={{ uri: event.image_url }}
          style={styles.heroImage}
          quality="medium"
          lazy={false}
          resizeMode="cover"
        />
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>{event.title}</Text>
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
          </View>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="share-outline" size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>{event.description}</Text>

        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Event Details</Text>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>
              {formatEventDate(event.start_date)}
            </Text>
            {formatEventDuration() && (
              <Text style={styles.detailSubValue}>
                Duration: {formatEventDuration()}
              </Text>
            )}
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>
              {getLocationText(event.location)}
            </Text>
          </View>

          {event.host && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Host</Text>
              <Text style={styles.detailValue}>{event.host.name}</Text>
              {event.host.email && (
                <Text style={styles.detailSubValue}>{event.host.email}</Text>
              )}
            </View>
          )}

          {event.church && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Church</Text>
              <Text style={styles.detailValue}>{event.church.name}</Text>
            </View>
          )}

          {event.price && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.priceValue}>${event.price}</Text>
            </View>
          )}

          {event.recurrence_pattern && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Recurrence</Text>
              <Text style={styles.detailValue}>
                {getRecurrenceText(event.recurrence_pattern)}
              </Text>
            </View>
          )}

          {event.requires_ticket && event.ticket_count !== undefined && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Registration</Text>
              <Text style={styles.detailValue}>
                {event.ticket_count} people registered
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionsSection}>
          {event.whatsapp_link && (
            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={handleWhatsAppPress}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                <Text style={styles.whatsappButtonText}>
                  Join WhatsApp Group
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {event.requires_ticket && user && (
            <View style={styles.registrationSection}>
              {hasTicket ? (
                <View>
                  <View style={styles.registeredBadge}>
                    <Text style={styles.registeredText}>
                      ✓ You are registered for this event
                    </Text>
                  </View>
                  <Button
                    title="Cancel Registration"
                    onPress={handleCancelRegistration}
                    variant="danger"
                    loading={isLoading}
                    style={styles.actionButton}
                  />
                </View>
              ) : (
                <Button
                  title="Register for Event"
                  onPress={handleRegister}
                  loading={isLoading}
                  style={styles.actionButton}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  heroImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  shareButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  shareIcon: {
    fontSize: 20,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  detailItem: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  detailSubValue: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  actionsSection: {
    gap: 16,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  whatsappButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  registrationSection: {
    gap: 12,
  },
  registeredBadge: {
    backgroundColor: '#e8f5e8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  registeredText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2e7d32',
  },
  actionButton: {
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    minWidth: 120,
  },
});
