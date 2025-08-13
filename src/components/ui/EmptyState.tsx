import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../../utils/theme';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  testID?: string;
}

export function EmptyState({ title, message, icon, action, testID }: EmptyStateProps) {
  return (
    <View style={styles.container} testID={testID}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing['2xl'],
  },
  iconContainer: {
    marginBottom: Theme.spacing.base,
  },
  title: {
    fontSize: Theme.typography.fontSize.xl,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  message: {
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: Theme.typography.lineHeight.base,
    marginBottom: Theme.spacing.xl,
  },
  actionContainer: {
    marginTop: Theme.spacing.base,
  },
});