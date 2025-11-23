import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { useGroupFiltersStore } from '../../stores/groupFilters';
import { Modal } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/provider/useTheme';

interface FilterPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const MEETING_DAYS = [
  { label: 'Sunday', value: 'Sunday' },
  { label: 'Monday', value: 'Monday' },
  { label: 'Tuesday', value: 'Tuesday' },
  { label: 'Wednesday', value: 'Wednesday' },
  { label: 'Thursday', value: 'Thursday' },
  { label: 'Friday', value: 'Friday' },
  { label: 'Saturday', value: 'Saturday' },
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isVisible,
  onClose,
}) => {
  const { theme } = useTheme();
  const {
    filters,
    setMeetingDays,
    setOnlyWithFriends,
    setHideFullGroups,
    setSearchQuery,
  } = useGroupFiltersStore();

  const [localSearchQuery, setLocalSearchQuery] = useState(filters.searchQuery);
  const styles = createStyles(theme);

  const handleMeetingDayToggle = (day: string) => {
    const newDays = filters.meetingDays.includes(day)
      ? filters.meetingDays.filter((d) => d !== day)
      : [...filters.meetingDays, day];
    setMeetingDays(newDays);
  };

  const handleSearchSubmit = () => {
    setSearchQuery(localSearchQuery);
  };

  return (
    <Modal
      isVisible={isVisible}
      onClose={onClose}
      variant="centered"
      scrollable={false}
      closeOnOverlayPress={true}
      showCloseButton={false}
      size="medium"
    >
      <View style={styles.modalContent}>
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color="#2C2235" />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>Filter groups</Text>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Search Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search</Text>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Hinted search text"
                placeholderTextColor="rgba(44, 34, 53, 0.35)"
                value={localSearchQuery}
                onChangeText={setLocalSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
              />
              <TouchableOpacity
                style={styles.searchIconContainer}
                onPress={handleSearchSubmit}
              >
                <Ionicons name="search-outline" size={24} color="#2C2235" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Meeting Days Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meeting days</Text>
            <View style={styles.buttonGrid}>
              {MEETING_DAYS.map((day) => {
                const isActive = filters.meetingDays.includes(day.value);
                return (
                  <TouchableOpacity
                    key={day.value}
                    style={[
                      styles.filterButton,
                      isActive && styles.filterButtonActive,
                    ]}
                    onPress={() => handleMeetingDayToggle(day.value)}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        isActive && styles.filterButtonTextActive,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Social Filters */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social</Text>
            <View style={styles.buttonGrid}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filters.onlyWithFriends && styles.filterButtonActive,
                ]}
                onPress={() => setOnlyWithFriends(!filters.onlyWithFriends)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filters.onlyWithFriends && styles.filterButtonTextActive,
                  ]}
                >
                  Only groups with my friends
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Availability Filters */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <View style={styles.buttonGrid}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filters.hideFullGroups && styles.filterButtonActive,
                ]}
                onPress={() => setHideFullGroups(!filters.hideFullGroups)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filters.hideFullGroups && styles.filterButtonTextActive,
                  ]}
                >
                  Show only available groups
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Apply Button */}
        <TouchableOpacity style={styles.applyButton} onPress={onClose}>
          <Text style={styles.applyButtonText}>Apply filters</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    modalContent: {
      width: '100%',
      paddingHorizontal: 30,
      paddingTop: 28,
      paddingBottom: 20,
      position: 'relative',
    },
    closeButton: {
      position: 'absolute',
      top: 16,
      right: 12,
      width: 24,
      height: 24,
      zIndex: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 20,
      fontWeight: '800', // ExtraBold
      color: '#2C2235',
      letterSpacing: -0.4,
      lineHeight: 22,
      marginBottom: 16,
      fontFamily: theme.typography.fontFamily.bold,
    },
    scrollView: {
      maxHeight: 400,
    },
    scrollContent: {
      paddingBottom: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '500', // Medium
      color: '#2C2235',
      letterSpacing: -0.32,
      lineHeight: 16,
      marginBottom: 12,
      fontFamily: theme.typography.fontFamily.medium,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 28, // Pill shape from Figma
      backgroundColor: 'rgba(234, 234, 234, 0.5)',
      height: 56,
      paddingHorizontal: 4,
      paddingVertical: 4,
      position: 'relative',
    },
    searchInput: {
      flex: 1,
      paddingLeft: 20,
      paddingRight: 60, // Extra padding on right for icon
      paddingVertical: 0,
      fontSize: 14,
      color: '#2C2235',
      backgroundColor: 'transparent',
      fontFamily: theme.typography.fontFamily.regular,
      lineHeight: 24,
      height: 48,
      includeFontPadding: false,
    },
    searchIconContainer: {
      position: 'absolute',
      right: 5,
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    buttonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: '#F5F3F5', // Exact color from Figma
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 28,
      height: 28,
    },
    filterButtonActive: {
      backgroundColor: '#2C2235',
    },
    filterButtonText: {
      fontSize: 12,
      fontWeight: '500', // Medium from Figma
      color: '#2C2235',
      fontFamily: theme.typography.fontFamily.medium,
      lineHeight: 12,
      letterSpacing: 0,
    },
    filterButtonTextActive: {
      color: '#F5F5F5', // Exact color from Figma variable
    },
    applyButton: {
      backgroundColor: '#2C2235',
      borderRadius: 100, // Pill shape from Figma
      height: 42,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 20,
      width: '100%',
    },
    applyButtonText: {
      fontSize: 16,
      fontWeight: '700', // Bold from Figma
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: 'center',
    },
  });
