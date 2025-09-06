import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme/provider/useTheme';
import { Text } from '@/components/ui/Text';

// Custom header component for home tab only
const HomeHeader = () => (
  <Text variant="h4" weight="semiBold">
    VineMe
  </Text>
);

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary[500],
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          height: Platform.OS === 'ios' ? 85 : 60,
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
          headerTitle: () => <HomeHeader />,
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
