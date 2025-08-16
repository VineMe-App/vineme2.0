import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
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
          icon: '⏳',
          text: 'Pending',
          colors: colors.pending,
          description: 'awaiting approval',
        };
      case 'approved':
      case 'active':
        return {
          variant: 'success' as const,
          icon: '✅',
          text: status === 'approved' ? 'Approved' : 'Active',
          colors: colors.approved,
          description: 'approved and active',
        };
      case 'denied':
        return {
          variant: 'error' as const,
          icon: '❌',
          text: 'Denied',
          colors: colors.denied,
          description: 'request was denied',
        };
      case 'closed':
      case 'inactive':
        return {
          variant: 'default' as const,
          icon: '⏸️',
          text: status === 'closed' ? 'Closed' : 'Inactive',
          colors: colors.closed,
          description: 'no longer active',
        };
      default:
        return {
          variant: 'default' as const,
          icon: '❓',
          text: status,
          colors: colors.closed,
          description: 'unknown status',
        };
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
            <Text 
              style={[styles.icon, { color: config.colors.text }]}
              accessibilityElementsHidden={true}
            >
              {config.icon}
            </Text>
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