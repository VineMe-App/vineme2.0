/**
 * Styling System Example Screen
 * Comprehensive demonstration of all components, variants, and theme features
 */

import React, { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Alert,
  Switch,
  Platform,
  Text as RNText,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/provider/useTheme';
import {
  Button,
  Card,
  Input,
  Modal,
  Spinner,
  Skeleton,
  SkeletonText,
  ProgressBar,
  CircularProgress,
  FadeIn,
  SlideIn,
  ScaleIn,
  Pulse,
  Divider,
  EmptyState,
  LoadingButton,
  Heading1,
  Heading2,
  Heading3,
  BodyText,
  BodyLarge,
  BodySmall,
  Caption,
} from '../components/ui';
import { Logo } from '../components/brand/Logo/Logo';

// Simple themed text component for demo
const ThemedText = ({ children, style, ...props }: any) => {
  const { colors } = useTheme();
  return (
    <RNText style={[{ color: colors.text.primary }, style]} {...props}>
      {children}
    </RNText>
  );
};

export default function StylingSystemExample() {
  const { theme, isDark, toggleTheme, colors, spacing } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    button1: false,
    button2: false,
    progress: 0,
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    notifications: false,
  });
  const [inputStates, setInputStates] = useState({
    normal: '',
    error: '',
    success: '',
    disabled: 'Disabled input',
  });

  // Simulate loading progress
  React.useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStates(prev => ({
        ...prev,
        progress: prev.progress >= 100 ? 0 : prev.progress + 10,
      }));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleLoadingButton = (buttonKey: 'button1' | 'button2') => {
    setLoadingStates(prev => ({ ...prev, [buttonKey]: true }));
    setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, [buttonKey]: false }));
      Alert.alert('Success', `${buttonKey} action completed!`);
    }, 2000);
  };

  // Simplified options for demo
  const categoryOptions = [
    'Technology',
    'Design', 
    'Business',
    'Marketing',
  ];

  const styles = createStyles(colors, spacing, isDark);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.section}>
          <FadeIn duration={800}>
            <Logo variant="full" size="large" />
            <Heading1 style={styles.title}>Styling System Demo</Heading1>
            <BodyText style={styles.subtitle}>
              Comprehensive showcase of all components and theme features
            </BodyText>
          </FadeIn>
        </View>

        {/* Theme Controls */}
        <Card variant="elevated" style={styles.section}>
          <Heading2>Theme Controls</Heading2>
          <View style={styles.themeControls}>
            <BodyText>Current Theme: {isDark ? 'Dark' : 'Light'}</BodyText>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{
                false: colors.neutral[300],
                true: colors.primary[500],
              }}
              thumbColor={isDark ? colors.primary[200] : colors.neutral[50]}
              testID="theme-toggle"
            />
          </View>
          <Caption>Toggle between light and dark themes to see real-time updates</Caption>
        </Card>

        {/* Typography Section */}
        <Card variant="outlined" style={styles.section}>
          <Heading2>Typography Variants</Heading2>
          <SlideIn direction="right" delay={200}>
            <View style={styles.typographyGrid}>
              <Heading1>Heading 1</Heading1>
              <Heading2>Heading 2</Heading2>
              <Heading3>Heading 3</Heading3>
              <BodyText>Body Text - Regular content</BodyText>
              <BodyLarge>Body Large - Emphasized content</BodyLarge>
              <BodySmall>Body Small - Secondary content</BodySmall>
              <Caption>Caption - Metadata and hints</Caption>
            </View>
          </SlideIn>
        </Card>

        {/* Button Variants */}
        <Card style={styles.section}>
          <Heading2>Button Variants</Heading2>
          <ScaleIn delay={400}>
            <View style={styles.buttonGrid}>
              <Button
                title="Primary"
                variant="primary"
                onPress={() => Alert.alert('Primary', 'Primary button pressed')}
              />
              <Button
                title="Secondary"
                variant="secondary"
                onPress={() => Alert.alert('Secondary', 'Secondary button pressed')}
              />
              <Button
                title="Outline"
                variant="outline"
                onPress={() => Alert.alert('Outline', 'Outline button pressed')}
              />
              <Button
                title="Ghost"
                variant="ghost"
                onPress={() => Alert.alert('Ghost', 'Ghost button pressed')}
              />
              <Button
                title="Error"
                variant="error"
                onPress={() => Alert.alert('Error', 'Error button pressed')}
              />
              <Button
                title="Disabled"
                variant="primary"
                disabled
                onPress={() => {}}
              />
            </View>
          </ScaleIn>
        </Card>

        {/* Loading States */}
        <Card variant="elevated" style={styles.section}>
          <Heading2>Loading States & Animations</Heading2>
          <Pulse>
            <View style={styles.loadingGrid}>
              <View style={styles.loadingItem}>
                <Caption>Spinner</Caption>
                <Spinner size="medium" />
              </View>
              <View style={styles.loadingItem}>
                <Caption>Progress Bar</Caption>
                <ProgressBar progress={loadingStates.progress} />
                <Caption>{loadingStates.progress}%</Caption>
              </View>
              <View style={styles.loadingItem}>
                <Caption>Circular Progress</Caption>
                <CircularProgress progress={loadingStates.progress} size={40} />
              </View>
            </View>
          </Pulse>

          <Divider style={styles.divider} />

          <View style={styles.loadingButtons}>
            <LoadingButton
              title="Loading Button 1"
              loading={loadingStates.button1}
              onPress={() => handleLoadingButton('button1')}
              variant="primary"
            />
            <LoadingButton
              title="Loading Button 2"
              loading={loadingStates.button2}
              onPress={() => handleLoadingButton('button2')}
              variant="secondary"
            />
          </View>

          <View style={styles.skeletonSection}>
            <Caption>Skeleton Loading</Caption>
            <Skeleton width="100%" height={20} />
            <SkeletonText lines={3} />
          </View>
        </Card>

        {/* Form Components */}
        <Card style={styles.section}>
          <Heading2>Form Components</Heading2>
          <View style={styles.formContainer}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={inputStates.normal}
              onChangeText={(text) => setInputStates(prev => ({ ...prev, normal: text }))}
            />

            <Input
              label="Email Address"
              placeholder="Enter your email"
              keyboardType="email-address"
              error="Please enter a valid email address"
              value={inputStates.error}
              onChangeText={(text) => setInputStates(prev => ({ ...prev, error: text }))}
            />

            <Input
              label="Success State"
              placeholder="This input shows success state"
              validationState="success"
              value={inputStates.success}
              onChangeText={(text) => setInputStates(prev => ({ ...prev, success: text }))}
            />

            <Input
              label="Disabled Input"
              placeholder="This input is disabled"
              editable={false}
              value={inputStates.disabled}
              onChangeText={() => {}}
            />

            <View style={styles.checkboxRow}>
              <Switch
                value={formData.notifications}
                onValueChange={(value) => setFormData(prev => ({ ...prev, notifications: value }))}
                trackColor={{
                  false: colors.neutral[300],
                  true: colors.primary[500],
                }}
                thumbColor={formData.notifications ? colors.primary[200] : colors.neutral[50]}
              />
              <BodyText style={styles.checkboxLabel}>Enable notifications</BodyText>
            </View>
          </View>
        </Card>

        {/* Interactive Components */}
        <Card variant="outlined" style={styles.section}>
          <Heading2>Interactive Components</Heading2>
          
          <View style={styles.interactiveGrid}>
            <Caption>Interactive elements showcase</Caption>
            <BodyText>
              This section demonstrates various interactive components with proper theming and accessibility.
            </BodyText>
          </View>

          <Button
            title="Show Modal"
            variant="outline"
            onPress={() => setModalVisible(true)}
            style={styles.modalButton}
          />

          <Button
            title="Show Confirmation"
            variant="ghost"
            onPress={() => setConfirmDialogVisible(true)}
            style={styles.modalButton}
          />
        </Card>

        {/* Accessibility Examples */}
        <Card variant="elevated" style={styles.section}>
          <Heading2>Accessibility Features</Heading2>
          <BodyText>
            All components include proper accessibility labels, roles, and keyboard navigation support.
          </BodyText>
          
          <View style={styles.accessibilityGrid}>
            <Button
              title="High Contrast Test"
              variant="primary"
              onPress={() => Alert.alert('Accessibility', 'This button meets WCAG contrast requirements')}
              accessibilityHint="Tests high contrast accessibility compliance"
            />
            
            <Input
              label="Screen Reader Test"
              placeholder="Try with screen reader enabled"
              accessibilityLabel="Screen reader test input field"
              accessibilityHint="This input demonstrates proper screen reader support"
            />
          </View>
        </Card>

        {/* Empty State Example */}
        <Card style={styles.section}>
          <EmptyState
            title="No Items Found"
            description="This is an example of an empty state component with proper styling and accessibility."
            actionText="Add Item"
            onAction={() => Alert.alert('Action', 'Empty state action triggered')}
          />
        </Card>

        {/* Color System */}
        <Card style={styles.section}>
          <Heading2>Color System</Heading2>
          <BodyText>Theme-aware color system with hex values</BodyText>
          
          <View style={styles.colorGrid}>
            <View style={[styles.colorSwatch, { backgroundColor: colors.primary[500] }]}>
              <ThemedText style={styles.colorLabel}>Primary</ThemedText>
              <ThemedText style={styles.colorHex}>{colors.primary[500]}</ThemedText>
            </View>
            <View style={[styles.colorSwatch, { backgroundColor: colors.secondary[500] }]}>
              <ThemedText style={styles.colorLabel}>Secondary</ThemedText>
              <ThemedText style={styles.colorHex}>{colors.secondary[500]}</ThemedText>
            </View>
            <View style={[styles.colorSwatch, { backgroundColor: colors.blue[500] }]}>
              <ThemedText style={styles.colorLabel}>Blue</ThemedText>
              <ThemedText style={styles.colorHex}>{colors.blue[500]}</ThemedText>
            </View>
            <View style={[styles.colorSwatch, { backgroundColor: colors.green[500] }]}>
              <ThemedText style={styles.colorLabel}>Green</ThemedText>
              <ThemedText style={styles.colorHex}>{colors.green[500]}</ThemedText>
            </View>
            <View style={[styles.colorSwatch, { backgroundColor: colors.orange[500] }]}>
              <ThemedText style={styles.colorLabel}>Orange</ThemedText>
              <ThemedText style={styles.colorHex}>{colors.orange[500]}</ThemedText>
            </View>
            <View style={[styles.colorSwatch, { backgroundColor: colors.red[500] }]}>
              <ThemedText style={styles.colorLabel}>Red</ThemedText>
              <ThemedText style={styles.colorHex}>{colors.red[500]}</ThemedText>
            </View>
          </View>
        </Card>

        {/* Spacing System */}
        <Card style={styles.section}>
          <Heading2>Spacing System</Heading2>
          <BodyText>Consistent spacing scale with pixel measurements</BodyText>
          
          <View style={styles.spacingGrid}>
            <View style={[styles.spacingExample, { padding: spacing[1] }]}>
              <ThemedText style={styles.spacingLabel}>spacing[1] = {spacing[1]}px</ThemedText>
            </View>
            <View style={[styles.spacingExample, { padding: spacing[2] }]}>
              <ThemedText style={styles.spacingLabel}>spacing[2] = {spacing[2]}px</ThemedText>
            </View>
            <View style={[styles.spacingExample, { padding: spacing[4] }]}>
              <ThemedText style={styles.spacingLabel}>spacing[4] = {spacing[4]}px</ThemedText>
            </View>
            <View style={[styles.spacingExample, { padding: spacing[6] }]}>
              <ThemedText style={styles.spacingLabel}>spacing[6] = {spacing[6]}px</ThemedText>
            </View>
            <View style={[styles.spacingExample, { padding: spacing[8] }]}>
              <ThemedText style={styles.spacingLabel}>spacing[8] = {spacing[8]}px</ThemedText>
            </View>
            <View style={[styles.spacingExample, { padding: spacing[12] }]}>
              <ThemedText style={styles.spacingLabel}>spacing[12] = {spacing[12]}px</ThemedText>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Modal Example */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Example Modal"
      >
        <View style={styles.modalContent}>
          <BodyText>
            This is an example modal with theme-aware styling and proper accessibility features.
          </BodyText>
          <Divider style={styles.modalDivider} />
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setModalVisible(false)}
            />
            <Button
              title="Confirm"
              variant="primary"
              onPress={() => {
                setModalVisible(false);
                Alert.alert('Success', 'Modal action confirmed!');
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Confirmation Dialog - Simplified Modal */}
      <Modal
        visible={confirmDialogVisible}
        onClose={() => setConfirmDialogVisible(false)}
        title="Confirm Action"
      >
        <View style={styles.modalContent}>
          <BodyText>
            Are you sure you want to perform this action? This cannot be undone.
          </BodyText>
          <Divider style={styles.modalDivider} />
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setConfirmDialogVisible(false)}
            />
            <Button
              title="Yes, Continue"
              variant="error"
              onPress={() => {
                setConfirmDialogVisible(false);
                Alert.alert('Confirmed', 'Action was confirmed!');
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, spacing: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    section: {
      marginBottom: spacing.lg,
    },
    title: {
      textAlign: 'center',
      marginTop: spacing.md,
      color: colors.text.primary,
    },
    subtitle: {
      textAlign: 'center',
      marginTop: spacing.sm,
      color: colors.text.secondary,
    },
    themeControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: spacing.md,
    },
    typographyGrid: {
      gap: spacing.sm,
    },
    buttonGrid: {
      gap: spacing.sm,
    },
    loadingGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      marginVertical: spacing.md,
    },
    loadingItem: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    loadingButtons: {
      gap: spacing.sm,
      marginVertical: spacing.md,
    },
    skeletonSection: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    divider: {
      marginVertical: spacing.md,
    },
    interactiveGrid: {
      gap: spacing.md,
    },
    formContainer: {
      gap: spacing.md,
    },
    modalButton: {
      marginTop: spacing.md,
    },
    accessibilityGrid: {
      gap: spacing.md,
      marginTop: spacing.md,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginVertical: spacing.sm,
    },
    checkboxLabel: {
      flex: 1,
    },
    modalContent: {
      padding: spacing.md,
    },
    modalDivider: {
      marginVertical: spacing.md,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    colorSwatch: {
      width: 80,
      height: 80,
      borderRadius: spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xs,
    },
    colorLabel: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#fff',
      textAlign: 'center',
      marginBottom: 2,
    },
    colorHex: {
      fontSize: 8,
      color: '#fff',
      textAlign: 'center',
      opacity: 0.9,
    },
    spacingGrid: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    spacingExample: {
      backgroundColor: colors.primary[100],
      borderRadius: spacing.sm,
      borderWidth: 1,
      borderColor: colors.primary[300],
      borderStyle: 'dashed',
      marginBottom: spacing.sm,
    },
    spacingLabel: {
      fontSize: 12,
      color: colors.primary[700],
      textAlign: 'center',
      fontWeight: '600',
    },
  });