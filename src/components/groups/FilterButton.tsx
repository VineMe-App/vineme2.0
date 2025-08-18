import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGroupFiltersStore } from '../../stores/groupFilters';
import { getActiveFiltersCount } from '../../utils/groupFilters';

interface FilterButtonProps {
  onPress: () => void;
}

export const FilterButton: React.FC<FilterButtonProps> = ({ onPress }) => {
  const { filters } = useGroupFiltersStore();
  const activeFiltersCount = getActiveFiltersCount(filters);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        activeFiltersCount > 0 && styles.buttonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name="funnel-outline" size={16} color={activeFiltersCount > 0 ? '#fff' : '#666'} style={{ marginRight: 4 }} />
      <Text
        style={[
          styles.text,
          activeFiltersCount > 0 && styles.textActive,
        ]}
      >
        Filter
      </Text>
      {activeFiltersCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{activeFiltersCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  icon: {
    fontSize: 14,
    marginRight: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  textActive: {
    color: '#fff',
  },
  badge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});
