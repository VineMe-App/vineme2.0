import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
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
import { AuthButton } from '@/components/auth/AuthButton';
import { Ionicons } from '@expo/vector-icons';
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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const bioInputRef = useRef<TextInput>(null);
  const bioSectionRef = useRef<View>(null);
  const [bioSectionY, setBioSectionY] = useState(0);

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
            <View style={styles.header}>
              <Text variant="h4" weight="extraBold" align="center" style={styles.title}>
                Add a friendly face
              </Text>
              <Text
                variant="bodyLarge"
                color="primary"
                align="center"
                style={styles.subtitle}
              >
                Upload a photo and quick bio to help leaders get to know you. You can skip this step and update later.
              </Text>
            </View>

            <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={handleChoosePhoto}
            disabled={uploading}
            activeOpacity={0.85}
          >
            {uploading ? (
              <View style={styles.avatarLoading}>
                <ActivityIndicator size="large" color="#2C2235" />
              </View>
            ) : avatarUrl ? (
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                />
              </View>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="add" size={48} color="#999999" />
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
          <Text variant="body" weight="semiBold" style={styles.label}>
            Bio (optional)
          </Text>
          <TextInput
            ref={bioInputRef}
            style={styles.bioInput}
            placeholder="Tell us a little bit about yourself..."
            placeholderTextColor="#CBCBCB"
            value={bio}
            onChangeText={(text) => {
              if (text.length <= BIO_MAX_LENGTH) {
                setBio(text);
              }
            }}
            onFocus={handleBioFocus}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={BIO_MAX_LENGTH}
            editable={!isLoading && !uploading}
          />
        </View>

            {error && (
              <Text variant="bodySmall" color="error" style={styles.errorText}>
                {error}
              </Text>
            )}
          </ScrollView>
        </View>

        <View style={[styles.footer, isKeyboardVisible && styles.footerKeyboardVisible]}>
          <AuthButton
            title="Done"
            onPress={handleContinue}
            loading={uploading || isLoading}
            disabled={uploading || isLoading}
          />
          <TouchableOpacity onPress={onBack} accessibilityRole="button" style={styles.backButton}>
            <Text variant="body" align="center" style={styles.backText}>
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
    paddingHorizontal: 53, // Match other pages
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 75, // Match other pages title marginTop
  },
  title: {
    color: '#2C2235',
    fontSize: 26, // Figma: 26px
    lineHeight: 40, // Figma: 40px
    letterSpacing: -0.52, // Figma: -0.52px
    marginBottom: 20, // Spacing to subtitle
  },
  subtitle: {
    color: '#2C2235',
    fontSize: 16, // Figma: 16px
    lineHeight: 22, // Figma: 22px
    letterSpacing: -0.32, // Figma: -0.32px
    maxWidth: 325, // Figma: 325px
    marginTop: 0,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 27, // Spacing from avatar (315px) to bio label (444px) = 129px - 121px avatar - spacing
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
  avatarLoading: {
    width: 121,
    height: 121,
    borderRadius: 60.5,
    backgroundColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bioSection: {
    gap: 8, // Spacing between label and input
    marginBottom: 32,
  },
  label: {
    color: '#2C2235',
    fontSize: 16, // Figma: 16px
    fontWeight: '700', // Bold
    letterSpacing: -0.32, // Figma: -0.32px
    lineHeight: 22, // Figma: 22px
  },
  bioInput: {
    borderWidth: 2,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    paddingVertical: 17, // Figma: 488px - 471px = 17px top padding
    paddingHorizontal: 14, // Figma: 62px - 48px = 14px left padding
    fontSize: 16, // Figma: 16px
    backgroundColor: '#FFFFFF',
    color: '#2C2235',
    height: 126, // Figma: 126px
    width: '100%', // Full width within container (container has 53px padding)
    textAlignVertical: 'top',
    letterSpacing: -0.32, // Figma: -0.32px
    lineHeight: 22, // Figma: 22px
  },
  errorText: {
    marginTop: 16,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 100, // Match other pages footer spacing
    paddingTop: 16,
  },
  footerKeyboardVisible: {
    marginBottom: -70, // Reduced margin when keyboard is visible
  },
  backButton: {
    marginTop: 16,
  },
  backText: {
    color: '#999999', // Match other pages
    fontSize: 16,
    letterSpacing: -0.8,
  },
});
