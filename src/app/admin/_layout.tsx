import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="manage-groups" />
      <Stack.Screen name="manage-users" />
    </Stack>
  );
}
