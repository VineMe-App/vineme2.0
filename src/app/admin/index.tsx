import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from '@/components/ui/Text';
import { AdminDashboardSummary } from '@/components/admin/AdminDashboardSummary';
import { Button } from '@/components/ui/Button';
import { PermissionGate } from '@/components/ui/RoleBasedRender';
import { router } from 'expo-router';

export default function AdminDashboardScreen() {
  const handleRefresh = () => {
    // No-op here; AdminDashboardSummary auto-refreshes via react-query interval.
    // Could expand to invalidate queries if needed.
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Church Admin Dashboard</Text>

        <AdminDashboardSummary onRefresh={handleRefresh} />

        <View style={styles.toolsSection}>
          <Text style={styles.toolsTitle}>Admin Tools</Text>
          <View style={styles.toolsRow}>
            <PermissionGate permission="manage_church_groups">
              <Button
                title="Manage Groups"
                onPress={() => router.push('/admin/manage-groups')}
                variant="secondary"
                size="small"
                style={styles.toolButton}
              />
            </PermissionGate>

            <PermissionGate permission="manage_church_users">
              <Button
                title="Manage Users"
                onPress={() => router.push('/admin/manage-users')}
                variant="secondary"
                size="small"
                style={styles.toolButton}
              />
            </PermissionGate>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  toolsSection: {
    marginTop: 8,
  },
  toolsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  toolButton: {
    minWidth: 140,
  },
});
