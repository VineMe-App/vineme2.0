/**
 * Modal Component Examples
 * Demonstrates various Modal component configurations and use cases
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Modal } from '../Modal';
import { Overlay } from '../Overlay';
import { Backdrop } from '../Backdrop';
import { Portal, PortalHost } from '../Portal';
import { Button } from '../Button';
import { Input } from '../Input';
import { useTheme } from '../../../theme/provider/useTheme';

export const ModalExamples: React.FC = () => {
  const { colors, spacing } = useTheme();
  const [basicModalVisible, setBasicModalVisible] = useState(false);
  const [sizeModalVisible, setSizeModalVisible] = useState(false);
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [animationModalVisible, setAnimationModalVisible] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [overlayModalVisible, setOverlayModalVisible] = useState(false);
  const [portalModalVisible, setPortalModalVisible] = useState(false);
  const [currentSize, setCurrentSize] = useState<
    'small' | 'medium' | 'large' | 'fullscreen'
  >('medium');
  const [currentVariant, setCurrentVariant] = useState<
    'default' | 'centered' | 'bottom-sheet' | 'fullscreen'
  >('default');
  const [currentAnimation, setCurrentAnimation] = useState<
    'fade' | 'slide' | 'scale' | 'none'
  >('fade');
  const [formData, setFormData] = useState({ name: '', email: '' });

  const styles = createStyles(colors, spacing);

  return (
    <View style={styles.container}>
      <PortalHost />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Modal Component Examples</Text>

        {/* Basic Modal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Modal</Text>
          <Button
            title="Show Basic Modal"
            onPress={() => setBasicModalVisible(true)}
          />
          <Modal
            isVisible={basicModalVisible}
            onClose={() => setBasicModalVisible(false)}
            title="Basic Modal"
          >
            <Text style={styles.modalText}>
              This is a basic modal with default settings. It includes a title,
              close button, and can be closed by pressing the overlay or the
              back button.
            </Text>
            <Button
              title="Close Modal"
              onPress={() => setBasicModalVisible(false)}
              variant="outline"
            />
          </Modal>
        </View>

        {/* Size Variants */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Size Variants</Text>
          <View style={styles.buttonRow}>
            <Button
              title="Small"
              onPress={() => {
                setCurrentSize('small');
                setSizeModalVisible(true);
              }}
              size="small"
            />
            <Button
              title="Medium"
              onPress={() => {
                setCurrentSize('medium');
                setSizeModalVisible(true);
              }}
              size="small"
            />
            <Button
              title="Large"
              onPress={() => {
                setCurrentSize('large');
                setSizeModalVisible(true);
              }}
              size="small"
            />
            <Button
              title="Fullscreen"
              onPress={() => {
                setCurrentSize('fullscreen');
                setSizeModalVisible(true);
              }}
              size="small"
            />
          </View>
          <Modal
            isVisible={sizeModalVisible}
            onClose={() => setSizeModalVisible(false)}
            title={`${currentSize.charAt(0).toUpperCase() + currentSize.slice(1)} Modal`}
            size={currentSize}
          >
            <Text style={styles.modalText}>
              This is a {currentSize} modal. Notice how the width and height
              change based on the size prop.
            </Text>
            <Button
              title="Close"
              onPress={() => setSizeModalVisible(false)}
              variant="outline"
            />
          </Modal>
        </View>

        {/* Variant Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modal Variants</Text>
          <View style={styles.buttonRow}>
            <Button
              title="Default"
              onPress={() => {
                setCurrentVariant('default');
                setVariantModalVisible(true);
              }}
              size="small"
            />
            <Button
              title="Centered"
              onPress={() => {
                setCurrentVariant('centered');
                setVariantModalVisible(true);
              }}
              size="small"
            />
            <Button
              title="Bottom Sheet"
              onPress={() => {
                setCurrentVariant('bottom-sheet');
                setVariantModalVisible(true);
              }}
              size="small"
            />
            <Button
              title="Fullscreen"
              onPress={() => {
                setCurrentVariant('fullscreen');
                setVariantModalVisible(true);
              }}
              size="small"
            />
          </View>
          <Modal
            isVisible={variantModalVisible}
            onClose={() => setVariantModalVisible(false)}
            title={`${currentVariant.charAt(0).toUpperCase() + currentVariant.slice(1)} Variant`}
            variant={currentVariant}
          >
            <Text style={styles.modalText}>
              This is a {currentVariant} variant modal. Each variant has
              different positioning and styling.
            </Text>
            <Button
              title="Close"
              onPress={() => setVariantModalVisible(false)}
              variant="outline"
            />
          </Modal>
        </View>

        {/* Animation Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Animation Types</Text>
          <View style={styles.buttonRow}>
            <Button
              title="Fade"
              onPress={() => {
                setCurrentAnimation('fade');
                setAnimationModalVisible(true);
              }}
              size="small"
            />
            <Button
              title="Slide"
              onPress={() => {
                setCurrentAnimation('slide');
                setAnimationModalVisible(true);
              }}
              size="small"
            />
            <Button
              title="Scale"
              onPress={() => {
                setCurrentAnimation('scale');
                setAnimationModalVisible(true);
              }}
              size="small"
            />
            <Button
              title="None"
              onPress={() => {
                setCurrentAnimation('none');
                setAnimationModalVisible(true);
              }}
              size="small"
            />
          </View>
          <Modal
            isVisible={animationModalVisible}
            onClose={() => setAnimationModalVisible(false)}
            title={`${currentAnimation.charAt(0).toUpperCase() + currentAnimation.slice(1)} Animation`}
            animationType={currentAnimation}
          >
            <Text style={styles.modalText}>
              This modal uses {currentAnimation} animation. Try opening it again
              to see the effect.
            </Text>
            <Button
              title="Close"
              onPress={() => setAnimationModalVisible(false)}
              variant="outline"
            />
          </Modal>
        </View>

        {/* Form Modal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Form Modal</Text>
          <Button
            title="Show Form Modal"
            onPress={() => setFormModalVisible(true)}
          />
          <Modal
            isVisible={formModalVisible}
            onClose={() => setFormModalVisible(false)}
            title="User Information"
            scrollable={true}
            avoidKeyboard={true}
          >
            <View style={styles.formContainer}>
              <Input
                label="Name"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                placeholder="Enter your name"
              />
              <Input
                label="Email"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                placeholder="Enter your email"
                keyboardType="email-address"
              />
              <View style={styles.formButtons}>
                <Button
                  title="Cancel"
                  onPress={() => setFormModalVisible(false)}
                  variant="outline"
                />
                <Button
                  title="Save"
                  onPress={() => {
                    console.log('Form data:', formData);
                    setFormModalVisible(false);
                  }}
                />
              </View>
            </View>
          </Modal>
        </View>

        {/* Custom Overlay */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Overlay</Text>
          <Button
            title="Show Custom Overlay Modal"
            onPress={() => setOverlayModalVisible(true)}
          />
          <Overlay
            isVisible={overlayModalVisible}
            onPress={() => setOverlayModalVisible(false)}
            opacity={0.8}
            color="rgba(255, 0, 0, 0.3)"
          >
            <Modal
              isVisible={overlayModalVisible}
              onClose={() => setOverlayModalVisible(false)}
              title="Custom Overlay Modal"
              closeOnOverlayPress={false}
            >
              <Text style={styles.modalText}>
                This modal uses a custom red overlay with higher opacity. The
                overlay press is handled by the Overlay component.
              </Text>
              <Button
                title="Close"
                onPress={() => setOverlayModalVisible(false)}
                variant="outline"
              />
            </Modal>
          </Overlay>
        </View>

        {/* Portal Modal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portal Modal</Text>
          <Button
            title="Show Portal Modal"
            onPress={() => setPortalModalVisible(true)}
          />
          {portalModalVisible && (
            <Portal name="example-modal">
              <Modal
                isVisible={portalModalVisible}
                onClose={() => setPortalModalVisible(false)}
                title="Portal Modal"
                variant="bottom-sheet"
              >
                <Text style={styles.modalText}>
                  This modal is rendered through a Portal, which ensures proper
                  z-index management and can be rendered outside the normal
                  component tree.
                </Text>
                <Button
                  title="Close"
                  onPress={() => setPortalModalVisible(false)}
                  variant="outline"
                />
              </Modal>
            </Portal>
          )}
        </View>

        {/* Accessibility Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility Features</Text>
          <Text style={styles.description}>
            All modals include:
            {'\n'}• Focus trapping and management
            {'\n'}• Screen reader support
            {'\n'}• Keyboard navigation (Escape key)
            {'\n'}• Proper ARIA labels and roles
            {'\n'}• Minimum touch targets (44px)
            {'\n'}• High contrast support
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any, spacing: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    section: {
      marginBottom: spacing.xl,
      padding: spacing.lg,
      backgroundColor: colors.background.secondary,
      borderRadius: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: spacing.md,
    },
    description: {
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    buttonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    modalText: {
      fontSize: 16,
      color: colors.text.primary,
      lineHeight: 24,
      marginBottom: spacing.lg,
    },
    formContainer: {
      gap: spacing.md,
    },
    formButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
  });

export default ModalExamples;
