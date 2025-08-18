import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from './Badge';
import { ColorContrastUtils, AdminAccessibilityLabels } from '@/utils/accessibility';

interface AccessibleStatusIndicatorProps {
  status: 'pending' | 'approved' | 'denied' | 'closed' | 'active' | 'inactive';
  itemName: string;
  itemType?: 'group' | 'user' | 'request';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  showIcon?: boolean;
}

export function AccessibleStatusIndicator({
  status,
  itemName,
  itemType = 'group',
  size = 'medium',
  style,
  showIcon = true,
}: AccessibleStatusIndicatorProps) {
  const getStatusConfig = () => {
    const colors = ColorContrastUtils.getAccessibleStatusColors();
    
    switch (status) {
      case 'pending':
        return {
          variant: 'warning' as const,
          iconName: 'time-outline' as const,
          text: 'Pending',
          colors: colors.pending,
          description: 'awaiting approval',
        } as const;
      case 'approved':
      case 'active':
        return {
          variant: 'success' as const,
          iconName: 'checkmark-circle-outline' as const,
          text: status === 'approved' ? 'Approved' : 'Active',
          colors: colors.approved,
          description: 'approved and active',
        } as const;
      case 'denied':
        return {
          variant: 'error' as const,
          iconName: 'close-circle-outline' as const,
          text: 'Denied',
          colors: colors.denied,
          description: 'request was denied',
        } as const;
      case 'closed':
      case 'inactive':
        return {
          variant: 'default' as const,
          iconName: 'pause-circle-outline' as const,
          text: status === 'closed' ? 'Closed' : 'Inactive',
          colors: colors.closed,
          description: 'no longer active',
        } as const;
      default:
        return {
          variant: 'default' as const,
          iconName: 'help-circle-outline' as const,
          text: status,
          colors: colors.closed,
          description: 'unknown status',
        } as const;
    }
  };

  const config = getStatusConfig();
  
  const accessibilityLabel = AdminAccessibilityLabels.groupStatus(status, itemName);
  const accessibilityHint = `${itemType} ${config.description}`;

  return (
    <View style={[styles.container, style]}>
      <Badge
        variant={config.variant}
        size={size}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={[
          styles.badge,
          {
            backgroundColor: config.colors.background,
            borderColor: config.colors.border,
            borderWidth: 1,
          }
        ]}
        textStyle={{
          color: config.colors.text,
        }}
      >
        <View style={styles.badgeContent}>
          {showIcon && (
            <Ionicons
              name={config.iconName}
              size={14}
              color={config.colors.text}
              accessibilityElementsHidden={true}
              style={{ marginRight: 4 }}
            />
          )}
          <Text 
            style={[styles.text, { color: config.colors.text }]}
            accessibilityElementsHidden={true}
          >
            {config.text}
          </Text>
        </View>
      </Badge>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  badge: {
    minHeight: 24,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    fontSize: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
