import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Platform,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { AuthHero } from '@/components/auth/AuthHero';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import type { OnboardingStepProps } from '@/types/app';
import { useAuthStore } from '@/stores/auth';
import { userService } from '@/services/users';
import { getFullName } from '@/utils/name';
import { useTheme } from '@/theme/provider/useTheme';

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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const bioInputRef = useRef<any>(null);
  const bioSectionRef = useRef<View>(null);
  const [bioSectionY, setBioSectionY] = useState(0);
  const { theme } = useTheme();

  useEffect(() => {
    setBio(data.bio ?? '');
    setAvatarUrl(data.avatar_url);
  }, [data.bio, data.avatar_url]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleBioFocus = () => {
    // Scroll to center the bio in the visible viewport when focused
    setTimeout(() => {
      const screenHeight = Dimensions.get('window').height;
      // Estimate keyboard height (typically around 300-350px)
      const keyboardHeight = Platform.OS === 'ios' ? 336 : 280;
      // Footer height (Done button + spacing)
      const footerHeight = 120;
      // Available visible height above keyboard and footer
      const visibleHeight = screenHeight - keyboardHeight - footerHeight;
      // Bio section height (approximately)
      const bioSectionHeight = 200;
      // Calculate scroll position to center the bio section
      const scrollOffset = bioSectionY - (visibleHeight / 2) + (bioSectionHeight / 2);
      scrollViewRef.current?.scrollTo({ 
        y: Math.max(0, scrollOffset), 
        animated: true 
      });
    }, 350); // Delay to allow keyboard to appear first
  };

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

      // userService.uploadAvatar expects a file URI string, not a blob
      const { data: uploadedUrl, error: uploadError } =
        await userService.uploadAvatar(user.id, uri);

      if (uploadError || !uploadedUrl) {
        throw uploadError || new Error('Upload failed');
      }

      setAvatarUrl(uploadedUrl);
    } catch (err) {
      console.error('Failed to upload avatar during onboarding:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to upload photo. Please try again.';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = () => {
    onNext({
      avatar_url: avatarUrl,
      bio: bio.trim(),
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.content}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {!isKeyboardVisible && (
              <AuthHero
                title="Add a friendly face"
                subtitle="Upload a photo and quick bio to help leaders get to know you. You can skip this step and update later."
                containerStyle={styles.heroSpacing}
              />
            )}
            {isKeyboardVisible && (
              <View style={styles.keyboardHeader}>
                <Text
                  variant="h4"
                  weight="black"
                  align="center"
                  color="primary"
                  style={styles.title}
                >
                  Add a friendly face
                </Text>
                <Text
                  variant="bodyLarge"
                  color="secondary"
                  align="center"
                  style={styles.subtitle}
                >
                  Upload a photo and quick bio to help leaders get to know you. You can skip this step and update later.
                </Text>
              </View>
            )}

            <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={handleChoosePhoto}
            disabled={uploading}
            activeOpacity={0.85}
          >
            {uploading ? (
              <View style={styles.avatarLoading}>
                <ActivityIndicator
                  size="large"
                  color={theme.colors.text.primary}
                />
              </View>
            ) : avatarUrl ? (
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                />
                <View style={styles.editIcon}>
                  <Ionicons
                    name="pencil-outline"
                    size={14}
                    color={theme.colors.text.primary}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="add" size={48} color="#999999" />
                <View style={styles.editIcon}>
                  <Ionicons
                    name="pencil-outline"
                    size={14}
                    color={theme.colors.text.primary}
                  />
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View 
          ref={bioSectionRef} 
          style={styles.bioSection}
          onLayout={(event) => {
            const { y } = event.nativeEvent.layout;
            setBioSectionY(y);
          }}
        >
          <Input
            ref={bioInputRef}
            label="Bio (optional)"
            value={bio}
            onChangeText={(text) => {
              if (text.length <= BIO_MAX_LENGTH) {
                setBio(text);
              }
            }}
            onFocus={handleBioFocus}
            placeholder="Tell us a little bit about yourself..."
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={BIO_MAX_LENGTH}
            editable={!isLoading && !uploading}
            containerStyle={styles.bioInputContainer}
            inputStyle={styles.bioInput}
          />
        </View>

            {error && (
              <Text variant="bodySmall" color="error" style={styles.errorText}>
                {error}
              </Text>
            )}
          </ScrollView>
        </View>

        <View style={styles.footer}>
        <View style={styles.footerSpacer} />
        <Button
          title="Done"
          variant="primary"
          onPress={handleContinue}
          loading={uploading || isLoading}
          disabled={uploading || isLoading}
          fullWidth
          style={styles.authButton}
        />
        <TouchableOpacity onPress={onBack} accessibilityRole="button">
          <Text variant="body" color="secondary" align="center">
            Back
          </Text>
        </TouchableOpacity>
      </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  heroSpacing: {
    marginTop: 16,
    marginBottom: 24,
  },
  keyboardHeader: {
    marginBottom: 32,
  },
  title: {
    marginBottom: 12,
    letterSpacing: -1.5,
    fontWeight: '900',
  },
  subtitle: {
    lineHeight: 24,
    letterSpacing: -0.2,
    maxWidth: 320,
    marginTop: 4,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 121,
    height: 121,
    borderRadius: 60.5,
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 121,
    height: 121,
    borderRadius: 60.5,
  },
  avatarPlaceholder: {
    width: 121,
    height: 121,
    borderRadius: 60.5,
    backgroundColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  editIcon: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  avatarLoading: {
    width: 121,
    height: 121,
    borderRadius: 60.5,
    backgroundColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bioSection: {
    gap: 8,
  },
  bioInputContainer: {
    marginBottom: 0,
  },
  bioInput: {
    minHeight: 165,
    textAlignVertical: 'top',
    paddingVertical: 16,
  },
  errorText: {
    marginTop: 16,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    width: '100%',
  },
  footerSpacer: {
    height: 32,
  },
  authButton: {
    marginBottom: 16,
  },
});
