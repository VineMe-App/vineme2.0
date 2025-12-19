/**
 * Admin Header Component
 * Provides consistent navigation and help access for admin screens
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { NotificationBadge } from '../ui/NotificationBadge';
import { AdminNavigation } from '../../utils/adminNavigation';

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
  rightActions,
}) => {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.leftSection}>
          {showBackButton && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={24} color="#007AFF" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.centerSection}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {(notificationCount ?? 0) > 0 && (
              <NotificationBadge
                count={notificationCount ?? 0}
                size="small"
                style={styles.titleBadge}
              />
            )}
          </View>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.rightSection}>
          {onRefresh && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleRefreshPress}
              disabled={isRefreshing}
              accessibilityLabel="Refresh data"
              accessibilityRole="button"
            >
              <Ionicons
                name="refresh"
                size={20}
                color={isRefreshing ? '#999' : '#007AFF'}
                style={isRefreshing ? styles.refreshingIcon : undefined}
              />
            </TouchableOpacity>
          )}

          {showHelpButton && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleHelpPress}
              accessibilityLabel="Get help"
              accessibilityRole="button"
            >
              <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
          )}

          {rightActions}
        </View>
      </View>
    </SafeAreaView>
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
  safeArea: {
    backgroundColor: '#fff',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 60,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 2,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  titleBadge: {
    position: 'absolute',
    top: -14, // Half of 28px small badge height for proper positioning
    right: -24, // Half of 48px large badge height for proper positioning
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
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
