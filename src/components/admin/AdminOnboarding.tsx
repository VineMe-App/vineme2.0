/**
 * Admin Onboarding Component
 * Provides guided introduction to admin features
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AdminNavigation } from '../../utils/adminNavigation';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  features: string[];
  actionText?: string;
  actionRoute?: string;
}

const ADMIN_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Admin Features! 🎉',
    description:
      'As a church admin, you have special permissions to manage your church community.',
    icon: '👋',
    features: [
      'Approve or decline new group requests',
      'Monitor user engagement and participation',
      'Manage group leaders and permissions',
      'View comprehensive church statistics',
    ],
  },
  {
    id: 'groups',
    title: 'Group Management',
    description: 'Review and manage all Bible study groups in your church.',
    icon: '📖',
    features: [
      'Approve pending group creation requests',
      'Close inactive or problematic groups',
      'View group membership and activity',
      'Support group leaders with management tasks',
    ],
    actionText: 'Manage Groups',
    actionRoute: '/admin/manage-groups',
  },
  {
    id: 'users',
    title: 'User Oversight',
    description:
      'Monitor church member engagement and help connect unconnected members.',
    icon: '👥',
    features: [
      'View all church members and their group participation',
      "Identify members who aren't connected to any groups",
      'Track user engagement and activity levels',
      'Support community building initiatives',
    ],
    actionText: 'Manage Users',
    actionRoute: '/admin/manage-users',
  },
  {
    id: 'notifications',
    title: 'Stay Informed',
    description:
      'Get real-time notifications about admin tasks that need your attention.',
    icon: '🔔',
    features: [
      'Instant notifications for new group requests',
      'Alerts for groups needing attention',
      'Summary of pending admin actions',
      'Regular reports on church community health',
    ],
  },
  {
    id: 'help',
    title: 'Getting Help',
    description: 'Resources and support for using admin features effectively.',
    icon: '❓',
    features: [
      'Built-in help text and tooltips throughout the interface',
      'Confirmation dialogs for important actions',
      'Error handling and recovery guidance',
      'Best practices for community management',
    ],
  },
];

interface AdminOnboardingProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const AdminOnboarding: React.FC<AdminOnboardingProps> = ({
  visible,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const currentStepData = ADMIN_ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ADMIN_ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    setCompletedSteps((prev) => new Set([...prev, currentStep]));

    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleStepPress = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleActionPress = () => {
    if (currentStepData.actionRoute) {
      AdminNavigation.toAdminFeature(
        currentStepData.actionRoute.includes('groups') ? 'groups' : 'users'
      );
      onComplete();
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {ADMIN_ONBOARDING_STEPS.map((_, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.stepDot,
            index === currentStep && styles.stepDotActive,
            completedSteps.has(index) && styles.stepDotCompleted,
          ]}
          onPress={() => handleStepPress(index)}
        >
          <Text style={styles.stepDotText}>{index + 1}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStepContent = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepIcon}>{currentStepData.icon}</Text>
        <Text style={styles.stepTitle}>{currentStepData.title}</Text>
      </View>

      <Text style={styles.stepDescription}>{currentStepData.description}</Text>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Key Features:</Text>
        {currentStepData.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Text style={styles.featureBullet}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {currentStepData.actionText && currentStepData.actionRoute && (
        <Button
          title={currentStepData.actionText}
          onPress={handleActionPress}
          variant="secondary"
          style={styles.actionButton}
        />
      )}
    </ScrollView>
  );

  const renderNavigation = () => (
    <View style={styles.navigation}>
      <View style={styles.navigationLeft}>
        {!isFirstStep && (
          <Button
            title="Previous"
            onPress={handlePrevious}
            variant="secondary"
            size="small"
          />
        )}
      </View>

      <View style={styles.navigationCenter}>
        <Text style={styles.stepCounter}>
          {currentStep + 1} of {ADMIN_ONBOARDING_STEPS.length}
        </Text>
      </View>

      <View style={styles.navigationRight}>
        <Button
          title="Skip"
          onPress={onSkip}
          variant="secondary"
          size="small"
          style={styles.skipButton}
        />
        <Button
          title={isLastStep ? 'Get Started' : 'Next'}
          onPress={handleNext}
          variant="primary"
          size="small"
        />
      </View>
    </View>
  );

  return (
    <Modal
      isVisible={visible}
      onClose={onSkip}
      title="Admin Features Guide"
      size="large"
      showCloseButton={true}
      closeOnOverlayPress={false}
    >
      <View style={styles.container}>
        {renderStepIndicator()}
        {renderStepContent()}
        {renderNavigation()}
      </View>
    </Modal>
  );
};

/**
 * Admin Help System Component
 * Provides contextual help for admin features
 */
