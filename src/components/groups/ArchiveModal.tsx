import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { MembershipNotesSection } from './MembershipNotesSection';
import { useGroupMembers } from '../../hooks/useGroups';
import { getFullName } from '../../utils/name';

interface ArchiveModalProps {
  visible: boolean;
  groupId: string;
  leaderId: string;
  onClose: () => void;
}

type ArchiveTab = 'requests' | 'members';

export const ArchiveModal: React.FC<ArchiveModalProps> = ({
  visible,
  groupId,
  leaderId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ArchiveTab>('requests');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const { data: allMembers, isLoading } = useGroupMembers(groupId);

  // Filter archived requests (pending that were archived)
  const archivedRequests =
    allMembers?.filter((m) => m.status === 'archived') || [];

  // Filter inactive members (were active, now inactive)
  const inactiveMembers =
    allMembers?.filter((m) => m.status === 'inactive') || [];

  const handleToggleExpand = (itemId: string) => {
    setExpandedItemId(expandedItemId === itemId ? null : itemId);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const currentData =
    activeTab === 'requests' ? archivedRequests : inactiveMembers;

  return (
    <Modal isVisible={visible} onClose={onClose} title="Archive">
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => {
            setActiveTab('requests');
            setExpandedItemId(null);
          }}
        >
          <Ionicons
            name="folder-outline"
            size={18}
            color={activeTab === 'requests' ? '#ec4899' : '#6b7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'requests' && styles.activeTabText,
            ]}
          >
            Archived Requests
          </Text>
          {archivedRequests.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{archivedRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.activeTab]}
          onPress={() => {
            setActiveTab('members');
            setExpandedItemId(null);
          }}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={activeTab === 'members' ? '#ec4899' : '#6b7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'members' && styles.activeTabText,
            ]}
          >
            Past Members
          </Text>
          {inactiveMembers.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{inactiveMembers.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="small" />
            <Text style={styles.loadingText}>Loading archive...</Text>
          </View>
        ) : currentData.length === 0 ? (
          <EmptyState
            title={
              activeTab === 'requests'
                ? 'No archived requests'
                : 'No past members'
            }
            message={
              activeTab === 'requests'
                ? 'Archived requests will appear here'
                : 'Members who have left will appear here'
            }
            icon={null}
          />
        ) : (
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {currentData.map((item) => {
              const fullName = getFullName(item.user);
              const isExpanded = expandedItemId === item.id;

              return (
                <View key={item.id} style={styles.itemContainer}>
                  <TouchableOpacity
                    style={styles.item}
                    onPress={() => handleToggleExpand(item.id)}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      size={44}
                      imageUrl={item.user?.avatar_url}
                      name={fullName || 'Unknown'}
                    />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>
                        {fullName || 'Unknown'}
                      </Text>
                      <Text style={styles.itemDate}>
                        {activeTab === 'requests'
                          ? `Request created: ${formatDate(item.joined_at)}`
                          : `Left on: ${formatDate(item.joined_at)}`}
                      </Text>
                      {activeTab === 'members' && (
                        <Badge variant="secondary" style={styles.roleBadge}>
                          Was {item.role}
                        </Badge>
                      )}
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>

                  {/* Expanded section with notes */}
                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      <MembershipNotesSection
                        membershipId={item.id}
                        groupId={groupId}
                        userId={item.user_id}
                        leaderId={leaderId}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Info Footer */}
      <View style={styles.footer}>
        <View style={styles.infoRow}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="#6b7280"
          />
          <Text style={styles.infoText}>
            {activeTab === 'requests'
              ? 'Archived requests were reviewed but not added to the group.'
              : 'Past members have left or been removed from the group.'}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#ec4899',
  },
  countBadge: {
    backgroundColor: '#ec4899',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  countText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    minHeight: 300,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  itemContainer: {
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
});

