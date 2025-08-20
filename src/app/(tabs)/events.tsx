import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ComingSoonBanner } from '../../components/ui/ComingSoonBanner';

export default function EventsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Main Coming Soon Banner */}
        <ComingSoonBanner
          title="Events Coming Soon!"
          message="We're working hard to bring you an amazing events experience. Stay tuned for updates!"
        />

        {/* Feature Preview */}
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>What's Coming</Text>

          <View style={styles.featureItem}>
            <Ionicons name="calendar" size={24} color="#007AFF" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Church Events</Text>
              <Text style={styles.featureDescription}>
                View and register for upcoming church events and activities
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="ticket" size={24} color="#007AFF" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Event Registration</Text>
              <Text style={styles.featureDescription}>
                Easy registration and ticket management for church events
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="notifications" size={24} color="#007AFF" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Event Reminders</Text>
              <Text style={styles.featureDescription}>
                Get notified about upcoming events you're registered for
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="people" size={24} color="#007AFF" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Community Events</Text>
              <Text style={styles.featureDescription}>
                Connect with your church community through special events
              </Text>
            </View>
          </View>
        </View>

        {/* Focus Message */}
        <View style={styles.focusSection}>
          <Text style={styles.focusTitle}>In the Meantime</Text>
          <Text style={styles.focusMessage}>
            We're focusing on making the Groups experience amazing! Check out
            the Groups tab to connect with Bible study groups and fellowship
            opportunities in your church community.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  previewSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  featureText: {
    marginLeft: 12,
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  focusSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  focusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  focusMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
});
