import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/provider/useTheme';

export type ViewMode = 'list' | 'map';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  currentView,
  onViewChange,
}) => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          styles.leftButton,
          currentView === 'list' 
            ? { backgroundColor: theme.colors.primary[500] } // Pink when selected
            : { backgroundColor: theme.colors.secondary[100] }, // Green when not selected
        ]}
        onPress={() => onViewChange('list')}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          <Ionicons
            name="list-outline"
            size={16}
            color={currentView === 'list' 
              ? theme.colors.secondary[100] // Green when selected
              : theme.colors.primary[500]} // Pink when not selected
          />
          <Text
            style={[
              styles.toggleText,
              currentView === 'list' 
                ? { color: theme.colors.secondary[100] } // Green when selected
                : { color: theme.colors.primary[500] }, // Pink when not selected
            ]}
          >
            List
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.toggleButton,
          styles.rightButton,
          currentView === 'map' 
            ? { backgroundColor: theme.colors.primary[500] } // Pink when selected
            : { backgroundColor: theme.colors.secondary[100] }, // Green when not selected
        ]}
        onPress={() => onViewChange('map')}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          <Ionicons
            name="map-outline"
            size={16}
            color={currentView === 'map' 
              ? theme.colors.secondary[100] // Green when selected
              : theme.colors.primary[500]} // Pink when not selected
          />
          <Text
            style={[
              styles.toggleText,
              currentView === 'map' 
                ? { color: theme.colors.secondary[100] } // Green when selected
                : { color: theme.colors.primary[500] }, // Pink when not selected
            ]}
          >
            Map
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 25, // More rounded like buttons
    padding: 3,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftButton: {
    borderTopLeftRadius: 22, // More rounded
    borderBottomLeftRadius: 22,
  },
  rightButton: {
    borderTopRightRadius: 22, // More rounded
    borderBottomRightRadius: 22,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    // Color handled dynamically based on state
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