interface AdminHelpProps {
  visible: boolean;
  onClose: () => void;
  context?: 'groups' | 'users' | 'general';
}

export const AdminHelp: React.FC<AdminHelpProps> = ({
  visible,
  onClose,
  context = 'general',
}) => {
  const getHelpContent = () => {
    switch (context) {
      case 'groups':
        return {
          title: 'Group Management Help',
          sections: [
            {
              title: 'Approving Groups',
              content: [
                'Review group details carefully before approving',
                'Ensure the group aligns with church values and mission',
                'Check that the group leader is an active church member',
                'Approved groups become visible to all church members',
              ],
            },
            {
              title: 'Managing Active Groups',
              content: [
                'Monitor group activity and engagement levels',
                'Support group leaders with management challenges',
                'Close groups that become inactive or problematic',
                'Help resolve conflicts between group members',
              ],
            },
            {
              title: 'Best Practices',
              content: [
                'Respond to group requests within 2-3 business days',
                'Provide feedback when declining group requests',
                'Regularly check in with new group leaders',
                'Encourage healthy group growth and participation',
              ],
            },
          ],
        };

      case 'users':
        return {
          title: 'User Management Help',
          content: [
            {
              title: 'Understanding User Status',
              content: [
                'Connected users are active in one or more groups',
                "Unconnected users haven't joined any groups yet",
                'Use filters to focus on specific user segments',
                'Track user engagement over time',
              ],
            },
            {
              title: 'Supporting Unconnected Users',
              content: [
                'Reach out to unconnected users personally',
                'Suggest groups that match their interests',
                'Help them understand the benefits of group participation',
                'Consider creating new groups for underserved demographics',
              ],
            },
            {
              title: 'Privacy and Respect',
              content: [
                'Respect user privacy and personal boundaries',
                "Don't pressure users to join groups",
                'Use user data responsibly and ethically',
                'Focus on building genuine community connections',
              ],
            },
          ],
        };

      default:
        return {
          title: 'Admin Features Help',
          sections: [
            {
              title: 'Getting Started',
              content: [
                'Use the admin dashboard to get an overview of your church community',
                'Check notification badges for pending actions',
                'Navigate between group and user management as needed',
                'Take advantage of real-time updates and sync',
              ],
            },
            {
              title: 'Common Tasks',
              content: [
                'Review and approve new group requests',
                'Monitor user engagement and participation',
                'Support group leaders with management tasks',
                'Generate reports on community health',
              ],
            },
            {
              title: 'Troubleshooting',
              content: [
                'Refresh data if information seems outdated',
                'Check your internet connection for sync issues',
                'Contact support if you encounter persistent errors',
                'Use confirmation dialogs to prevent accidental actions',
              ],
            },
          ],
        };
    }
  };

  const helpContent = getHelpContent();

  return (
    <Modal
      isVisible={visible}
      onClose={onClose}
      title={helpContent.title}
      size="medium"
      scrollable
    >
      <ScrollView
        style={styles.helpContent}
        showsVerticalScrollIndicator={false}
      >
        {helpContent.sections.map((section, index) => (
          <Card key={index} style={styles.helpSection}>
            <Text style={styles.helpSectionTitle}>{section.title}</Text>
            {section.content.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.helpItem}>
                <Text style={styles.helpBullet}>•</Text>
                <Text style={styles.helpText}>{item}</Text>
              </View>
            ))}
          </Card>
        ))}

        <View style={styles.helpFooter}>
          <Text style={styles.helpFooterText}>
            Need more help? Contact your church administrator or technical
            support.
          </Text>
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#007AFF',
  },
  stepDotCompleted: {
    backgroundColor: '#10b981',
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 4,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  featureBullet: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 2,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    flex: 1,
  },
  actionButton: {
    marginTop: 16,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  navigationLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  navigationCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navigationRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  stepCounter: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  skipButton: {
    marginRight: 8,
  },
  helpContent: {
    flex: 1,
  },
  helpSection: {
    marginBottom: 16,
    padding: 16,
  },
  helpSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  helpBullet: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 8,
    marginTop: 2,
  },
  helpText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    flex: 1,
  },
  helpFooter: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  helpFooterText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
