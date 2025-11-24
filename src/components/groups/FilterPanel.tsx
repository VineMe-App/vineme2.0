import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useGroupFiltersStore } from '../../stores/groupFilters';
import { Modal } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/provider/useTheme';
import { locationService } from '../../services/location';

export type SortOption = 'alphabetical' | 'distance' | 'friends';

interface FilterPanelProps {
  isVisible: boolean;
  onClose: () => void;
  // Sort props
  sortBy?: SortOption;
  onSortChange?: (sort: SortOption) => void;
  // Distance origin props
  distanceOrigin?: {
    address: string;
    coordinates: { latitude: number; longitude: number };
  } | null;
  onDistanceOriginChange?: (
    origin: {
      address: string;
      coordinates: { latitude: number; longitude: number };
    } | null
  ) => void;
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

const SORT_OPTIONS: {
  label: string;
  value: SortOption;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: 'Alphabetically', value: 'alphabetical', icon: 'text-outline' },
  { label: 'By distance', value: 'distance', icon: 'navigate-outline' },
  { label: 'By friends in group', value: 'friends', icon: 'people-outline' },
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isVisible,
  onClose,
  sortBy = 'alphabetical',
  onSortChange,
  distanceOrigin,
  onDistanceOriginChange,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    filters,
    setMeetingDays,
    setOnlyWithFriends,
    setHideFullGroups,
    clearFilters,
  } = useGroupFiltersStore();

  const [locationQuery, setLocationQuery] = useState(
    distanceOrigin?.address || ''
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Update location query when distanceOrigin changes externally
  useEffect(() => {
    if (distanceOrigin?.address) {
      setLocationQuery(distanceOrigin.address);
    } else if (!distanceOrigin) {
      setLocationQuery('');
    }
  }, [distanceOrigin]);

  const handleMeetingDayToggle = (day: string) => {
    const newDays = filters.meetingDays.includes(day)
      ? filters.meetingDays.filter((d) => d !== day)
      : [...filters.meetingDays, day];
    setMeetingDays(newDays);
  };

  const handleSortChange = (sort: SortOption) => {
    onSortChange?.(sort);
    // Clear distance origin when switching away from distance sorting
    if (sort !== 'distance' && distanceOrigin) {
      onDistanceOriginChange?.(null);
      setLocationQuery('');
    }
  };

  const handleLocationSearch = async () => {
    if (!locationQuery.trim()) return;

    setIsSearchingLocation(true);
    setLocationError(null);

    try {
      const coordinates = await locationService.geocodeAddress(
        locationQuery.trim()
      );
      if (coordinates) {
        const address = await locationService.reverseGeocode(coordinates);
        onDistanceOriginChange?.({
          address: address?.formattedAddress || locationQuery.trim(),
          coordinates,
        });
        setLocationError(null);
      } else {
        setLocationError('Location not found');
      }
    } catch {
      setLocationError('Location not found');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleLocationClear = () => {
    setLocationQuery('');
    setLocationError(null);
    onDistanceOriginChange?.(null);
  };

  const handleReset = () => {
    clearFilters();
    onSortChange?.('alphabetical');
    onDistanceOriginChange?.(null);
    setLocationQuery('');
    setLocationError(null);
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
          <Ionicons name="close" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>Filter & sort</Text>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Sort Options Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sort by</Text>
            <View style={styles.sortOptionsContainer}>
              {SORT_OPTIONS.map((option) => {
                const isActive = sortBy === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      isActive && styles.sortOptionActive,
                    ]}
                    onPress={() => handleSortChange(option.value)}
                  >
                    <Ionicons
                      name={option.icon}
                      size={18}
                      color={isActive ? '#FF0083' : theme.colors.text.secondary}
                    />
                    <Text
                      style={[
                        styles.sortOptionText,
                        isActive && styles.sortOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isActive && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color="#FF0083"
                        style={styles.sortCheckmark}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Location search - only show when distance sort is selected */}
            {sortBy === 'distance' && (
              <View style={styles.locationSearchContainer}>
                <View
                  style={[
                    styles.locationInput,
                    locationError && styles.locationInputError,
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={
                      locationError ? '#dc2626' : theme.colors.text.tertiary
                    }
                  />
                  <TextInput
                    style={styles.locationTextInput}
                    placeholder="Enter location to measure from..."
                    placeholderTextColor={theme.colors.text.tertiary}
                    value={locationQuery}
                    onChangeText={(text) => {
                      setLocationQuery(text);
                      setLocationError(null);
                    }}
                    onSubmitEditing={handleLocationSearch}
                    returnKeyType="search"
                  />
                  {locationQuery.length > 0 && (
                    <TouchableOpacity onPress={handleLocationClear}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={theme.colors.text.tertiary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
                {locationError && (
                  <Text style={styles.locationErrorText}>{locationError}</Text>
                )}
                {distanceOrigin && (
                  <View style={styles.locationSetBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#16a34a"
                    />
                    <Text style={styles.locationSetText}>Location set</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    styles.searchLocationButton,
                    (!locationQuery.trim() || isSearchingLocation) &&
                      styles.searchLocationButtonDisabled,
                  ]}
                  onPress={handleLocationSearch}
                  disabled={!locationQuery.trim() || isSearchingLocation}
                >
                  <Text style={styles.searchLocationButtonText}>
                    {isSearchingLocation ? 'Searching...' : 'Set location'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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

        {/* Action Buttons */}
        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.applyButton} onPress={onClose}>
            <Text style={styles.applyButtonText}>Apply</Text>
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
      paddingHorizontal: 24,
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
      fontWeight: '800',
      color: theme.colors.text.primary,
      letterSpacing: -0.4,
      lineHeight: 22,
      marginBottom: 24,
      fontFamily: theme.typography.fontFamily.bold,
    },
    scrollView: {
      maxHeight: 450,
    },
    scrollContent: {
      paddingBottom: 16,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text.primary,
      letterSpacing: -0.28,
      lineHeight: 16,
      marginBottom: 10,
      fontFamily:
        theme.typography.fontFamily.semiBold ||
        theme.typography.fontFamily.medium,
    },
    // Sort options styles
    sortOptionsContainer: {
      gap: 4,
    },
    sortOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: 'transparent',
    },
    sortOptionActive: {
      backgroundColor: '#FFF0F7',
    },
    sortOptionText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text.secondary,
      marginLeft: 10,
      flex: 1,
      fontFamily: theme.typography.fontFamily.medium,
    },
    sortOptionTextActive: {
      color: '#FF0083',
      fontWeight: '600',
    },
    sortCheckmark: {
      marginLeft: 8,
    },
    // Location search styles
    locationSearchContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border?.primary || '#E5E5E5',
    },
    locationInput: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F5F3F5',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    locationInputError: {
      borderWidth: 1,
      borderColor: '#dc2626',
    },
    locationTextInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text.primary,
      padding: 0,
    },
    locationErrorText: {
      fontSize: 12,
      color: '#dc2626',
      marginTop: 4,
      marginLeft: 4,
    },
    locationSetBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 8,
    },
    locationSetText: {
      fontSize: 12,
      color: '#16a34a',
      fontWeight: '500',
    },
    searchLocationButton: {
      backgroundColor: '#FF0083',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginTop: 10,
    },
    searchLocationButtonDisabled: {
      backgroundColor: '#E5E5E5',
    },
    searchLocationButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    // Filter button styles
    buttonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: '#F5F3F5',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 32,
    },
    filterButtonActive: {
      backgroundColor: theme.colors.text.primary,
    },
    filterButtonText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fontFamily.medium,
      lineHeight: 14,
      letterSpacing: 0,
    },
    filterButtonTextActive: {
      color: '#F5F5F5',
    },
    footerActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },
    resetButton: {
      flex: 1,
      borderRadius: 100,
      height: 42,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.text.primary,
      backgroundColor: '#FFFFFF',
    },
    resetButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: 'center',
    },
    applyButton: {
      flex: 2,
      backgroundColor: theme.colors.text.primary,
      borderRadius: 100,
      height: 42,
      justifyContent: 'center',
      alignItems: 'center',
    },
    applyButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: 'center',
    },
  });
