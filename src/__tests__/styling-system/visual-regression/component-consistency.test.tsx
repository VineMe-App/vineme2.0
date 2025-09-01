/**
 * Visual Regression Tests for Component Consistency
 * Tests to ensure visual consistency across themes and components
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Text } from '../../../components/ui/Text';
import { Badge } from '../../../components/ui/Badge';
import { lightTheme, darkTheme } from '../../../theme/themes';

// Mock component for visual testing
const VisualTestSuite: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => (
  <ThemeProvider initialTheme={theme}>
    <Text testID="heading" variant="h1">Heading Text</Text>
    <Text testID="body" variant="body">Body text content</Text>
    
    <Button testID="primary-btn" title="Primary" variant="primary" />
    <Button testID="secondary-btn" title="Secondary" variant="secondary" />
    <Button testID="outline-btn" title="Outline" variant="outline" />
    
    <Card testID="default-card" variant="default">
      <Text>Default Card</Text>
    </Card>
    <Card testID="elevated-card" variant="elevated">
      <Text>Elevated Card</Text>
    </Card>
    
    <Input testID="default-input" placeholder="Default input" />
    <Input testID="error-input" placeholder="Error input" error="Error message" />
    
    <Badge testID="success-badge" variant="success" text="Success" />
    <Badge testID="warning-badge" variant="warning" text="Warning" />
    <Badge testID="error-badge" variant="error" text="Error" />
  </ThemeProvider>
);

describe('Visual Regression - Component Consistency', () => {
  describe('Theme Consistency', () => {
    it('should render all components consistently in light theme', () => {
      const { toJSON } = render(<VisualTestSuite theme="light" />);
      
      // Snapshot test for light theme consistency
      expect(toJSON()).toMatchSnapshot('light-theme-components');
    });

    it('should render all components consistently in dark theme', () => {
      const { toJSON } = render(<VisualTestSuite theme="dark" />);
      
      // Snapshot test for dark theme consistency
      expect(toJSON()).toMatchSnapshot('dark-theme-components');
    });
  });

  describe('Component Variants', () => {
    it('should render button variants consistently', () => {
      render(<VisualTestSuite theme="light" />);
      
      const primaryBtn = screen.getByTestId('primary-btn');
      const secondaryBtn = screen.getByTestId('secondary-btn');
      const outlineBtn = screen.getByTestId('outline-btn');
      
      expect(primaryBtn).toBeDefined();
      expect(secondaryBtn).toBeDefined();
      expect(outlineBtn).toBeDefined();
      
      // Each button should have different styling
      expect(primaryBtn.props.style).not.toEqual(secondaryBtn.props.style);
      expect(secondaryBtn.props.style).not.toEqual(outlineBtn.props.style);
    });

    it('should render card variants consistently', () => {
      render(<VisualTestSuite theme="light" />);
      
      const defaultCard = screen.getByTestId('default-card');
      const elevatedCard = screen.getByTestId('elevated-card');
      
      expect(defaultCard).toBeDefined();
      expect(elevatedCard).toBeDefined();
      
      // Cards should have different elevation/shadow styles
      expect(defaultCard.props.style).not.toEqual(elevatedCard.props.style);
    });
  });
});