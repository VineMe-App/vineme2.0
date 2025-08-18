import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useGroupFiltersStore } from '../../stores/groupFilters';
import { Button, Checkbox } from '../ui';
import { Ionicons } from '@expo/vector-icons';

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

const GROUP_CATEGORIES = [
  { label: 'Bible Study', value: 'bible-study' },
  { label: 'Prayer Group', value: 'prayer' },
  { label: 'Youth Group', value: 'youth' },
  { label: 'Women\'s Ministry', value: 'womens' },
  { label: 'Men\'s Ministry', value: 'mens' },
  { label: 'Small Group', value: 'small-group' },
  { label: 'Fellowship', value: 'fellowship' },
  { label: 'Discipleship', value: 'discipleship' },
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isVisible,
  onClose,
}) => {
  const {
    filters,
    setMeetingDays,
    setCategories,
    setSearchQuery,
    setOnlyWithFriends,
    clearFilters,
  } = useGroupFiltersStore();

  const [localSearchQuery, setLocalSearchQuery] = useState(filters.searchQuery);

  if (!isVisible) return null;

  const handleMeetingDayToggle = (day: string) => {
    const newDays = filters.meetingDays.includes(day)
      ? filters.meetingDays.filter(d => d !== day)
      : [...filters.meetingDays, day];
    setMeetingDays(newDays);
  };

  const handleCategoryToggle = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    setCategories(newCategories);
  };

  const handleSearchSubmit = () => {
    setSearchQuery(localSearchQuery);
  };

  const handleClearFilters = () => {
    clearFilters();
    setLocalSearchQuery('');
  };

  const hasActiveFilters = 
    filters.meetingDays.length > 0 || 
    filters.categories.length > 0 || 
    filters.searchQuery.length > 0;

  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>Filter Groups</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Search Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search</Text>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search group titles and descriptions..."
                value={localSearchQuery}
                onChangeText={setLocalSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearchSubmit}
              >
                <Ionicons name="search-outline" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Meeting Days Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meeting Days</Text>
            <View style={styles.checkboxGrid}>
              {MEETING_DAYS.map((day) => (
                <View key={day.value} style={styles.checkboxItem}>
                  <Checkbox
                    checked={filters.meetingDays.includes(day.value)}
                    onPress={() => handleMeetingDayToggle(day.value)}
                    label={day.label}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Social Filters */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social</Text>
            <View style={styles.checkboxGrid}>
              <View style={styles.checkboxItem}>
                <Checkbox
                  checked={filters.onlyWithFriends}
                  onPress={() => setOnlyWithFriends(!filters.onlyWithFriends)}
                  label="Only groups with my friends"
                />
              </View>
            </View>
          </View>

          {/* Categories Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Group Types</Text>
            <View style={styles.checkboxGrid}>
              {GROUP_CATEGORIES.map((category) => (
                <View key={category.value} style={styles.checkboxItem}>
                  <Checkbox
                    checked={filters.categories.includes(category.value)}
                    onPress={() => handleCategoryToggle(category.value)}
                    label={category.label}
                  />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {hasActiveFilters && (
            <Button
              title="Clear All Filters"
              onPress={handleClearFilters}
              variant="secondary"
              style={styles.clearButton}
            />
          )}
          <Button
            title="Apply Filters"
            onPress={onClose}
            variant="primary"
            style={styles.applyButton}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  panel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  searchButton: {
    padding: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#ddd',
  },
  searchButtonText: {
    fontSize: 16,
  },
  checkboxGrid: {
    gap: 8,
  },
  checkboxItem: {
    marginBottom: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  clearButton: {
    marginBottom: 8,
  },
  applyButton: {
    // Primary button styles will be applied from Button component
  },
});
