import React from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Button, ButtonProps } from '@/components/ui/Button';
import { tertiaryColors } from '@/theme/tokens';

export type AuthButtonVariant = 'primary' | 'secondary';

export interface AuthButtonProps
  extends Omit<ButtonProps, 'variant' | 'fullWidth' | 'style' | 'textStyle'> {
  variant?: AuthButtonVariant;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  variant = 'primary',
  disabled,
  loading,
  fullWidth = true,
  style,
  textStyle,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  const containerStyles = [
    styles.baseButton,
    variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
    isDisabled && styles.disabledButton,
    style,
  ];

  const labelStyles = [
    styles.baseLabel,
    variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel,
    isDisabled && styles.disabledLabel,
    textStyle,
  ];

  return (
    <Button
      {...rest}
      variant="ghost"
      fullWidth={fullWidth}
      disabled={isDisabled}
      loading={loading}
      style={containerStyles as ViewStyle}
      textStyle={labelStyles as TextStyle}
    />
  );
};

const styles = StyleSheet.create({
  baseButton: {
    height: 42,
    borderRadius: 21,
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: tertiaryColors[500],
    borderColor: tertiaryColors[500],
  },
  secondaryButton: {
    backgroundColor: '#EAEAEA',
    borderColor: '#EAEAEA',
    marginBottom: 0,
  },
  disabledButton: {
    backgroundColor: '#EAEAEA',
    borderColor: '#EAEAEA',
  },
  baseLabel: {
    fontSize: 16,
    textAlign: 'center',
    includeFontPadding: false,
    flexShrink: 0,
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  secondaryLabel: {
    color: tertiaryColors[500],
  },
  disabledLabel: {
    color: '#CCCCCC',
  },
});

export default AuthButton;

