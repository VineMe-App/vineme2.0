/**
 * Admin Header Component
 * Provides consistent navigation and help access for admin screens
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { NotificationBadge } from '../ui/NotificationBadge';
import { AdminNavigation } from '../../utils/adminNavigation';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/theme/provider/useTheme';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  showHelpButton?: boolean;
  notificationCount?: number;
  onHelpPress?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  rightActions?: React.ReactNode;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  showBackButton = true,
  showHelpButton = true,
  notificationCount,
  onHelpPress,
  onRefresh,
  isRefreshing = false,
  rightActions: customRightActions,
}) => {
  const { theme } = useTheme();
  const iconColor = theme.colors.text.primary;
  const actionBackground = theme.colors.surface.secondary;

  const handleBackPress = () => {
    AdminNavigation.goBack('/(tabs)/profile');
  };

  const handleHelpPress = () => {
    if (onHelpPress) {
      onHelpPress();
    }
  };

  const handleRefreshPress = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const actions = (
    <View style={styles.actionRow}>
      {onRefresh && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: actionBackground },
          ]}
          onPress={handleRefreshPress}
          disabled={isRefreshing}
          accessibilityLabel="Refresh data"
          accessibilityRole="button"
        >
          <Ionicons
            name="refresh"
            size={20}
            color={isRefreshing ? theme.colors.text.secondary : iconColor}
            style={isRefreshing ? styles.refreshingIcon : undefined}
          />
        </TouchableOpacity>
      )}

      {showHelpButton && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: actionBackground },
          ]}
          onPress={handleHelpPress}
          accessibilityLabel="Get help"
          accessibilityRole="button"
        >
          <Ionicons name="help-circle-outline" size={20} color={iconColor} />
        </TouchableOpacity>
      )}

      {customRightActions}
    </View>
  );

  const titleAccessory =
    (notificationCount ?? 0) > 0 ? (
      <NotificationBadge
        count={notificationCount ?? 0}
        size="small"
        style={styles.titleBadge}
      />
    ) : undefined;

  return (
    <Header
      title={title}
      subtitle={subtitle}
      showBackButton={showBackButton}
      onBackPress={handleBackPress}
      rightActions={actions}
      titleAccessory={titleAccessory}
    />
  );
};

/**
 * Breadcrumb Navigation Component
 */
interface BreadcrumbProps {
  items: { label: string; route?: string }[];
}

export const AdminBreadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const handleBreadcrumbPress = (route?: string) => {
    if (route) {
      router.push(route as any);
    }
  };

  return (
    <View style={styles.breadcrumbContainer}>
      {items.map((item, index) => (
        <View key={index} style={styles.breadcrumbItem}>
          {index > 0 && (
            <Ionicons
              name="chevron-forward"
              size={14}
              color="#999"
              style={styles.breadcrumbSeparator}
            />
          )}
          <TouchableOpacity
            onPress={() => handleBreadcrumbPress(item.route)}
            disabled={!item.route}
            style={styles.breadcrumbButton}
          >
            <Text
              style={[
                styles.breadcrumbText,
                ...(item.route ? [] : [styles.breadcrumbTextCurrent]),
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

/**
 * Admin Page Layout Component
 */
interface AdminPageLayoutProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  showHelpButton?: boolean;
  notificationCount?: number;
  onHelpPress?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  breadcrumbs?: { label: string; route?: string }[];
  rightActions?: React.ReactNode;
  children: React.ReactNode;
}

export const AdminPageLayout: React.FC<AdminPageLayoutProps> = ({
  title,
  subtitle,
  showBackButton = true,
  showHelpButton = true,
  notificationCount,
  onHelpPress,
  onRefresh,
  isRefreshing = false,
  breadcrumbs,
  rightActions,
  children,
}) => {
  return (
    <View style={styles.pageContainer}>
      <AdminHeader
        title={title}
        subtitle={subtitle}
        showBackButton={showBackButton}
        showHelpButton={showHelpButton}
        notificationCount={notificationCount}
        onHelpPress={onHelpPress}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        rightActions={rightActions}
      />

      {breadcrumbs && breadcrumbs.length > 0 && (
        <AdminBreadcrumb items={breadcrumbs} />
      )}

      <View style={styles.pageContent}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  titleBadge: {
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 999,
  },
  refreshingIcon: {
    opacity: 0.5,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbSeparator: {
    marginHorizontal: 4,
  },
  breadcrumbButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  breadcrumbText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  breadcrumbTextCurrent: {
    color: '#666',
    fontWeight: '400',
  },
  pageContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pageContent: {
    flex: 1,
  },
});
