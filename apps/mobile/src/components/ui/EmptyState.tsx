import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../../theme/provider/useTheme';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  testID?: string;
}

export function EmptyState({
  title,
  message,
  icon,
  action,
  testID,
}: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.secondary },
      ]}
      testID={testID}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text variant="h5" style={styles.title}>
        {title}
      </Text>
      <Text variant="body" color="secondary" style={styles.message}>
        {message}
      </Text>
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32, // 2xl spacing
  },
  iconContainer: {
    marginBottom: 16, // base spacing
  },
  title: {
    marginBottom: 4, // xs spacing
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 20, // xl spacing
  },
  actionContainer: {
    marginTop: 16, // base spacing
  },
});
