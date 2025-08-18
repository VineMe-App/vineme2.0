import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ViewMode = 'list' | 'map';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  currentView,
  onViewChange,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          styles.leftButton,
          currentView === 'list' && styles.activeButton,
        ]}
        onPress={() => onViewChange('list')}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          <Ionicons
            name="list-outline"
            size={16}
            color={currentView === 'list' ? '#fff' : '#666'}
          />
          <Text
            style={[
              styles.toggleText,
              currentView === 'list' && styles.activeText,
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
          currentView === 'map' && styles.activeButton,
        ]}
        onPress={() => onViewChange('map')}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          <Ionicons
            name="map-outline"
            size={16}
            color={currentView === 'map' ? '#fff' : '#666'}
          />
          <Text
            style={[
              styles.toggleText,
              currentView === 'map' && styles.activeText,
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
    borderRadius: 8,
    padding: 2,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftButton: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  rightButton: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  activeButton: {
    backgroundColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeText: {
    color: '#fff',
  },
});
