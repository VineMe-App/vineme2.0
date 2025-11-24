import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useGroupFiltersStore } from '../../stores/groupFilters';
import { Modal } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/provider/useTheme';
import { tertiaryColors } from '@/theme/tokens';

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
    clearFilters,
  } = useGroupFiltersStore();

  const styles = createStyles(theme);

  const handleMeetingDayToggle = (day: string) => {
    const newDays = filters.meetingDays.includes(day)
      ? filters.meetingDays.filter((d) => d !== day)
      : [...filters.meetingDays, day];
    setMeetingDays(newDays);
  };

  const handleReset = () => {
    clearFilters();
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
          <Ionicons name="close" size={24} color={tertiaryColors[500]} />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>Filter groups</Text>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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

        {/* Action Buttons */}
        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.applyButton} onPress={onClose}>
            <Text style={styles.applyButtonText}>Apply filters</Text>
          </TouchableOpacity>
        </View>
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
      color: tertiaryColors[500],
      letterSpacing: -0.4,
      lineHeight: 22,
      marginBottom: 32,
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
      color: tertiaryColors[500],
      letterSpacing: -0.32,
      lineHeight: 16,
      marginBottom: 12,
      fontFamily: theme.typography.fontFamily.medium,
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
      backgroundColor: tertiaryColors[500],
    },
    filterButtonText: {
      fontSize: 12,
      fontWeight: '500', // Medium from Figma
      color: tertiaryColors[500],
      fontFamily: theme.typography.fontFamily.medium,
      lineHeight: 12,
      letterSpacing: 0,
    },
    filterButtonTextActive: {
      color: '#F5F5F5', // Exact color from Figma variable
    },
    footerActions: {
      flexDirection: 'row',
      gap: 12,
    },
    resetButton: {
      flex: 1,
      borderRadius: 100,
      height: 42,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: tertiaryColors[500],
      backgroundColor: '#FFFFFF',
    },
    resetButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: tertiaryColors[500],
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: 'center',
    },
    applyButton: {
      flex: 2,
      backgroundColor: tertiaryColors[500],
      borderRadius: 100, // Pill shape from Figma
      height: 42,
      justifyContent: 'center',
      alignItems: 'center',
    },
    applyButtonText: {
      fontSize: 16,
      fontWeight: '700', // Bold from Figma
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: 'center',
    },
  });
