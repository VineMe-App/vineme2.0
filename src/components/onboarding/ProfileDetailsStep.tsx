import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { OnboardingStepProps } from '@/types/app';
import { useAuthStore } from '@/stores/auth';
import { userService } from '@/services/users';
import { getFullName } from '@/utils/name';

const BIO_MAX_LENGTH = 240;

export default function ProfileDetailsStep({
  data,
  onNext,
  onBack,
  canGoBack,
  isLoading,
}: OnboardingStepProps) {
  const { user } = useAuthStore();
  const [bio, setBio] = useState(data.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    data.avatar_url
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBio(data.bio ?? '');
    setAvatarUrl(data.avatar_url);
  }, [data.bio, data.avatar_url]);

  const handleChoosePhoto = () => {
    Alert.alert('Profile photo', 'Choose an option', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Choose from library',
        onPress: pickImage,
      },
      {
        text: 'Take photo',
        onPress: takePhoto,
      },
    ]);
  };

  const ensurePermission = async (
    type: 'camera' | 'library'
  ): Promise<boolean> => {
    if (type === 'library') {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please allow access to your photo library to add a profile picture.'
        );
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please allow camera access to take a profile photo.'
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const granted = await ensurePermission('library');
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const granted = await ensurePermission('camera');
    if (!granted) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to upload a photo.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data: uploadedUrl, error: uploadError } =
        await userService.uploadAvatar(user.id, blob);

      if (uploadError || !uploadedUrl) {
        throw uploadError || new Error('Upload failed');
      }

      setAvatarUrl(uploadedUrl);
    } catch (err) {
      console.error('Failed to upload avatar during onboarding:', err);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert('Remove photo', 'Do you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setAvatarUrl(undefined);
        },
      },
    ]);
  };

  const handleContinue = () => {
    onNext({
      avatar_url: avatarUrl,
      bio: bio.trim(),
    });
  };

  const handleSkip = () => {
    onNext({});
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Add a friendly face</Text>
        <Text style={styles.subtitle}>
          Upload a profile photo and share a short bio so leaders know a little
          more about you. You can always skip this step and add it later.
        </Text>

        <View style={styles.avatarSection}>
          <Avatar
            size={120}
            imageUrl={avatarUrl}
            name={getFullName({
              first_name: data.first_name,
              last_name: data.last_name,
            })}
            onPress={handleChoosePhoto}
            showEditIcon
          />
          <View style={styles.photoButtons}>
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={handleChoosePhoto}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryActionText}>Upload photo</Text>
              )}
            </TouchableOpacity>
            {avatarUrl ? (
              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={handleRemovePhoto}
                disabled={uploading}
              >
                <Text style={styles.secondaryActionText}>Remove photo</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.bioSection}>
          <Text style={styles.label}>Bio (optional)</Text>
          <TextInput
            style={styles.bioInput}
            placeholder="Tell us a little about yourself..."
            placeholderTextColor="#666"
            value={bio}
            onChangeText={(text) => {
              if (text.length <= BIO_MAX_LENGTH) {
                setBio(text);
              }
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={BIO_MAX_LENGTH}
          />
          <Text style={styles.charCount}>
            {bio.length}/{BIO_MAX_LENGTH}
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <Button
          title="Back"
          variant="ghost"
          onPress={onBack}
          disabled={!canGoBack || uploading || isLoading}
          fullWidth
        />
        <Button
          title="Skip"
          variant="secondary"
          onPress={handleSkip}
          disabled={uploading || isLoading}
          fullWidth
        />
        <Button
          title="Continue"
          onPress={handleContinue}
          loading={uploading || isLoading}
          disabled={uploading || isLoading}
          variant="primary"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  photoButtons: {
    marginTop: 16,
    alignItems: 'center',
    gap: 12,
  },
  primaryAction: {
    backgroundColor: '#007AFF',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 180,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryAction: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryActionText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  bioSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 120,
  },
  charCount: {
    marginTop: 8,
    fontSize: 13,
    color: '#888',
    textAlign: 'right',
  },
  errorText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#d73a49',
  },
  footer: {
    gap: 12,
  },
});
