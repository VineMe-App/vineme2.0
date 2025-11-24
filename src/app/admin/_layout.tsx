import { Stack } from 'expo-router';
import { ChurchAdminOnly } from '@/components/ui/RoleBasedRender';
import { AdminErrorBoundary } from '@/components/ui/AdminErrorBoundary';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { router } from 'expo-router';
import { useTheme } from '@/theme/provider/useTheme';

export default function AdminLayout() {
  const { theme } = useTheme();
  
  return (
    <ChurchAdminOnly
      fallback={
        <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Access Denied</Text>
            <ErrorMessage
              error="You do not have permission to access admin features. Church admin role required."
              onRetry={() => router.back()}
            />
          </View>
        </View>
      }
    >
      <AdminErrorBoundary>
        <Stack
          screenOptions={{
            headerShown: false,
            headerTitleStyle: {
              fontFamily: 'Figtree-Bold',
            },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
              title: 'Admin Dashboard',
            }}
          />
          <Stack.Screen
            name="manage-groups"
            options={{
              headerShown: false,
              title: 'Manage Groups',
            }}
          />
          <Stack.Screen
            name="manage-users"
            options={{
              headerShown: false,
              title: 'Manage Users',
            }}
          />
          <Stack.Screen
            name="notifications"
            options={{
              headerShown: false,
              title: 'Notifications',
            }}
          />
        </Stack>
      </AdminErrorBoundary>
    </ChurchAdminOnly>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 16,
    textAlign: 'center',
  },
});
