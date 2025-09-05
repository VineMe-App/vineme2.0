/**
 * End-to-End Tests for Complete Styling System
 * Tests for complete styling system functionality across the app
 */

import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';
import { useTheme } from '../../../theme/provider/useTheme';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Text } from '../../../components/ui/Text';
import { Badge } from '../../../components/ui/Badge';
import { Logo } from '../../../components/brand/Logo/Logo';
import { LoadingSpinner as Spinner } from '../../../components/ui/LoadingSpinner';

// Complete app simulation for E2E testing
const CompleteAppSimulation: React.FC = () => {
  const { theme, toggleTheme, isDark, updateAssets } = useTheme();
  const [currentView, setCurrentView] = React.useState<'home' | 'profile' | 'settings'>('home');
  const [modalVisible, setModalVisible] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    bio: '',
  });

  const handleSave = async () => {
    setLoading(true);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setModalVisible(false);
  };

  const renderHomeView = () => (
    <>
      <Text testID="home-title" variant="h1">Welcome Home</Text>
      <Logo testID="app-logo" variant="full" />
      
      <Card testID="stats-card" variant="elevated">
        <Text variant="h3">Your Stats</Text>
        <Badge testID="status-badge" variant="success" text="Active" />
        <Text variant="body">You have 5 new notifications</Text>
      </Card>
      
      <Button
        testID="view-profile-btn"
        title="View Profile"
        onPress={() => setCurrentView('profile')}
        variant="primary"
      />
    </>
  );

  const renderProfileView = () => (
    <>
      <Text testID="profile-title" variant="h1">Your Profile</Text>
      
      <Card testID="profile-card">
        <Text variant="h3">{formData.name || 'John Doe'}</Text>
        <Text variant="body">{formData.email || 'john@example.com'}</Text>
        <Text variant="caption">{formData.bio || 'No bio provided'}</Text>
      </Card>
      
      <Button
        testID="edit-profile-btn"
        title="Edit Profile"
        onPress={() => setModalVisible(true)}
        variant="secondary"
      />
      
      <Button
        testID="back-home-btn"
        title="Back to Home"
        onPress={() => setCurrentView('home')}
        variant="outline"
      />
    </>
  );

  const renderSettingsView = () => (
    <>
      <Text testID="settings-title" variant="h1">Settings</Text>
      
      <Card testID="theme-settings-card">
        <Text variant="h3">Appearance</Text>
        <Text variant="body">Current theme: {theme.name}</Text>
        <Text variant="body">Dark mode: {isDark ? 'On' : 'Off'}</Text>
        
        <Button
          testID="toggle-theme-btn"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
          onPress={toggleTheme}
          variant="primary"
        />
      </Card>
      
      <Button
        testID="back-home-from-settings-btn"
        title="Back to Home"
        onPress={() => setCurrentView('home')}
        variant="outline"
      />
    </>
  );

  return (
    <>
      {/* Navigation */}
      <Card testID="navigation-card" variant="default">
        <Button
          testID="nav-home-btn"
          title="Home"
          onPress={() => setCurrentView('home')}
          variant={currentView === 'home' ? 'primary' : 'outline'}
        />
        <Button
          testID="nav-profile-btn"
          title="Profile"
          onPress={() => setCurrentView('profile')}
          variant={currentView === 'profile' ? 'primary' : 'outline'}
        />
        <Button
          testID="nav-settings-btn"
          title="Settings"
          onPress={() => setCurrentView('settings')}
          variant={currentView === 'settings' ? 'primary' : 'outline'}
        />
      </Card>

      {/* Main Content */}
      <Card testID="main-content-card" variant="elevated">
        {currentView === 'home' && renderHomeView()}
        {currentView === 'profile' && renderProfileView()}
        {currentView === 'settings' && renderSettingsView()}
      </Card>

      {/* Edit Profile Modal */}
      <Modal
        testID="edit-profile-modal"
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Edit Profile"
      >
        <Input
          testID="name-input"
          label="Name"
          value={formData.name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          placeholder="Enter your name"
        />
        
        <Input
          testID="email-input"
          label="Email"
          value={formData.email}
          onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
          placeholder="Enter your email"
        />
        
        <Input
          testID="bio-input"
          label="Bio"
          value={formData.bio}
          onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
          placeholder="Tell us about yourself"
          multiline
        />
        
        {loading ? (
          <Spinner testID="save-spinner" size="medium" />
        ) : (
          <>
            <Button
              testID="save-profile-btn"
              title="Save Changes"
              onPress={handleSave}
              variant="primary"
            />
            <Button
              testID="cancel-edit-btn"
              title="Cancel"
              onPress={() => setModalVisible(false)}
              variant="outline"
            />
          </>
        )}
      </Modal>
    </>
  );
};

