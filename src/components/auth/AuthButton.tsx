import React from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Button, ButtonProps } from '@/components/ui/Button';

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
      disabled={disabled}
      loading={loading}
      style={containerStyles as ViewStyle}
      textStyle={labelStyles as TextStyle}
    />
  );
};

const styles = StyleSheet.create({
  baseButton: {
    height: 44,
    borderRadius: 22,
    paddingVertical: 0,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#2C2235',
    borderColor: '#2C2235',
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
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  secondaryLabel: {
    color: '#2C2235',
  },
  disabledLabel: {
    color: '#CCCCCC',
  },
});

export default AuthButton;

