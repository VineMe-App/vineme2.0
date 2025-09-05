import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme/provider/useTheme';
import { Text } from '@/components/ui/Text';
import { NotificationIconWithBadge } from '@/components/ui/NotificationIconWithBadge';
import { useNotificationBadge } from '@/hooks/useNotifications';
import { useAuthStore } from '@/stores/auth';
import { useState } from 'react';
import { useRouter } from 'expo-router';

// Custom header component for home tab with notification icon
const HomeHeader = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { count: unreadCount } = useNotificationBadge(user?.id);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);

  const handleNotificationPress = () => {
    // Navigate to the notifications page
    router.push('/notifications');
  };

  return (
    <View style={styles.headerContainer}>
      <Text variant="h4" weight="semiBold">
        VineMe
      </Text>
      <NotificationIconWithBadge
        onPress={handleNotificationPress}
        unreadCount={unreadCount}
        size={24}
        color={theme.colors.text.primary}
        badgeColor={theme.colors.error[500]}
        testID="home-notification-icon"
        accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ', no unread notifications'}`}
        accessibilityHint="Double tap to open notifications panel"
      />
    </View>
  );
};

export default function TabLayout() {
  const { theme } = useTheme();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary[500],
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor:
            Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.95)' : theme.colors.surface.primary,
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
          fontFamily: theme.typography.fontFamily.medium,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface.primary,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5EA',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontFamily: theme.typography.fontFamily.bold,
          color: '#1a1a1a',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          headerTitle: () => <HomeHeader />,
          headerTitleAlign: 'left',
          headerTitleContainerStyle: {
            left: 0,
            right: 0,
          },
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
          headerShown: false,
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
          headerShown: false,
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

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
  },
});
