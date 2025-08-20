import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor:
            Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.95)' : '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          height: Platform.OS === 'ios' ? 85 : 60,
          justifyContent: 'space-around',
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView intensity={20} tint="light" style={{ flex: 1 }} />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5EA',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: '#1a1a1a',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          headerTitle: 'VineMe',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarLabel: 'Groups',
          headerTitle: 'Bible Study Groups',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarLabel: 'Events',
          headerTitle: 'Events - Coming Soon!',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
          tabBarBadge: 'Beta',
          // Hide from the tab bar to avoid spacing gaps
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          headerTitle: 'My Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      {/* Remove security from the tab bar by disabling direct href */}
      <Tabs.Screen
        name="profile/security"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
