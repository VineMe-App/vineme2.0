import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Text } from '../ui/Text';
import { FriendsList } from './FriendsList';
import { FriendSearch } from './FriendSearch';
import { useTheme } from '../../theme/provider/useTheme';

interface FriendManagementModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
}

export function FriendManagementModal({
  visible,
  onClose,
  userId,
}: FriendManagementModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [showSearch, setShowSearch] = useState(false);

  const handleViewProfile = useCallback(
    (profileId: string) => {
      if (!profileId) return;
      onClose();
      const delay = Platform.OS === 'ios' ? 350 : 50;
      setTimeout(() => {
        router.push(`/user/${profileId}`);
      }, delay);
    },
    [onClose]
  );

  const handleAddFriend = useCallback(() => {
    setShowSearch(true);
  }, []);

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
          {
            backgroundColor: '#FFFFFF',
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={20} color="#2C2235" />
          </TouchableOpacity>
          <Text style={styles.title}>My friends</Text>
        </View>

        {/* Content with tabs */}
        <View style={styles.content}>
          {showSearch ? (
            <FriendSearch onClose={() => setShowSearch(false)} />
          ) : (
            <FriendsList 
              userId={userId} 
              onViewProfile={handleViewProfile}
              onAddFriend={handleAddFriend}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
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
