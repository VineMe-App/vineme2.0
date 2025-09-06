import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FriendsList } from './FriendsList';
import { FriendSearch } from './FriendSearch';
import { useTheme } from '../../theme/provider/useTheme';
import {
  useFriends,
  useSentFriendRequests,
  useReceivedFriendRequests,
} from '../../hooks/useFriendships';

interface FriendManagementModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
}

type TabType = 'friends' | 'search';

export function FriendManagementModal({
  visible,
  onClose,
  userId,
}: FriendManagementModalProps) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const slideAnimation = useRef(
    new Animated.Value(activeTab === 'friends' ? 0 : 1)
  ).current;
  const [containerWidth, setContainerWidth] = React.useState(0);

  // Queries for refresh functionality
  const friendsQuery = useFriends(userId);
  const sentRequestsQuery = useSentFriendRequests(userId);
  const receivedRequestsQuery = useReceivedFriendRequests(userId);

  const handleRefresh = async () => {
    try {
      await Promise.all([
        friendsQuery.refetch(),
        sentRequestsQuery.refetch(),
        receivedRequestsQuery.refetch(),
      ]);
    } catch (error) {
      console.error('Error refreshing friends data:', error);
    }
  };

  useEffect(() => {
    Animated.timing(slideAnimation, {
      toValue: activeTab === 'friends' ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [activeTab, slideAnimation]);

  const translateX = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, containerWidth / 2)],
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        <View
          style={[
            styles.header,
            { borderBottomColor: theme.colors.border.primary },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                fontFamily: theme.typography.fontFamily.semiBold,
                color: theme.colors.text.primary,
              },
            ]}
          >
            Friends
          </Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={handleRefresh}
              style={[
                styles.refreshButton,
                { backgroundColor: theme.colors.secondary[100] },
              ]}
              accessibilityLabel="Refresh friends data"
              accessibilityRole="button"
            >
              <Ionicons
                name="refresh"
                size={20}
                color={theme.colors.primary[500]}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: theme.colors.secondary[100] },
              ]}
            >
              <Text
                style={[
                  styles.closeButtonText,
                  {
                    fontFamily: theme.typography.fontFamily.medium,
                    color: theme.colors.primary[500],
                  },
                ]}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <View
            style={[
              styles.toggleContainer,
              {
                borderColor: theme.colors.secondary[100],
                backgroundColor: theme.colors.secondary[100],
              },
            ]}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          >
            {/* Animated sliding background */}
            <Animated.View
              style={[
                styles.slidingBackground,
                {
                  backgroundColor: theme.colors.primary[500],
                  transform: [{ translateX }],
                },
              ]}
            />

            {/* My Friends button */}
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setActiveTab('friends')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleText,
                  {
                    fontFamily: theme.typography.fontFamily.medium,
                    color:
                      activeTab === 'friends'
                        ? theme.colors.secondary[100] // Green when selected
                        : theme.colors.primary[500], // Pink when not selected
                  },
                ]}
              >
                My Friends
              </Text>
            </TouchableOpacity>

            {/* Find Friends button */}
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setActiveTab('search')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleText,
                  {
                    fontFamily: theme.typography.fontFamily.medium,
                    color:
                      activeTab === 'search'
                        ? theme.colors.secondary[100] // Green when selected
                        : theme.colors.primary[500], // Pink when not selected
                  },
                ]}
              >
                Find Friends
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {activeTab === 'friends' ? (
            <FriendsList userId={userId} />
          ) : (
            <FriendSearch />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 25,
    padding: 3,
    borderWidth: 2,
    position: 'relative',
    height: 50,
  },
  slidingBackground: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: '50%',
    height: 46,
    borderRadius: 23,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 10,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    zIndex: 25,
    includeFontPadding: false,
    textAlignVertical: Platform.OS === 'android' ? 'center' : undefined,
    lineHeight: Platform.OS === 'android' ? 18 : 16,
    paddingBottom: Platform.OS === 'android' ? 1 : 0,
  },
  content: {
    flex: 1,
  },
});
