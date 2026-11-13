import React from 'react';
import { View } from 'react-native';
import { AdminPageLayout } from '@/components/admin/AdminHeader';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { router } from 'expo-router';

// This screen is deprecated in favor of the unified notifications panel.
// Keep a lightweight redirect with context for users who navigate here via old links.
export default function AdminNotificationsScreen() {
  return (
    <AdminPageLayout title="Notifications">
      <View style={{ padding: 16, gap: 12 }}>
        <Text variant="body">Notifications have moved.</Text>
        <Text variant="caption" color="secondary">
          You can view all notifications from the main Notifications screen.
        </Text>
        <Button
          title="Go to Notifications"
          onPress={() => router.replace('/notifications')}
        />
      </View>
    </AdminPageLayout>
  );
}
