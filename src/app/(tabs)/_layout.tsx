import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme/provider/useTheme';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationIconWithBadge } from '@/components/ui/NotificationIconWithBadge';
import { useNotificationBadge } from '@/hooks/useNotifications';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Custom header component for home tab with notification icon
const HomeHeader = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { count: unreadCount } = useNotificationBadge(user?.id);

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

// Custom profile tab icon component
const ProfileTabIcon = ({ color, size }: { color: string; size: number }) => {
  const { userProfile } = useAuthStore();
  return (
    <Avatar
      imageUrl={userProfile?.avatar_url}
      name={userProfile?.name || 'User'}
      size={size}
    />
  );
};

export default function TabLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  // Nudge bottom padding slightly to avoid marginal cutoff on Android
  const androidBottomPadding = Math.max(insets.bottom + 4, 12);
  const tabBarHeight =
    Platform.OS === 'ios' ? 85 : 56 + androidBottomPadding;
  const headerHeight = Platform.OS === 'ios' ? 60 + insets.top : 56 + insets.top;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary[500],
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? 20 : androidBottomPadding,
          paddingTop: Platform.OS === 'ios' ? 10 : 8,
          height: tabBarHeight,
          justifyContent: 'space-around',
          position: 'absolute',
          elevation: Platform.OS === 'android' ? 8 : 0,
          shadowColor: theme.name === 'dark' ? '#000000' : '#000000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: theme.name === 'dark' ? 0.3 : 0.1,
          shadowRadius: 4,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={Platform.OS === 'ios' ? 80 : 100}
            tint={theme.name === 'dark' ? 'dark' : 'light'}
            experimentalBlurMethod={
              Platform.OS === 'android' ? 'dimezisBlurView' : undefined
            }
            style={{
              flex: 1,
              backgroundColor:
                theme.name === 'dark'
                  ? 'rgba(30, 41, 59, 0.3)'
                  : 'rgba(255, 255, 255, 0.3)',
            }}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: theme.typography.fontFamily.medium,
        },
        headerStyle: {
          backgroundColor: 'transparent',
          borderBottomWidth: 0,
          elevation: Platform.OS === 'android' ? 8 : 0,
          height: headerHeight,
          paddingTop: insets.top,
          shadowColor: theme.name === 'dark' ? '#000000' : '#000000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: theme.name === 'dark' ? 0.3 : 0.1,
          shadowRadius: 4,
        },
        headerBackground: () => (
          <BlurView
            intensity={Platform.OS === 'ios' ? 80 : 100}
            tint={theme.name === 'dark' ? 'dark' : 'light'}
            experimentalBlurMethod={
              Platform.OS === 'android' ? 'dimezisBlurView' : undefined
            }
            style={{
              flex: 1,
              backgroundColor:
                theme.name === 'dark'
                  ? 'rgba(30, 41, 59, 0.3)'
                  : 'rgba(255, 255, 255, 0.3)',
            }}
          />
        ),
        headerTitleStyle: {
          fontSize: 18,
          fontFamily: theme.typography.fontFamily.bold,
          color: theme.colors.text.primary,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          headerShown: false,
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
          headerTitle: 'Events',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
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
            <ProfileTabIcon color={color} size={size} />
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
      <Tabs.Screen
        name="profile/communication"
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
