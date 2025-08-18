import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGroupFiltersStore } from '../../stores/groupFilters';

interface SearchBarProps {
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search groups...',
}) => {
  const { filters, setSearchQuery } = useGroupFiltersStore();
  const [localQuery, setLocalQuery] = useState(filters.searchQuery);

  // Update local state when store changes (e.g., when filters are cleared)
  useEffect(() => {
    setLocalQuery(filters.searchQuery);
  }, [filters.searchQuery]);

  const handleSubmit = () => {
    setSearchQuery(localQuery);
  };

  const handleClear = () => {
    setLocalQuery('');
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Ionicons name="search-outline" size={16} color="#666" style={styles.leadingIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={localQuery}
          onChangeText={setLocalQuery}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          placeholderTextColor="#999"
        />
        {localQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={16} color="#999" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  leadingIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
});
