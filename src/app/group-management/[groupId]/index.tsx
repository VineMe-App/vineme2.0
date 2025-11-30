import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { AuthLoadingAnimation } from '@/components/auth/AuthLoadingAnimation';
import { Button } from '@/components/ui/Button';
import { GroupLeaderPanel } from '@/components/groups/GroupLeaderPanel';
import { useGroup } from '@/hooks/useGroups';
import { useAuthStore } from '@/stores/auth';

export default function GroupManagementScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string | string[] }>();
  const { userProfile } = useAuthStore();

  const resolvedGroupId = useMemo(() => {
    if (!groupId) return undefined;
    return Array.isArray(groupId) ? groupId[0] : groupId;
  }, [groupId]);

  const { data: group, isLoading, error, refetch } = useGroup(resolvedGroupId);

  const hasAccess = useMemo(() => {
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

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: group?.title
            ? `${group.title} Management`
            : 'Group Management',
        }}
      />

      {isLoading && (
        <View style={styles.centerContent}>
          <AuthLoadingAnimation />
          <Text style={styles.centerText}>Loading group details…</Text>
        </View>
      )}

      {!isLoading && error && (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>
            We couldn't load this group right now. Please try again shortly.
          </Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            style={styles.backButton}
          />
        </View>
      )}

      {!isLoading && group && !hasAccess && (
        <View style={styles.centerContent}>
          <Text style={styles.centerText}>
            You need to be a group leader or church admin to manage this group.
          </Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            style={styles.backButton}
          />
        </View>
      )}

      {!isLoading && group && hasAccess && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <GroupLeaderPanel group={group} onGroupUpdated={refetch} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
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
  backButton: {
    marginTop: 16,
    alignSelf: 'center',
    minWidth: 160,
  },
});
