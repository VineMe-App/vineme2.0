import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet, Image } from 'react-native';
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
import Svg, { Path, G, Circle } from 'react-native-svg';

// Custom header component for home tab with notification icon
const HomeHeader = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { count: unreadCount = 0 } = useNotificationBadge(user?.id);

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

// Custom icon components using Figma SVGs
const HomeIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <G id="home-2">
      <Path
        id="Vector"
        d="M9.02 2.84L3.63 7.04C2.73 7.74 2 9.23 2 10.36V17.77C2 20.09 3.89 21.99 6.21 21.99H17.79C20.11 21.99 22 20.09 22 17.78V10.5C22 9.29 21.19 7.74 20.2 7.05L14.02 2.72C12.62 1.74 10.37 1.79 9.02 2.84Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        id="Vector_2"
        d="M12 17.99V14.99"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  </Svg>
);

const GroupsIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <G id="profile-2user">
      <Path
        id="Vector"
        d="M9.16 10.87C9.06 10.86 8.94 10.86 8.83 10.87C6.45 10.79 4.56 8.84 4.56 6.44C4.56 3.99 6.54 2 9 2C11.45 2 13.44 3.99 13.44 6.44C13.43 8.84 11.54 10.79 9.16 10.87Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        id="Vector_2"
        d="M16.41 4C18.35 4 19.91 5.57 19.91 7.5C19.91 9.39 18.41 10.93 16.54 11C16.46 10.99 16.37 10.99 16.28 11"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        id="Vector_3"
        d="M4.16 14.56C1.74 16.18 1.74 18.82 4.16 20.43C6.91 22.27 11.42 22.27 14.17 20.43C16.59 18.81 16.59 16.17 14.17 14.56C11.43 12.73 6.92 12.73 4.16 14.56Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        id="Vector_4"
        d="M18.34 20C19.06 19.85 19.74 19.56 20.3 19.13C21.86 17.96 21.86 16.03 20.3 14.86C19.75 14.44 19.08 14.16 18.37 14"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  </Svg>
);

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
  const headerHeight = 44 + insets.top;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary[500], // Primary pink color
        tabBarInactiveTintColor: theme.colors.text.primary, // Dark color for unselected tabs
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
          backgroundColor: '#FFFFFF', // White background
          borderBottomWidth: 0,
          elevation: Platform.OS === 'android' ? 0 : 0,
          height: headerHeight,
          paddingTop: insets.top,
          shadowColor: 'transparent',
          shadowOffset: {
            width: 0,
            height: 0,
          },
          shadowOpacity: 0,
          shadowRadius: 0,
        },
        headerBackground: () => (
          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF', // Solid white background
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
            <HomeIcon color={color} size={size} />
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
            <GroupsIcon color={color} size={size} />
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
          headerShown: true,
          headerTitle: 'Profile',
          headerTitleStyle: {
            fontSize: 22, // Figma: 22px
            fontFamily: theme.typography.fontFamily.bold,
            fontWeight: '800', // ExtraBold
            color: '#2C2235', // Figma: #2c2235
            letterSpacing: -0.44, // Figma: -0.44px
          },
          headerStyle: {
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 0,
            elevation: 0,
            height: Platform.OS === 'ios' ? 60 + insets.top : 60,
            paddingTop: Platform.OS === 'ios' ? insets.top : 0,
            paddingHorizontal: 19, // Match Groups page padding
            paddingBottom: 0, // No bottom padding in header
            shadowOpacity: 0,
          },
          headerTitleContainerStyle: {
            paddingLeft: 0, // Remove default left padding to match Groups page
          },
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
          headerShown: false,
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
