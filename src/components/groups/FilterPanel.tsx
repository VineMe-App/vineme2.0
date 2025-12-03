import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGroupFiltersStore } from '../../stores/groupFilters';
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
  const insets = useSafeAreaInsets();
  const {
    filters,
    setMeetingDays,
    setOnlyWithFriends,
    setHideFullGroups,
    clearFilters,
  } = useGroupFiltersStore();

  // Temporary state that only applies when "Apply" is clicked
  const [tempFilters, setTempFilters] = React.useState(filters);

  // Sync temporary state when modal opens
  React.useEffect(() => {
    if (isVisible) {
      setTempFilters(filters);
    }
  }, [isVisible, filters]);

  // Calculate header height: safe area top + header height (60px) + margin (8px)
  const headerHeight = insets.top + 60 + 8;

  const styles = createStyles(theme, headerHeight);

  const handleMeetingDayToggle = (day: string) => {
    const newDays = tempFilters.meetingDays.includes(day)
      ? tempFilters.meetingDays.filter((d) => d !== day)
      : [...tempFilters.meetingDays, day];
    setTempFilters({ ...tempFilters, meetingDays: newDays });
  };

  const handleOnlyWithFriendsToggle = () => {
    setTempFilters({ ...tempFilters, onlyWithFriends: !tempFilters.onlyWithFriends });
  };

  const handleHideFullGroupsToggle = () => {
    setTempFilters({ ...tempFilters, hideFullGroups: !tempFilters.hideFullGroups });
  };

  const handleReset = () => {
    setTempFilters({
      meetingDays: [],
      searchQuery: '',
      onlyWithFriends: false,
      hideFullGroups: false,
    });
    clearFilters();
  };

  const handleApply = () => {
    // Apply temporary filters to actual store
    setMeetingDays(tempFilters.meetingDays);
    setOnlyWithFriends(tempFilters.onlyWithFriends);
    setHideFullGroups(tempFilters.hideFullGroups);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.container}>
        <View style={styles.panelContent}>
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
          {/* Meeting Days Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meeting days</Text>
            <View style={styles.buttonGrid}>
              {MEETING_DAYS.map((day) => {
                const isActive = tempFilters.meetingDays.includes(day.value);
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
                  tempFilters.onlyWithFriends && styles.filterButtonActive,
                ]}
                onPress={handleOnlyWithFriendsToggle}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    tempFilters.onlyWithFriends && styles.filterButtonTextActive,
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
                  tempFilters.hideFullGroups && styles.filterButtonActive,
                ]}
                onPress={handleHideFullGroupsToggle}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    tempFilters.hideFullGroups && styles.filterButtonTextActive,
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

          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
        </View>
      </View>
    </>
  );
};

const createStyles = (theme: any, headerHeight: number) =>
  StyleSheet.create({
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 999,
    },
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      pointerEvents: 'box-none',
    },
    panelContent: {
      marginHorizontal: 16, // Same as sort dropdown
      marginTop: headerHeight, // Position below header at same height as sort dropdown
      marginBottom: 8,
      paddingHorizontal: 25, // Figma: 25px
      paddingTop: 21, // Figma: 21px
      paddingBottom: 20,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#EAEAEA',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
      maxHeight: '80%',
    },
    closeButton: {
      position: 'absolute',
      top: 17, // Figma: 17px
      right: 17, // Figma: 17px
      width: 24,
      height: 24,
      zIndex: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 20, // Figma: 20px
      fontWeight: '800', // ExtraBold from Figma
      color: '#2C2235',
      letterSpacing: -0.4, // Figma: -0.4px
      lineHeight: 22,
      marginBottom: 29, // Figma spacing
      fontFamily: theme.typography.fontFamily.bold,
    },
    scrollView: {
      maxHeight: 400,
    },
    scrollContent: {
      paddingBottom: 16,
    },
    section: {
      marginBottom: 20, // Figma spacing
    },
    sectionTitle: {
      fontSize: 14, // Figma: 14px
      fontWeight: '700', // Bold from Figma
      color: '#2C2235',
      letterSpacing: -0.28, // Figma: -0.28px
      lineHeight: 16,
      marginBottom: 8, // Figma spacing
      fontFamily: theme.typography.fontFamily.bold,
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
      backgroundColor: '#F5F3F5', // Unselected from Figma
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 28,
    },
    filterButtonActive: {
      backgroundColor: 'rgba(255, 0, 131, 0.1)', // Light pink from Figma
    },
    filterButtonText: {
      fontSize: 14, // Figma: 14px
      fontWeight: '500', // Medium from Figma
      color: '#2C2235',
      fontFamily: theme.typography.fontFamily.medium,
      lineHeight: 14,
      letterSpacing: 0,
    },
    filterButtonTextActive: {
      fontWeight: '700', // Bold when active (from Figma)
      fontFamily: theme.typography.fontFamily.bold,
    },
    footerActions: {
      flexDirection: 'row',
      gap: 4, // 8px gap between buttons
      justifyContent: 'space-between', // Space buttons apart
      alignItems: 'center',
    },
    resetButton: {
      width: 120, // Figma: 120px
      borderRadius: 21, // Figma: 21px (100px rounded)
      height: 42, // Figma: 42px
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#EAEAEA', // Figma: #eaeaea
    },
    resetButtonText: {
      fontSize: 16, // Figma: 16px
      fontWeight: '700', // Bold from Figma
      color: '#2C2235',
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: 'center',
    },
    applyButton: {
      width: 120, // Figma: 120px
      backgroundColor: '#2C2235', // Dark purple from Figma
      borderRadius: 21, // Figma: 21px (100px rounded)
      height: 42, // Figma: 42px
      justifyContent: 'center',
      alignItems: 'center',
    },
    applyButtonText: {
      fontSize: 16, // Figma: 16px
      fontWeight: '700', // Bold from Figma
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: 'center',
    },
  });
