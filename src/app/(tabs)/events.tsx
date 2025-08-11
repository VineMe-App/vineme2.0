import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useEventsByChurch, useUserTicket } from '../../hooks/useEvents';
import { useAuth } from '../../hooks/useAuth';
import { EventCard } from '../../components/events';
import type { EventWithDetails } from '../../types/database';

interface EventListItemProps {
  event: EventWithDetails;
  userId?: string;
}

function EventListItem({ event, userId }: EventListItemProps) {
  const { data: ticketStatus } = useUserTicket(event.id, userId || '');

  const handlePress = () => {
    router.push(`/event/${event.id}`);
  };

  return (
    <EventCard
      event={event}
      onPress={handlePress}
      showTicketStatus={!!userId}
      hasTicket={ticketStatus?.hasTicket || false}
    />
  );
}

export default function EventsScreen() {
  const { user, userProfile } = useAuth();
  const {
    data: events,
    isLoading,
    error,
  } = useEventsByChurch(userProfile?.church_id || '');

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load events</Text>
          <Text style={styles.errorSubtext}>{error.message}</Text>
        </View>
      </View>
    );
  }

  if (!userProfile?.church_id) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No Church Selected</Text>
          <Text style={styles.errorSubtext}>
            Please complete your profile setup to view church events
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Church Events</Text>
        <Text style={styles.subtitle}>
          Stay updated with upcoming church events and activities
        </Text>
      </View>

      {!events || events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No upcoming events</Text>
          <Text style={styles.emptySubtext}>
            Check back later for new events from your church
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventListItem event={item} userId={user?.id} />
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 24,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
