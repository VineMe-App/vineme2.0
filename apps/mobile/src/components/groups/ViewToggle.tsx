import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
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
  const slideAnimation = useRef(
    new Animated.Value(currentView === 'list' ? 0 : 1)
  ).current;
  const [containerWidth, setContainerWidth] = React.useState(0);

  useEffect(() => {
    Animated.timing(slideAnimation, {
      toValue: currentView === 'list' ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [currentView, slideAnimation]);

  const translateX = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, containerWidth / 2)],
  });

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: theme.colors.secondary[100],
          backgroundColor: theme.colors.secondary[100], // Green background instead of gray
        },
      ]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Animated sliding background */}
      <Animated.View
        style={[
          styles.slidingBackground,
          {
            backgroundColor: theme.colors.primary[500],
            transform: [{ translateX }],
          },
        ]}
      />

      {/* List button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => onViewChange('list')}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          <Ionicons
            name="list-outline"
            size={16}
            color={
              currentView === 'list'
                ? theme.colors.secondary[100] // Green when selected
                : theme.colors.primary[500]
            } // Pink when not selected
          />
          <Text
            style={[
              styles.toggleText,
              {
                fontFamily: theme.typography.fontFamily.medium,
                color:
                  currentView === 'list'
                    ? theme.colors.secondary[100] // Green when selected
                    : theme.colors.primary[500], // Pink when not selected
              },
            ]}
          >
            List
          </Text>
        </View>
      </TouchableOpacity>

      {/* Map button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => onViewChange('map')}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          <Ionicons
            name="map-outline"
            size={16}
            color={
              currentView === 'map'
                ? theme.colors.secondary[100] // Green when selected
                : theme.colors.primary[500]
            } // Pink when not selected
          />
          <Text
            style={[
              styles.toggleText,
              {
                fontFamily: theme.typography.fontFamily.medium,
                color:
                  currentView === 'map'
                    ? theme.colors.secondary[100] // Green when selected
                    : theme.colors.primary[500], // Pink when not selected
              },
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
    borderRadius: 25,
    padding: 3,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 2,
    position: 'relative',
    height: 50,
    // Background color now set dynamically with theme
  },
  slidingBackground: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: '50%', // Half the container width
    height: 46,
    borderRadius: 23, // Fully rounded
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8, // Higher elevation for Android
    zIndex: 10, // Higher z-index to ensure visibility
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20, // Above the sliding background
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    zIndex: 25, // Ensure text is above everything
    // Color and fontFamily handled dynamically based on state
    includeFontPadding: false, // Android: remove extra top/bottom padding
    textAlignVertical: Platform.OS === 'android' ? 'center' : undefined,
    lineHeight: Platform.OS === 'android' ? 18 : 16,
    paddingBottom: Platform.OS === 'android' ? 1 : 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // Restored original gap
    zIndex: 25, // Ensure row is above everything
  },
});
