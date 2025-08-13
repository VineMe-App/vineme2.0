import React from 'react';
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
} from 'react-native';
import { Theme } from '../../utils/theme';

interface ModalProps extends Omit<RNModalProps, 'children'> {
  children: React.ReactNode;
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  showCloseButton?: boolean;
  closeOnOverlayPress?: boolean;
  scrollable?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const Modal: React.FC<ModalProps> = ({
  children,
  isVisible,
  onClose,
  title,
  size = 'medium',
  showCloseButton = true,
  closeOnOverlayPress = true,
  scrollable = false,
  style,
  testID,
  ...modalProps
}) => {
  const handleOverlayPress = () => {
    if (closeOnOverlayPress) {
      onClose();
    }
  };

  const renderContent = () => {
    const content = (
      <View style={[styles.content, styles[size], style]}>
        {(title || showCloseButton) && (
          <View style={styles.header}>
            {title && <Text style={styles.title}>{title}</Text>}
            {showCloseButton && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={styles.body}>{children}</View>
      </View>
    );

    if (scrollable) {
      return (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      );
    }

    return content;
  };

  return (
    <RNModal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
      {...modalProps}
    >
      <SafeAreaView style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleOverlayPress}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            {renderContent()}
          </TouchableOpacity>
        </TouchableOpacity>
      </SafeAreaView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.base,
  },
  scrollContainer: {
    maxHeight: '90%',
  },
  scrollContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    ...Theme.shadows.lg,
  },
  small: {
    width: '80%',
    maxWidth: 300,
  },
  medium: {
    width: '90%',
    maxWidth: 400,
  },
  large: {
    width: '95%',
    maxWidth: 600,
  },
  fullscreen: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderLight,
  },
  title: {
    flex: 1,
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.semiBold,
    color: Theme.colors.textPrimary,
  },
  closeButton: {
    padding: Theme.spacing.xs,
    marginLeft: Theme.spacing.base,
  },
  closeButtonText: {
    fontSize: Theme.typography.fontSize.lg,
    color: Theme.colors.textSecondary,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  body: {
    padding: Theme.spacing.xl,
  },
});
