import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  useUpdateUserProfile,
  useUploadAvatar,
  useDeleteAvatar,
} from '../../hooks/useUsers';
import type { UserWithDetails } from '../../types/database';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  user: UserWithDetails;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  user,
}) => {
  const [name, setName] = useState(user.name || '');
  const [nameError, setNameError] = useState('');

  const updateProfileMutation = useUpdateUserProfile();
  const uploadAvatarMutation = useUploadAvatar();
  const deleteAvatarMutation = useDeleteAvatar();

  useEffect(() => {
    if (visible) {
      setName(user.name || '');
      setNameError('');
    }
  }, [visible, user.name]);

  const validateName = (value: string): boolean => {
    if (!value.trim()) {
      setNameError('Name is required');
      return false;
    }
    if (value.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSave = async () => {
    if (!validateName(name)) {
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        userId: user.id,
        updates: { name: name.trim() },
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleAvatarPress = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose from Library', onPress: pickImage },
      { text: 'Take Photo', onPress: takePhoto },
      ...(user.avatar_url
        ? [
            {
              text: 'Remove Photo',
              onPress: removeAvatar,
              style: 'destructive' as const,
            },
          ]
        : []),
    ]);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant permission to access your photo library.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant permission to access your camera.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      // Convert URI to blob for upload
      const response = await fetch(uri);
      const blob = await response.blob();

      await uploadAvatarMutation.mutateAsync({
        userId: user.id,
        file: blob,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to upload avatar. Please try again.');
    }
  };

  const removeAvatar = async () => {
    if (!user.avatar_url) return;

    try {
      await deleteAvatarMutation.mutateAsync({
        userId: user.id,
        avatarUrl: user.avatar_url,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to remove avatar. Please try again.');
    }
  };

  const isLoading =
    updateProfileMutation.isPending ||
    uploadAvatarMutation.isPending ||
    deleteAvatarMutation.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={isLoading}>
            <Text style={[styles.headerButton, isLoading && styles.disabled]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isLoading || !!nameError}
          >
            <Text
              style={[
                styles.headerButton,
                styles.saveButton,
                (isLoading || !!nameError) && styles.disabled,
              ]}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarSection}>
            <Avatar
              size={120}
              imageUrl={user.avatar_url}
              name={user.name}
              onPress={handleAvatarPress}
              showEditIcon
            />
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (nameError) validateName(text);
              }}
              onBlur={() => validateName(name)}
              error={nameError}
              placeholder="Enter your name"
              autoCapitalize="words"
              maxLength={50}
            />

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Account Information</Text>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>

              {user.church && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Church</Text>
                  <Text style={styles.infoValue}>{user.church.name}</Text>
                </View>
              )}

              {user.service && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Service</Text>
                  <Text style={styles.infoValue}>{user.service.name}</Text>
                </View>
              )}

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>
                  {user.roles?.join(', ') || 'Member'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                {uploadAvatarMutation.isPending
                  ? 'Uploading photo...'
                  : deleteAvatarMutation.isPending
                    ? 'Removing photo...'
                    : 'Saving changes...'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingTop: Platform.OS === 'ios' ? 60 : 12,
  },
  headerButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  saveButton: {
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarHint: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
  },
  form: {
    flex: 1,
  },
  infoSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginTop: 8,
  },
});
