import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Theme } from '../../utils/theme';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value?: string | number;
  onSelect: (option: SelectOption) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  multiple?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onSelect,
  placeholder = 'Select an option',
  label,
  error,
  disabled = false,
  multiple = false,
  style,
  testID,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState<(string | number)[]>(
    multiple ? (Array.isArray(value) ? value : []) : []
  );

  const selectedOption = options.find(option => option.value === value);
  const displayText = selectedOption?.label || placeholder;

  const handleSelect = (option: SelectOption) => {
    if (multiple) {
      const newValues = selectedValues.includes(option.value)
        ? selectedValues.filter(v => v !== option.value)
        : [...selectedValues, option.value];
      
      setSelectedValues(newValues);
      onSelect({ ...option, value: newValues });
    } else {
      onSelect(option);
      setIsOpen(false);
    }
  };

  const renderOption = ({ item }: { item: SelectOption }) => (
    <TouchableOpacity
      style={[
        styles.option,
        item.disabled && styles.optionDisabled,
        (multiple && selectedValues.includes(item.value)) && styles.optionSelected,
        (!multiple && item.value === value) && styles.optionSelected,
      ]}
      onPress={() => handleSelect(item)}
      disabled={item.disabled}
    >
      <Text
        style={[
          styles.optionText,
          item.disabled && styles.optionTextDisabled,
          (multiple && selectedValues.includes(item.value)) && styles.optionTextSelected,
          (!multiple && item.value === value) && styles.optionTextSelected,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[
          styles.selector,
          error && styles.selectorError,
          disabled && styles.selectorDisabled,
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        accessibilityState={{ disabled }}
      >
        <Text
          style={[
            styles.selectorText,
            !selectedOption && styles.placeholderText,
          ]}
        >
          {displayText}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.dropdown}>
            <FlatList
              data={options}
              renderItem={renderOption}
              keyExtractor={(item) => item.value.toString()}
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
            />
            {multiple && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setIsOpen(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.base,
  },
  label: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.base,
    paddingHorizontal: Theme.spacing.base,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    minHeight: Theme.layout.touchTarget,
  },
  selectorError: {
    borderColor: Theme.colors.error,
  },
  selectorDisabled: {
    opacity: 0.6,
    backgroundColor: Theme.colors.backgroundSecondary,
  },
  selectorText: {
    flex: 1,
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.textPrimary,
  },
  placeholderText: {
    color: Theme.colors.textTertiary,
  },
  arrow: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.textSecondary,
    marginLeft: Theme.spacing.xs,
  },
  errorText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.error,
    marginTop: Theme.spacing.xs,
  },
  overlay: {
    flex: 1,
    backgroundColor: Theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.base,
    maxHeight: 300,
    minWidth: 200,
    ...Theme.shadows.lg,
  },
  optionsList: {
    maxHeight: 250,
  },
  option: {
    paddingHorizontal: Theme.spacing.base,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderLight,
  },
  optionSelected: {
    backgroundColor: Theme.colors.primary + '10',
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionText: {
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.textPrimary,
  },
  optionTextSelected: {
    color: Theme.colors.primary,
    fontWeight: Theme.typography.fontWeight.medium,
  },
  optionTextDisabled: {
    color: Theme.colors.textTertiary,
  },
  doneButton: {
    paddingHorizontal: Theme.spacing.base,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
  },
  doneButtonText: {
    color: Theme.colors.white,
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.medium,
  },
});