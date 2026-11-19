import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AdminDashboardSummary } from '@/components/admin/AdminDashboardSummary';
import { AdminPageLayout } from '@/components/admin/AdminHeader';

export default function AdminDashboardScreen() {
  const handleRefresh = () => {
    // AdminDashboardSummary handles its own data refresh intervals.
  };

  return (
    <AdminPageLayout title="Admin Dashboard">
      <View style={styles.content}>
        <AdminDashboardSummary onRefresh={handleRefresh} />
      </View>
    </AdminPageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});
