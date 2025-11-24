import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/provider/useTheme';

export interface FooterProps {
  /**
   * Footer content
   */
  children: React.ReactNode;

  /**
   * Whether to use safe area insets
   */
  useSafeArea?: boolean;

  /**
   * Custom styles for the footer
   */
  style?: ViewStyle;

  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * Standardized Footer component for consistent footer styling across the app
 */
export const Footer: React.FC<FooterProps> = ({
  children,
  useSafeArea = false,
  style,
  testID,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.footer, style]} testID={testID}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 16,
  },
});

