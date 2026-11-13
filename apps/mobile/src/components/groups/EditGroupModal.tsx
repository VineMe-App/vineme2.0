import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import type { GroupWithDetails } from '../../types/database';
import { useAuthStore } from '../../stores/auth';
import { useUpdateGroupDetails } from '../../hooks/useGroupLeaderActions';

interface EditGroupModalProps {
  visible: boolean;
  group: GroupWithDetails;
  onClose: () => void;
  onGroupUpdated: () => void;
}

const MEETING_DAYS = [
  { label: 'Sunday', value: 'Sunday' },
  { label: 'Monday', value: 'Monday' },
  { label: 'Tuesday', value: 'Tuesday' },
  { label: 'Wednesday', value: 'Wednesday' },
  { label: 'Thursday', value: 'Thursday' },
  { label: 'Friday', value: 'Friday' },
  { label: 'Saturday', value: 'Saturday' },
];

const MEETING_TIMES = [
  { label: '6:00 AM', value: '06:00' },
  { label: '7:00 AM', value: '07:00' },
  { label: '8:00 AM', value: '08:00' },
  { label: '9:00 AM', value: '09:00' },
  { label: '10:00 AM', value: '10:00' },
  { label: '11:00 AM', value: '11:00' },
  { label: '12:00 PM', value: '12:00' },
  { label: '1:00 PM', value: '13:00' },
  { label: '2:00 PM', value: '14:00' },
  { label: '3:00 PM', value: '15:00' },
  { label: '4:00 PM', value: '16:00' },
  { label: '5:00 PM', value: '17:00' },
  { label: '6:00 PM', value: '18:00' },
  { label: '7:00 PM', value: '19:00' },
  { label: '8:00 PM', value: '20:00' },
  { label: '9:00 PM', value: '21:00' },
];

export const EditGroupModal: React.FC<EditGroupModalProps> = ({
  visible,
  group,
  onClose,
  onGroupUpdated,
}) => {
  const { userProfile } = useAuthStore();
  const updateGroupMutation = useUpdateGroupDetails();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meeting_day: '',
    meeting_time: '',
    location: '',
    whatsapp_link: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when group changes
  useEffect(() => {
    if (group) {
      setFormData({
        title: group.title || '',
        description: group.description || '',
        meeting_day: group.meeting_day || '',
        meeting_time: group.meeting_time || '',
        location:
          typeof group.location === 'string'
            ? group.location
            : group.location?.address || '',
        whatsapp_link: group.whatsapp_link || '',
      });
      setErrors({});
    }
  }, [group]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Group title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Group description is required';
    }

    if (!formData.meeting_day) {
      newErrors.meeting_day = 'Meeting day is required';
    }

    if (!formData.meeting_time) {
      newErrors.meeting_time = 'Meeting time is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Meeting location is required';
    }

    // Validate WhatsApp link format if provided
    if (
      formData.whatsapp_link &&
      !isValidWhatsAppLink(formData.whatsapp_link)
    ) {
      newErrors.whatsapp_link = 'Please enter a valid WhatsApp group link';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidWhatsAppLink = (link: string) => {
    const whatsappRegex = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/;
    return whatsappRegex.test(link);
  };

  const handleSave = async () => {
    if (!validateForm() || !userProfile) return;

    try {
      await updateGroupMutation.mutateAsync({
        groupId: group.id,
        updates: {
          title: formData.title.trim(),
          description: formData.description.trim(),
          meeting_day: formData.meeting_day,
          meeting_time: formData.meeting_time,
          location: formData.location.trim(),
          whatsapp_link: formData.whatsapp_link.trim() || null,
        },
        userId: userProfile.id,
      });

      Alert.alert('Success', 'Group details updated successfully');
      onGroupUpdated();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to update group details'
      );
    }
  };

  const handleClose = () => {
    // Reset form to original values
    if (group) {
      setFormData({
        title: group.title || '',
        description: group.description || '',
        meeting_day: group.meeting_day || '',
        meeting_time: group.meeting_time || '',
        location:
          typeof group.location === 'string'
            ? group.location
            : group.location?.address || '',
        whatsapp_link: group.whatsapp_link || '',
      });
    }
    setErrors({});
    onClose();
  };

  return (
    <Modal isVisible={visible} onClose={handleClose} title="Edit Group Details">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Input
            label="Group Title"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            placeholder="Enter group title"
            error={errors.title}
            required
          />

          <Input
            label="Description"
            value={formData.description}
            onChangeText={(text) =>
              setFormData({ ...formData, description: text })
            }
            placeholder="Describe your group"
            multiline
            numberOfLines={4}
            error={errors.description}
            required
          />

          <Select
            label="Meeting Day"
            value={formData.meeting_day}
            onValueChange={(value) =>
              setFormData({ ...formData, meeting_day: value })
            }
            options={MEETING_DAYS}
            placeholder="Select meeting day"
            error={errors.meeting_day}
            required
          />

          <Select
            label="Meeting Time"
            value={formData.meeting_time}
            onValueChange={(value) =>
              setFormData({ ...formData, meeting_time: value })
            }
            options={MEETING_TIMES}
            placeholder="Select meeting time"
            error={errors.meeting_time}
            required
          />

          <Input
            label="Meeting Location"
            value={formData.location}
            onChangeText={(text) =>
              setFormData({ ...formData, location: text })
            }
            placeholder="Enter meeting location"
            error={errors.location}
            required
          />

          <Input
            label="WhatsApp Group Link (Optional)"
            value={formData.whatsapp_link}
            onChangeText={(text) =>
              setFormData({ ...formData, whatsapp_link: text })
            }
            placeholder="https://chat.whatsapp.com/..."
            error={errors.whatsapp_link}
            autoCapitalize="none"
            keyboardType="url"
          />

          <View style={styles.helpText}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#666"
            />
            <Text style={styles.helpTextContent}>
              Changes will be visible to all group members immediately.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Cancel"
          onPress={handleClose}
          variant="secondary"
          style={styles.cancelButton}
        />
        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={updateGroupMutation.isPending}
          disabled={updateGroupMutation.isPending}
          style={styles.saveButton}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 16,
    gap: 16,
  },
  helpText: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  helpTextContent: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});
