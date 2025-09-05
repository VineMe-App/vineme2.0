import React, { useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Input } from '../Input';
import { useTheme } from '../../../theme/provider/useTheme';

// Mock icons for examples
const EmailIcon = () => <Text style={{ fontSize: 16 }}>📧</Text>;
const PasswordIcon = () => <Text style={{ fontSize: 16 }}>🔒</Text>;
const SearchIcon = () => <Text style={{ fontSize: 16 }}>🔍</Text>;
const EyeIcon = ({ visible }: { visible: boolean }) => (
  <Text style={{ fontSize: 16 }}>{visible ? '👁️' : '🙈'}</Text>
);
const ClearIcon = () => <Text style={{ fontSize: 16 }}>❌</Text>;

export const InputExample: React.FC = () => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    search: '',
    bio: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const validateConfirmPassword = (password: string, confirmPassword: string) => {
    return password === confirmPassword;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Real-time validation
    switch (field) {
      case 'email':
        if (value && !validateEmail(value)) {
          setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
        }
        break;
      case 'password':
        if (value && !validatePassword(value)) {
          setErrors(prev => ({ ...prev, password: 'Password must be at least 8 characters' }));
        }
        // Re-validate confirm password if it exists
        if (formData.confirmPassword && !validateConfirmPassword(value, formData.confirmPassword)) {
          setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
        } else if (formData.confirmPassword) {
          setErrors(prev => ({ ...prev, confirmPassword: '' }));
        }
        break;
      case 'confirmPassword':
        if (value && !validateConfirmPassword(formData.password, value)) {
          setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
        }
        break;
    }
  };

  const clearSearch = () => {
    setFormData(prev => ({ ...prev, search: '' }));
  };

  const getSuccessMessage = (field: string, value: string) => {
    switch (field) {
      case 'email':
        return value && validateEmail(value) ? 'Valid email address' : undefined;
      case 'password':
        return value && validatePassword(value) ? 'Strong password' : undefined;
      case 'confirmPassword':
        return value && validateConfirmPassword(formData.password, value) ? 'Passwords match' : undefined;
      default:
        return undefined;
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Input Component Examples
      </Text>

      {/* Basic Inputs */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Basic Inputs
        </Text>
        
        <Input
          label="Email Address"
          placeholder="Enter your email"
          value={formData.email}
          onChangeText={(value) => handleInputChange('email', value)}
          error={errors.email}
          successMessage={getSuccessMessage('email', formData.email)}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon={<EmailIcon />}
          required
        />

        <Input
          label="Password"
          placeholder="Enter your password"
          value={formData.password}
          onChangeText={(value) => handleInputChange('password', value)}
          error={errors.password}
          successMessage={getSuccessMessage('password', formData.password)}
          secureTextEntry={!showPassword}
          leftIcon={<PasswordIcon />}
          rightIcon={<EyeIcon visible={showPassword} />}
          onRightIconPress={() => setShowPassword(!showPassword)}
          required
        />

        <Input
          label="Confirm Password"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChangeText={(value) => handleInputChange('confirmPassword', value)}
          error={errors.confirmPassword}
          successMessage={getSuccessMessage('confirmPassword', formData.confirmPassword)}
          secureTextEntry={!showConfirmPassword}
          leftIcon={<PasswordIcon />}
          rightIcon={<EyeIcon visible={showConfirmPassword} />}
          onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
          required
        />
      </View>

      {/* Variants */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Variants
        </Text>
        
        <Input
          label="Default Variant"
          placeholder="Default input"
          variant="default"
          helperText="This is the default variant"
        />

        <Input
          label="Filled Variant"
          placeholder="Filled input"
          variant="filled"
          helperText="This is the filled variant"
        />

        <Input
          label="Outlined Variant"
          placeholder="Outlined input"
          variant="outlined"
          helperText="This is the outlined variant"
        />
      </View>

      {/* Sizes */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Sizes
        </Text>
        
        <Input
          label="Small Input"
          placeholder="Small size"
          size="small"
          helperText="Small size input"
        />

        <Input
          label="Medium Input (Default)"
          placeholder="Medium size"
          size="medium"
          helperText="Medium size input"
        />

        <Input
          label="Large Input"
          placeholder="Large size"
          size="large"
          helperText="Large size input"
        />
      </View>

      {/* Validation States */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Validation States
        </Text>
        
        <Input
          label="Error State"
          placeholder="Input with error"
          error="This field has an error"
          value="invalid input"
        />

        <Input
          label="Success State"
          placeholder="Input with success"
          successMessage="This field is valid"
          value="valid input"
        />

        <Input
          label="Warning State"
          placeholder="Input with warning"
          validationState="warning"
          helperText="This field has a warning"
          value="warning input"
        />

        <Input
          label="Default State"
          placeholder="Normal input"
          helperText="This is helper text"
        />
      </View>

      {/* Special Features */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Special Features
        </Text>
        
        <Input
          label="Search Input"
          placeholder="Search..."
          value={formData.search}
          onChangeText={(value) => handleInputChange('search', value)}
          leftIcon={<SearchIcon />}
          rightIcon={formData.search ? <ClearIcon /> : undefined}
          onRightIconPress={formData.search ? clearSearch : undefined}
          helperText="Search with clear functionality"
        />

        <Input
          label="Bio (Character Count)"
          placeholder="Tell us about yourself..."
          value={formData.bio}
          onChangeText={(value) => handleInputChange('bio', value)}
          multiline
          numberOfLines={4}
          maxLength={200}
          showCharacterCount
          helperText="Maximum 200 characters"
        />

        <Input
          label="Phone Number"
          placeholder="(555) 123-4567"
          value={formData.phone}
          onChangeText={(value) => handleInputChange('phone', value)}
          keyboardType="phone-pad"
          helperText="Enter your phone number"
        />
      </View>

      {/* Accessibility Examples */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Accessibility Features
        </Text>
        
        <Input
          label="Accessible Input"
          placeholder="Accessible input example"
          accessibilityLabel="User name input field"
          accessibilityHint="Enter your full name for account registration"
          helperText="This input has enhanced accessibility support"
          required
        />

        <Input
          label="Screen Reader Optimized"
          placeholder="Optimized for screen readers"
          error="This error will be announced to screen readers"
          accessibilityLabel="Email verification field"
        />
      </View>

      {/* Custom Styling */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Custom Styling
        </Text>
        
        <Input
          label="Custom Styled Input"
          placeholder="Custom styling example"
          containerStyle={{ marginBottom: 20 }}
          inputStyle={{ fontSize: 18, fontWeight: 'bold' }}
          labelStyle={{ color: theme.colors.primary[500], fontWeight: 'bold' }}
          helperText="This input has custom styling applied"
        />

        <Input
          label="Non-Full Width"
          placeholder="Not full width"
          fullWidth={false}
          containerStyle={{ alignSelf: 'center', width: 200 }}
          helperText="This input is not full width"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
});