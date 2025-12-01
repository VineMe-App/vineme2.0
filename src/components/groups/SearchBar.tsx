import React, { useState, useEffect, forwardRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
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

export const SearchBar = forwardRef<TextInput, SearchBarProps>(
  (
    {
      placeholder = 'Search groups...',
      onLocationSearch,
      onLocationClear,
      value,
      error,
      onErrorChange,
    },
    ref
  ) => {
    const { filters, setSearchQuery } = useGroupFiltersStore();
    const [localQuery, setLocalQuery] = useState(
      value !== undefined ? value : filters.searchQuery
    );

    // Update local state when store changes (e.g., when filters are cleared)
    useEffect(() => {
      if (value !== undefined) {
        // If external value is provided (for location search), use it (even if empty string)
        setLocalQuery(value);
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
        <View
          style={[styles.inputContainer, error && styles.inputContainerError]}
        >
          <TextInput
            ref={ref}
            style={styles.input}
            placeholder={placeholder}
            value={localQuery}
            onChangeText={handleTextChange}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            placeholderTextColor="#939393"
          />
          {localQuery.length > 0 ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={16}
                color={error ? '#ff4444' : '#939393'}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.searchIconContainer}>
              <Ionicons
                name="search-outline"
                size={24}
                color="#1D1B20"
              />
            </View>
          )}
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }
);

SearchBar.displayName = 'SearchBar';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#F9F7F7',
    paddingLeft: 20,
    paddingRight: 12,
    height: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4, // Android shadow
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2C2235',
    paddingVertical: 0,
    paddingRight: 8,
    height: '100%',
    fontFamily: 'Figtree-Regular',
    lineHeight: 20,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
