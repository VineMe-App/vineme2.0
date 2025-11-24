import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/provider/useTheme';

export interface OverflowMenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  badge?: string;
}

interface OverflowMenuProps {
  items: OverflowMenuItem[];
  testID?: string;
}

export const OverflowMenu: React.FC<OverflowMenuProps> = ({
  items,
  testID,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isOpen, setIsOpen] = useState(false);

  const handleItemPress = (item: OverflowMenuItem) => {
    setIsOpen(false);
    // Small delay to allow menu to close before action
    setTimeout(() => {
      item.onPress();
    }, 100);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.triggerButton}
        onPress={() => setIsOpen(true)}
        accessibilityLabel="More options"
        testID={testID}
      >
        <View style={styles.triggerButtonInner}>
          <Ionicons
            name="ellipsis-horizontal"
            size={18}
            color={theme.colors.text.inverse}
          />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <View style={styles.menuContainer}>
            <View style={styles.menu}>
              {items.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    index === items.length - 1 && styles.menuItemLast,
                    item.disabled && styles.menuItemDisabled,
                  ]}
                  onPress={() => handleItemPress(item)}
                  disabled={item.disabled}
                >
                  <View style={styles.menuItemContent}>
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={
                        item.disabled
                          ? theme.colors.text.tertiary
                          : item.destructive
                            ? '#dc2626'
                            : theme.colors.text.primary
                      }
                      style={styles.menuItemIcon}
                    />
                    <Text
                      style={[
                        styles.menuItemLabel,
                        item.disabled && styles.menuItemLabelDisabled,
                        item.destructive && styles.menuItemLabelDestructive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    triggerButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    triggerButtonInner: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.background.inverse,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 100,
      paddingRight: 16,
    },
    menuContainer: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    menu: {
      backgroundColor: theme.colors.surface.primary,
      borderRadius: 12,
      minWidth: 200,
      paddingVertical: 8,
      overflow: 'hidden',
    },
    menuItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
    menuItemDisabled: {
      opacity: 0.5,
    },
    menuItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuItemIcon: {
      marginRight: 12,
    },
    menuItemLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.text.primary,
      flex: 1,
    },
    menuItemLabelDisabled: {
      color: theme.colors.text.tertiary,
    },
    menuItemLabelDestructive: {
      color: '#dc2626',
    },
    badge: {
      backgroundColor: '#FF0083',
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginLeft: 8,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
