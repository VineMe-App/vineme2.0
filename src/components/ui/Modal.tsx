import React, { useEffect, useCallback } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ModalProps as RNModalProps,
  SafeAreaView,
  ScrollView,
  Dimensions,
  BackHandler,
} from 'react-native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeSafe } from '../../theme/provider/useTheme';
import { lightTheme } from '../../theme/themes';

export interface ModalProps extends Omit<RNModalProps, 'children'> {
  children: React.ReactNode;
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  variant?: 'default' | 'centered' | 'bottom-sheet' | 'fullscreen';
  showCloseButton?: boolean;
  closeOnOverlayPress?: boolean;
  closeOnBackPress?: boolean;
  scrollable?: boolean;
  avoidKeyboard?: boolean;
  keyboardVerticalOffset?: number;
  animationType?: 'fade' | 'slide' | 'scale' | 'none';
  animationDuration?: number;
  overlayOpacity?: number;
  trapFocus?: boolean;
  autoFocus?: boolean;
  style?: ViewStyle;
  overlayStyle?: ViewStyle;
  contentStyle?: ViewStyle;
  headerStyle?: ViewStyle;
  bodyStyle?: ViewStyle;
  testID?: string;
  onShow?: () => void;
  onHide?: () => void;
  onAnimationEnd?: () => void;
}

export const Modal: React.FC<ModalProps> = ({
  children,
  isVisible,
  onClose,
  title,
  size = 'medium',
  variant = 'default',
  showCloseButton = true,
  closeOnOverlayPress = true,
  closeOnBackPress = true,
  scrollable = false,
  avoidKeyboard = true,
  keyboardVerticalOffset = 0,
  animationType = 'fade',
  animationDuration,
  overlayOpacity = 0.5,
  trapFocus = true,
  autoFocus = true,
  style,
  overlayStyle,
  contentStyle,
  headerStyle,
  bodyStyle,
  testID,
  onShow,
  onHide,
  onAnimationEnd,
  ...modalProps
}) => {
  // Use safe theme access with a sensible fallback to avoid crashes
  const themeCtx = useThemeSafe();
  const colors = themeCtx?.colors ?? lightTheme.colors;
  const spacing = themeCtx?.spacing ?? lightTheme.spacing;
  const typography = themeCtx?.typography ?? lightTheme.typography;
  const shadows = themeCtx?.shadows ?? lightTheme.shadows;
  const borderRadius = themeCtx?.borderRadius ?? lightTheme.borderRadius;
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Handle back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isVisible && closeOnBackPress) {
        onClose();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isVisible, closeOnBackPress, onClose]);

  // Handle lifecycle callbacks
  useEffect(() => {
    if (isVisible) {
      onShow?.();
    } else {
      onHide?.();
    }
  }, [isVisible, onShow, onHide]);

  const handleOverlayPress = useCallback(() => {
    if (closeOnOverlayPress) {
      onClose();
    }
  }, [closeOnOverlayPress, onClose]);

  const handleEscapeKey = useCallback((event: any) => {
    if (event.nativeEvent.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  const getContentPosition = () => {
    if (variant === 'bottom-sheet') {
      return {
        justifyContent: 'flex-end' as const,
        alignItems: 'stretch' as const,
      };
    } else if (variant === 'fullscreen') {
      return {
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      };
    } else {
      return {
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      };
    }
  };

  const styles = createStyles(colors, spacing, typography, shadows, borderRadius, screenWidth, screenHeight, overlayOpacity);

  const renderContent = () => {
    const contentStyles = [
      styles.content,
      styles[size],
      variant === 'bottom-sheet' && styles.bottomSheet,
      variant === 'fullscreen' && styles.fullscreenContent,
      contentStyle,
      style,
    ];

    return (
      <View
        style={contentStyles}
        accessible={true}
        accessibilityLabel={title || 'Modal'}
        accessibilityViewIsModal={true}
        onKeyPress={handleEscapeKey}
      >
        {(title || showCloseButton) && (
          <View style={[styles.header, headerStyle]}>
            {title && (
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
            )}
            {showCloseButton && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
                accessibilityHint="Closes the modal dialog"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
        {scrollable ? (
          <ScrollView
            style={[styles.bodyScroll, bodyStyle]}
            contentContainerStyle={styles.bodyScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.body}>{children}</View>
          </ScrollView>
        ) : (
          <View style={[styles.body, bodyStyle]}>{children}</View>
        )}
      </View>
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <RNModal
      visible={isVisible}
      transparent
      animationType={animationType === 'none' ? 'none' : 'fade'}
      onRequestClose={onClose}
      testID={testID}
      statusBarTranslucent
      {...modalProps}
    >
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.overlay,
            getContentPosition(),
            overlayStyle,
          ]}
        >
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={handleOverlayPress}
            accessibilityRole={undefined}
            accessible={false}
          >
            <KeyboardAvoidingView
              enabled={avoidKeyboard}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={keyboardVerticalOffset}
              style={[styles.keyboardAvoidingView, getContentPosition()]}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => {}} // Prevent overlay press when touching content
                style={variant === 'bottom-sheet' ? styles.bottomSheetContainer : styles.contentContainer}
              >
                {renderContent()}
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </RNModal>
  );
};

const createStyles = (colors: any, spacing: any, typography: any, shadows: any, borderRadius: any, screenWidth: number, screenHeight: number, overlayOpacity: number) => StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.surface.overlay,
    opacity: overlayOpacity,
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
    padding: spacing.md,
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  content: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    ...shadows.lg,
    maxHeight: '90%',
    overflow: 'hidden',
    elevation: 10, // Android shadow
  },
  small: {
    width: Math.min(screenWidth * 0.8, 320),
    maxWidth: 320,
  },
  medium: {
    width: Math.min(screenWidth * 0.9, 480),
    maxWidth: 480,
  },
  large: {
    width: Math.min(screenWidth * 0.95, 640),
    maxWidth: 640,
  },
  fullscreen: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    maxHeight: '100%',
  },
  bottomSheet: {
    width: '100%',
    maxHeight: '80%',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  fullscreenContent: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    minHeight: 56, // Minimum touch target
  },
  title: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.semiBold,
    lineHeight: typography.lineHeight.lg,
  },
  closeButton: {
    padding: spacing.sm,
    marginLeft: spacing.md,
    borderRadius: borderRadius.sm,
    minWidth: 44, // Minimum touch target
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: spacing.lg,
    flex: 1,
  },
  bodyScroll: {
    flex: 1,
  },
  bodyScrollContent: {
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
});
