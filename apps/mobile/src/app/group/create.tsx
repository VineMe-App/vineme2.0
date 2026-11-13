import React, { useState, useEffect } from 'react';
import { Alert, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/Text';
import { useAuthStore } from '../../stores';
import { useErrorHandler } from '../../hooks';
import { groupCreationService } from '../../services/groupCreation';
import type { CreateGroupData } from '../../services/admin';
import GroupEditorForm, {
  GroupEditorValues,
} from '../../components/groups/GroupEditorForm';
import { groupMediaService } from '../../services/groupMedia';
import { safeGoBack } from '@/utils/navigation';

export default function CreateGroupPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { userProfile } = useAuthStore();
  const { handleError } = useErrorHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set custom header
  useEffect(() => {
    navigation.setOptions({
      header: () => (
        <View
          style={{
            height: 60 + insets.top,
            backgroundColor: '#FFFFFF',
            paddingTop: insets.top,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: 4,
              paddingBottom: 4,
              height: 60,
              position: 'relative',
            }}
          >
            <TouchableOpacity
              onPress={() => safeGoBack(router)}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={{
                width: 20,
                height: 20,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10,
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={20} color="#2C2235" />
            </TouchableOpacity>
            
            <Text
              numberOfLines={1}
              style={{
                fontSize: 22,
                fontWeight: '700',
                fontFamily: 'Figtree-Bold',
                color: '#2C2235',
                letterSpacing: -0.44,
                flex: 1,
                marginLeft: 12,
                lineHeight: 22,
                zIndex: 1,
              }}
            >
              Create new group
            </Text>
          </View>
        </View>
      ),
    });
  }, [navigation, insets.top, router]);

  const handleSubmit = async (values: GroupEditorValues) => {
    if (
      !userProfile?.id ||
      !userProfile?.church_id ||
      !userProfile?.service_id
    ) {
      Alert.alert(
        'Error',
        'Please complete your profile before creating a group.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const groupData: CreateGroupData = {
        title: values.title.trim(),
        description: values.description.trim(),
        meeting_day: values.meeting_day,
        meeting_time: values.meeting_time,
        location: {
          address: values.location.address || 'Pinned Location',
          ...(values.location.coordinates && {
            coordinates: values.location.coordinates,
          }),
        },
        service_id: userProfile.service_id,
        church_id: userProfile.church_id,
        whatsapp_link: values.whatsapp_link?.trim() || undefined,
        image_url: values.image_url || undefined,
      };

      const result = await groupCreationService.createGroupRequest(
        groupData,
        userProfile.id
      );
      if (result.error) throw result.error;

      Alert.alert(
        'Group Request Submitted! 🎉',
        'Your group creation request has been submitted for approval by your church admin. You will be notified once it has been reviewed.',
        [
          {
            text: 'OK',
            onPress: () => safeGoBack(router),
          },
        ]
      );
    } catch (error) {
      const err = error as Error;
      if (err.message && /RLS policy violation/i.test(err.message)) {
        Alert.alert(
          'Permission Required',
          'You do not have permission to create a group in this church. Please ensure you are signed in and your profile is connected to this church. If the issue persists, contact a church admin.'
        );
        if (__DEV__) console.warn('[CreateGroup] RLS policy violation', err);
        return;
      }
      handleError(err, {
        context: { action: 'create_group', userId: userProfile?.id },
        showAlert: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadImage = async (localUri: string) => {
    if (!userProfile?.id) {
      throw new Error('You must be signed in to upload a group photo.');
    }
    const { data, error } = await groupMediaService.uploadGroupImage(localUri, {
      uploaderId: userProfile.id,
    });
    if (error || !data) {
      throw error || new Error('Failed to upload group image');
    }
    return data;
  };

  return (
    <GroupEditorForm
      mode="create"
      subTitle="Share your group details and set your group location by using the map below."
      onSubmit={handleSubmit}
      onUploadImage={handleUploadImage}
      isSubmitting={isSubmitting}
    />
  );
}
