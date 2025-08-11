import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { FriendsList } from './FriendsList';
import { FriendSearch } from './FriendSearch';

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
  const [activeTab, setActiveTab] = useState<TabType>('friends');

  const renderTabButton = (tab: TabType, label: string) => {
    const isActive = activeTab === tab;

    return (
      <TouchableOpacity
        style={[styles.tabButton, isActive && styles.activeTabButton]}
        onPress={() => setActiveTab(tab)}
      >
        <Text
          style={[styles.tabButtonText, isActive && styles.activeTabButtonText]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Friends</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          {renderTabButton('friends', 'My Friends')}
          {renderTabButton('search', 'Find Friends')}
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: '#8b5cf6',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabButtonText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
});
