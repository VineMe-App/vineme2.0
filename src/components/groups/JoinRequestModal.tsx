import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import { useCreateJoinRequest } from '../../hooks/useJoinRequests';
import type { GroupWithDetails } from '../../types/database';

interface JoinRequestModalProps {
  visible: boolean;
  onClose: () => void;
  group: GroupWithDetails;
  userId: string;
}

export const JoinRequestModal: React.FC<JoinRequestModalProps> = ({
  visible,
  onClose,
  group,
  userId,
}) => {
  const [message, setMessage] = useState('');
  const [contactConsent, setContactConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createJoinRequestMutation = useCreateJoinRequest();

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createJoinRequestMutation.mutateAsync({
        group_id: group.id,
        user_id: userId,
        contact_consent: contactConsent,
        message: message.trim() || undefined,
      });

      Alert.alert(
        'Request Sent!',
        'Your join request has been sent to the group leaders. They will review it and get back to you soon.',
        [{ text: 'OK', onPress: onClose }]
      );
      
      // Reset form
      setMessage('');
      setContactConsent(false);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to send join request'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setMessage('');
    setContactConsent(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Request to Join Group"
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.groupInfo}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <Text style={styles.groupDescription}>{group.description}</Text>
          <Text style={styles.meetingInfo}>
            📅 {group.meeting_day}s at {group.meeting_time}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Optional Message</Text>
          <Text style={styles.sectionDescription}>
            Tell the group leaders a bit about yourself or why you'd like to join this group.
          </Text>
          <Input
            value={message}
            onChangeText={setMessage}
            placeholder="Hi! I'm interested in joining your group because..."
            multiline
            numberOfLines={4}
            style={styles.messageInput}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.sectionDescription}>
            Group leaders may want to contact you to welcome you or provide additional details about the group.
          </Text>
          
          <View style={styles.consentContainer}>
            <Checkbox
              checked={contactConsent}
              onPress={() => setContactConsent(!contactConsent)}
              label="I consent to sharing my contact information (name and email) with the group leaders"
            />
          </View>
          
          <Text style={styles.privacyNote}>
            Your contact information will only be shared with the leaders of this group and will not be used for any other purposes.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="Cancel"
            onPress={handleClose}
            variant="secondary"
            disabled={isSubmitting}
            style={styles.cancelButton}
          />
          <Button
            title="Send Request"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 600,
  },
  groupInfo: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  meetingInfo: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  messageInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  consentContainer: {
    marginBottom: 12,
  },
  privacyNote: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});