import React, { useMemo, useState } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Header } from '@/components/ui/Header';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { useGroup } from '@/hooks/useGroups';
import { useAuthStore } from '@/stores/auth';
import { useUpdateGroupDetails } from '@/hooks/useGroupLeaderActions';
import GroupEditorForm, {
  GroupEditorValues,
  GroupEditorLocation,
} from '@/components/groups/GroupEditorForm';
import { groupMediaService } from '@/services/groupMedia';
import { useTheme } from '@/theme/provider/useTheme';

const parseLocation = (location: any): GroupEditorLocation => {
  if (!location) return {};
  if (typeof location === 'string') {
    return { address: location };
  }
  const address =
    typeof location?.address === 'string' ? location.address : undefined;
  const coordinates =
    location?.coordinates &&
    typeof location.coordinates.latitude === 'number' &&
    typeof location.coordinates.longitude === 'number'
      ? {
          latitude: location.coordinates.latitude,
          longitude: location.coordinates.longitude,
        }
      : null;
  return {
    address,
    coordinates,
  };
};

export default function EditGroupScreen() {
  const params = useLocalSearchParams<{ groupId?: string | string[] }>();
  const groupId = Array.isArray(params.groupId)
    ? params.groupId[0]
    : params.groupId;
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const { theme } = useTheme();
  const updateGroupMutation = useUpdateGroupDetails();
  const [submitting, setSubmitting] = useState(false);

  const { data: group, isLoading, error, refetch } = useGroup(groupId);

  const canManage = useMemo(() => {
    if (!group || !userProfile) return false;
    const isLeader = group.memberships?.some(
      (membership) =>
        membership.user_id === userProfile.id &&
        (membership.role === 'leader' || membership.role === 'admin')
    );
    const isChurchAdminForService = Boolean(
      userProfile.roles?.includes('church_admin') &&
        userProfile.service_id &&
        group.service_id &&
        userProfile.service_id === group.service_id
    );
    return Boolean(isLeader || isChurchAdminForService);
  }, [group, userProfile]);

  const initialValues = useMemo(() => {
    if (!group) return undefined;
    return {
      title: group.title,
      description: group.description,
      meeting_day: group.meeting_day,
      meeting_time: group.meeting_time,
      location: parseLocation(group.location),
      whatsapp_link: group.whatsapp_link || undefined,
      image_url: group.image_url || undefined,
    } as GroupEditorValues;
  }, [group]);

  const handleUploadImage = async (localUri: string) => {
    if (!groupId) {
      throw new Error('Group not found.');
    }
    const { data, error: uploadError } =
      await groupMediaService.uploadGroupImage(localUri, {
        groupId,
        uploaderId: userProfile?.id,
      });
    if (uploadError || !data) {
      throw uploadError || new Error('Failed to upload group image');
    }
    return data;
  };

  const handleSubmit = async (values: GroupEditorValues) => {
    if (!groupId || !userProfile?.id) {
      Alert.alert('Error', 'You are not authorized to update this group.');
      return;
    }

    setSubmitting(true);
    try {
      await updateGroupMutation.mutateAsync({
        groupId,
        userId: userProfile.id,
        updates: {
          title: values.title.trim(),
          description: values.description.trim(),
          meeting_day: values.meeting_day,
          meeting_time: values.meeting_time,
          location: {
            address: values.location.address,
            ...(values.location.coordinates && {
              coordinates: values.location.coordinates,
            }),
          },
          whatsapp_link: values.whatsapp_link?.trim() || null,
          image_url:
            values.image_url === null ? null : values.image_url || undefined,
        },
      });

      Alert.alert('Success', 'Group details updated successfully.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
      refetch();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to update group details'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background.primary }]}>
      <Stack.Screen
        options={{
          header: () => (
            <Header
              title={group?.title ? `${group.title} Settings` : 'Edit Group'}
            />
          ),
        }}
      />

      {isLoading && (
        <View style={styles.centerContent}>
          <LoadingSpinner />
          <Text style={styles.centerText}>Loading group details…</Text>
        </View>
      )}

      {!isLoading && error && (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>
            We couldn't load this group right now. Please try again shortly.
          </Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      )}

      {!isLoading && group && !canManage && (
        <View style={styles.centerContent}>
          <Text style={styles.centerText}>
            You need to be a group leader or church admin to edit this group.
          </Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      )}

      {!isLoading && group && canManage && initialValues && (
        <GroupEditorForm
          mode="edit"
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onUploadImage={handleUploadImage}
          isSubmitting={submitting}
          headerTitle={group.title}
          subTitle="Update the group details and keep members informed."
          onCancel={() => router.back()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  centerText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    color: '#4b5563',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#b91c1c',
    marginBottom: 16,
  },
});
