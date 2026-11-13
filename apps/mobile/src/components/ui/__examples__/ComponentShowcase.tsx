import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import {
  Button,
  Input,
  Card,
  Checkbox,
  Badge,
  Divider,
  Modal,
  Select,
  Form,
  FormField,
  LoadingSpinner,
  EmptyState,
} from '../index';
import { Theme } from '../../../utils/theme';

/**
 * ComponentShowcase - Demonstrates all UI components
 * This file serves as both documentation and testing for the UI component library
 */
export const ComponentShowcase: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | number>('');

  const selectOptions = [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
    { label: 'Option 3', value: '3' },
  ];

  const formConfig = {
    name: {
      rules: { required: true, minLength: 2 },
      initialValue: '',
    },
    email: {
      rules: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      initialValue: '',
    },
  };

  const handleFormSubmit = (values: any) => {
    console.log('Form submitted:', values);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>UI Component Showcase</Text>

      {/* Buttons Section */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Buttons</Text>
        <View style={styles.buttonRow}>
          <Button title="Primary" onPress={() => {}} />
          <Button title="Secondary" onPress={() => {}} variant="secondary" />
          <Button title="Danger" onPress={() => {}} variant="danger" />
        </View>
        <View style={styles.buttonRow}>
          <Button title="Ghost" onPress={() => {}} variant="ghost" />
          <Button title="Outline" onPress={() => {}} variant="outline" />
          <Button title="Loading" onPress={() => {}} loading />
        </View>
        <View style={styles.buttonRow}>
          <Button title="Small" onPress={() => {}} size="small" />
          <Button title="Medium" onPress={() => {}} size="medium" />
          <Button title="Large" onPress={() => {}} size="large" />
        </View>
      </Card>

      {/* Inputs Section */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Inputs</Text>
        <Input label="Basic Input" placeholder="Enter text here" />
        <Input
          label="Required Input"
          placeholder="This field is required"
          required
        />
        <Input
          label="Input with Error"
          placeholder="Invalid input"
          error="This field is required"
        />
        <Input
          label="Input with Helper Text"
          placeholder="Enter your email"
          helperText="We'll never share your email"
        />
        <Input
          label="Filled Variant"
          placeholder="Filled input"
          variant="filled"
        />
        <Input
          label="Outlined Variant"
          placeholder="Outlined input"
          variant="outlined"
        />
      </Card>

      {/* Cards Section */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Cards</Text>
        <Card variant="default" style={styles.exampleCard}>
          <Text>Default Card</Text>
        </Card>
        <Card variant="outlined" style={styles.exampleCard}>
          <Text>Outlined Card</Text>
        </Card>
        <Card variant="elevated" style={styles.exampleCard}>
          <Text>Elevated Card</Text>
        </Card>
        <Card
          variant="default"
          style={styles.exampleCard}
          onPress={() => console.log('Card pressed')}
        >
          <Text>Pressable Card</Text>
        </Card>
      </Card>

      {/* Form Components Section */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Form Components</Text>

        <Checkbox
          checked={checkboxChecked}
          onPress={() => setCheckboxChecked(!checkboxChecked)}
          label="I agree to the terms and conditions"
        />

        <Select
          label="Select Option"
          options={selectOptions}
          value={selectedValue}
          onSelect={(option) => setSelectedValue(option.value)}
          placeholder="Choose an option"
        />
      </Card>

      {/* Badges Section */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Badges</Text>
        <View style={styles.badgeRow}>
          <Badge>Default</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
        </View>
        <View style={styles.badgeRow}>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
        </View>
        <View style={styles.badgeRow}>
          <Badge size="small">Small</Badge>
          <Badge size="medium">Medium</Badge>
          <Badge size="large">Large</Badge>
        </View>
      </Card>

      {/* Dividers Section */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Dividers</Text>
        <Text>Content above</Text>
        <Divider />
        <Text>Content below</Text>
        <Divider label="OR" />
        <Text>Content after labeled divider</Text>
        <Divider variant="dashed" />
        <Text>Content after dashed divider</Text>
      </Card>

      {/* Loading States Section */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Loading States</Text>
        <LoadingSpinner size="small" message="Loading..." />
        <LoadingSpinner size="large" />
      </Card>

      {/* Empty States Section */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Empty States</Text>
        <EmptyState
          title="No items found"
          message="There are no items to display at this time."
          action={
            <Button title="Refresh" onPress={() => {}} variant="outline" />
          }
        />
      </Card>

      {/* Modal Section */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Modal</Text>
        <Button title="Open Modal" onPress={() => setModalVisible(true)} />

        <Modal
          isVisible={modalVisible}
          onClose={() => setModalVisible(false)}
          title="Example Modal"
          size="medium"
        >
          <Text style={styles.modalText}>
            This is an example modal with a title and close button.
          </Text>
          <Button
            title="Close"
            onPress={() => setModalVisible(false)}
            variant="outline"
          />
        </Modal>
      </Card>

      {/* Form Validation Section */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Form with Validation</Text>
        <Form config={formConfig} onSubmit={handleFormSubmit}>
          <FormField name="name">
            {({ value, error, onChange, onBlur }) => (
              <Input
                label="Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={error}
                placeholder="Enter your name"
                required
              />
            )}
          </FormField>

          <FormField name="email">
            {({ value, error, onChange, onBlur }) => (
              <Input
                label="Email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={error}
                placeholder="Enter your email"
                keyboardType="email-address"
                required
              />
            )}
          </FormField>

          <Button
            title="Submit Form"
            onPress={() => {
              // Form validation will be handled automatically
            }}
          />
        </Form>
      </Card>

      {/* Design Tokens Section */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Design Tokens</Text>
        <Text style={styles.tokenText}>
          All components use consistent design tokens for colors, spacing,
          typography, and shadows.
        </Text>
        <View style={styles.colorRow}>
          <View
            style={[
              styles.colorSwatch,
              { backgroundColor: Theme.colors.primary },
            ]}
          />
          <View
            style={[
              styles.colorSwatch,
              { backgroundColor: Theme.colors.secondary },
            ]}
          />
          <View
            style={[
              styles.colorSwatch,
              { backgroundColor: Theme.colors.success },
            ]}
          />
          <View
            style={[
              styles.colorSwatch,
              { backgroundColor: Theme.colors.warning },
            ]}
          />
          <View
            style={[
              styles.colorSwatch,
              { backgroundColor: Theme.colors.error },
            ]}
          />
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.base,
  },
  title: {
    fontSize: Theme.typography.fontSize['2xl'],
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.semiBold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.base,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  exampleCard: {
    marginBottom: Theme.spacing.sm,
    padding: Theme.spacing.base,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  modalText: {
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.base,
    textAlign: 'center',
  },
  tokenText: {
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.base,
  },
  colorRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.base,
    ...Theme.shadows.sm,
  },
});
