import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGroupFiltersStore } from '../../stores/groupFilters';

interface SearchBarProps {
  placeholder?: string;
  onLocationSearch?: (query: string) => Promise<void>;
  onLocationClear?: () => void; // Callback when clearing location search
  value?: string; // Optional external value (for distance origin address)
  error?: string | null; // Error message to display
  onErrorChange?: (error: string | null) => void; // Callback to update error state
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search groups...',
  onLocationSearch,
  onLocationClear,
  value,
  error,
  onErrorChange,
}) => {
  const { filters, setSearchQuery } = useGroupFiltersStore();
  const [localQuery, setLocalQuery] = useState(value || filters.searchQuery);

  // Update local state when store changes (e.g., when filters are cleared)
  useEffect(() => {
    if (value !== undefined) {
      // If external value is provided (for location search), use it
      setLocalQuery(value || '');
    } else {
      // Otherwise use search query from store
      setLocalQuery(filters.searchQuery);
    }
  }, [filters.searchQuery, value]);

  // Clear error when user starts typing
  const handleTextChange = (text: string) => {
    setLocalQuery(text);
    if (error && onErrorChange) {
      onErrorChange(null);
    }
  };

  const handleSubmit = async () => {
    if (onLocationSearch && localQuery.trim()) {
      // Clear any previous errors
      if (onErrorChange) {
        onErrorChange(null);
      }
      // If location search handler is provided, use it for location geocoding
      try {
        await onLocationSearch(localQuery.trim());
      } catch (err) {
        // Error handling is done in the parent component
      }
    } else {
      // Otherwise, use regular group search
      setSearchQuery(localQuery);
    }
  };

  const handleClear = () => {
    setLocalQuery('');
    if (onLocationClear) {
      // If location clear handler is provided, call it (for clearing distance origin)
      onLocationClear();
    } else {
      // Otherwise, clear regular search query
      setSearchQuery('');
    }
    // Clear error when clearing
    if (onErrorChange) {
      onErrorChange(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, error && styles.inputContainerError]}>
        <Ionicons
          name="search-outline"
          size={16}
          color={error ? "#ff4444" : "#666"}
          style={styles.leadingIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={localQuery}
          onChangeText={handleTextChange}
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
            <Ionicons name="close" size={16} color={error ? "#ff4444" : "#999"} />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
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
  inputContainerError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
