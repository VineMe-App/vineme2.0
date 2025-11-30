import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Text } from '../components/ui/Text';
import { FriendsList } from '../components/friends/FriendsList';
import { useAuth } from '@/hooks/useAuth';

type FilterType = 'friends' | 'received' | 'sent';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('friends');

  // Set header options
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleViewProfile = useCallback(
    (profileId: string) => {
      if (!profileId) return;
      const delay = Platform.OS === 'ios' ? 350 : 50;
      setTimeout(() => {
        router.push(`/user/${profileId}`);
      }, delay);
    },
    []
  );

  const handleAddFriend = useCallback(() => {
    setShowSearch(true);
  }, []);

  const handleBack = useCallback(() => {
    // Always go back to profile, regardless of search state
    router.back();
  }, []);

  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
    // Exit search mode when switching tabs
    setShowSearch(false);
  }, []);

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: '#FFFFFF',
        },
      ]}
      edges={['left', 'right', 'bottom']}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color="#2C2235" />
        </TouchableOpacity>
        <Text style={styles.title}>My friends</Text>
      </View>

      {/* Content with tabs and search */}
      <View style={styles.content}>
        <FriendsList 
          userId={user?.id} 
          onViewProfile={handleViewProfile}
          onAddFriend={handleAddFriend}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          showSearch={showSearch}
          onSearchChange={setShowSearch}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 22, // Figma: 22px
    fontWeight: '700', // Bold
    color: '#2C2235', // Figma: #2c2235
    letterSpacing: -0.44, // Figma: -0.44px
    lineHeight: 22,
    marginLeft: 12,
  },
  content: {
    flex: 1,
  },
});
