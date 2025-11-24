import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores';
import { useErrorHandler } from '../../hooks';
import { groupCreationService } from '../../services/groupCreation';
import type { CreateGroupData } from '../../services/admin';
import GroupEditorForm, {
  GroupEditorValues,
} from '../../components/groups/GroupEditorForm';
import { groupMediaService } from '../../services/groupMedia';
import { Header } from '../../components/ui/Header';

export default function CreateGroupPage() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const { handleError } = useErrorHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            onPress: () => router.back(),
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
    <>
      <Stack.Screen
        options={{
          header: () => <Header title="Create New Group" />,
        }}
      />
      <GroupEditorForm
        mode="create"
        subTitle="Share your group details and set your group location by using the map below."
        onSubmit={handleSubmit}
        onUploadImage={handleUploadImage}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
