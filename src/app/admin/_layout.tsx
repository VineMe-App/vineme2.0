import { Stack } from 'expo-router';
import { ChurchAdminOnly } from '@/components/ui/RoleBasedRender';
import { AdminErrorBoundary } from '@/components/ui/AdminErrorBoundary';
import { View, Text, StyleSheet } from 'react-native';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { router } from 'expo-router';

export default function AdminLayout() {
  return (
    <ChurchAdminOnly
      fallback={
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Access Denied</Text>
            <ErrorMessage
              message="You do not have permission to access admin features. Church admin role required."
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
              fontFamily: 'Manrope-Bold',
            },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="manage-groups" />
          <Stack.Screen name="manage-users" />
          <Stack.Screen name="notifications" />
        </Stack>
      </AdminErrorBoundary>
    </ChurchAdminOnly>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