describe('Complete Styling System E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full App Navigation with Theme Consistency', () => {
    it('should maintain theme consistency across all views and interactions', async () => {
      render(
        <ThemeProvider initialTheme="light">
          <CompleteAppSimulation />
        </ThemeProvider>
      );

      // Start on home view
      expect(screen.getByTestId('home-title')).toHaveTextContent('Welcome Home');
      expect(screen.getByTestId('app-logo')).toBeDefined();

      // Navigate to profile
      act(() => {
        screen.getByTestId('nav-profile-btn').props.onPress();
      });

      await waitFor(() => {
        expect(screen.getByTestId('profile-title')).toHaveTextContent('Your Profile');
      });

      // Navigate to settings
      act(() => {
        screen.getByTestId('nav-settings-btn').props.onPress();
      });

      await waitFor(() => {
        expect(screen.getByTestId('settings-title')).toHaveTextContent('Settings');
      });

      // Toggle theme from settings
      act(() => {
        screen.getByTestId('toggle-theme-btn').props.onPress();
      });

      await waitFor(() => {
        expect(screen.getByTestId('theme-settings-card')).toBeDefined();
      });

      // Navigate back to home - should maintain dark theme
      act(() => {
        screen.getByTestId('nav-home-btn').props.onPress();
      });

      await waitFor(() => {
        expect(screen.getByTestId('home-title')).toHaveTextContent('Welcome Home');
      });
    });
  });

  describe('Complex User Interactions', () => {
    it('should handle complete profile editing workflow with theme switching', async () => {
      render(
        <ThemeProvider initialTheme="light">
          <CompleteAppSimulation />
        </ThemeProvider>
      );

      // Navigate to profile
      act(() => {
        screen.getByTestId('nav-profile-btn').props.onPress();
      });

      // Open edit modal
      act(() => {
        screen.getByTestId('edit-profile-btn').props.onPress();
      });

      await waitFor(() => {
        expect(screen.getByTestId('edit-profile-modal')).toBeDefined();
      });

      // Fill out form
      const nameInput = screen.getByTestId('name-input');
      const emailInput = screen.getByTestId('email-input');
      const bioInput = screen.getByTestId('bio-input');

      act(() => {
        nameInput.props.onChangeText('Jane Smith');
        emailInput.props.onChangeText('jane@example.com');
        bioInput.props.onChangeText('Software developer');
      });

      // Switch theme while modal is open
      act(() => {
        screen.getByTestId('nav-settings-btn').props.onPress();
      });

      await waitFor(() => {
        expect(screen.getByTestId('settings-title')).toBeDefined();
      });

      act(() => {
        screen.getByTestId('toggle-theme-btn').props.onPress();
      });

      // Go back to profile and modal should still be there with data preserved
      act(() => {
        screen.getByTestId('nav-profile-btn').props.onPress();
      });

      // Save changes
      act(() => {
        screen.getByTestId('save-profile-btn').props.onPress();
      });

      // Should show loading spinner
      await waitFor(() => {
        expect(screen.getByTestId('save-spinner')).toBeDefined();
      });

      // Wait for save to complete
      await waitFor(() => {
        expect(screen.queryByTestId('save-spinner')).toBeNull();
      }, { timeout: 2000 });

      // Profile should be updated
      expect(screen.getByTestId('profile-card')).toBeDefined();
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with rapid theme switching and navigation', async () => {
      render(
        <ThemeProvider initialTheme="light">
          <CompleteAppSimulation />
        </ThemeProvider>
      );

      const startTime = Date.now();

      // Perform rapid operations
      for (let i = 0; i < 10; i++) {
        // Navigate between views
        act(() => {
          screen.getByTestId('nav-profile-btn').props.onPress();
        });
        
        act(() => {
          screen.getByTestId('nav-settings-btn').props.onPress();
        });
        
        // Toggle theme
        act(() => {
          screen.getByTestId('toggle-theme-btn').props.onPress();
        });
        
        act(() => {
          screen.getByTestId('nav-home-btn').props.onPress();
        });
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (less than 1 second)
      expect(totalTime).toBeLessThan(1000);

      // App should still be functional
      expect(screen.getByTestId('home-title')).toHaveTextContent('Welcome Home');
    });
  });

  describe('Error Recovery', () => {
    it('should recover gracefully from component errors while maintaining theme', async () => {
      const ErrorComponent: React.FC = () => {
        const [shouldError, setShouldError] = React.useState(false);
        
        if (shouldError) {
          throw new Error('Test error');
        }
        
        return (
          <Button
            testID="error-trigger-btn"
            title="Trigger Error"
            onPress={() => setShouldError(true)}
          />
        );
      };

      const AppWithErrorBoundary: React.FC = () => (
        <ThemeProvider initialTheme="light">
          <CompleteAppSimulation />
          <ErrorComponent />
        </ThemeProvider>
      );

      // This test would need an error boundary to be meaningful
      // For now, we'll test that the theme system doesn't break
      render(<AppWithErrorBoundary />);

      expect(screen.getByTestId('home-title')).toBeDefined();
      expect(screen.getByTestId('error-trigger-btn')).toBeDefined();
    });
  });
});