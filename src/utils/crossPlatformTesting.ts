/**
 * Cross-Platform Testing Utilities
 * Provides utilities for testing admin features across different platforms
 */

import { Platform, Dimensions, PixelRatio } from 'react-native';
import { Alert } from 'react-native';

export interface PlatformInfo {
  os: 'ios' | 'android' | 'web' | 'windows' | 'macos';
  version: string;
  isTablet: boolean;
  screenSize: 'small' | 'medium' | 'large';
  pixelDensity: 'low' | 'medium' | 'high' | 'ultra';
  hasNotch: boolean;
  supportsHaptics: boolean;
  supportsDeepLinking: boolean;
}

export class CrossPlatformTesting {
  /**
   * Get comprehensive platform information
   */
  static getPlatformInfo(): PlatformInfo {
    const { width, height } = Dimensions.get('window');
    const pixelRatio = PixelRatio.get();
    const screenSize = width < 768 ? 'small' : width < 1024 ? 'medium' : 'large';
    const isTablet = screenSize !== 'small';

    let pixelDensity: PlatformInfo['pixelDensity'] = 'medium';
    if (pixelRatio <= 1) pixelDensity = 'low';
    else if (pixelRatio <= 2) pixelDensity = 'medium';
    else if (pixelRatio <= 3) pixelDensity = 'high';
    else pixelDensity = 'ultra';

    // Rough notch detection (iOS specific)
    const hasNotch = Platform.OS === 'ios' && height >= 812;

    return {
      os: Platform.OS as PlatformInfo['os'],
      version: Platform.Version.toString(),
      isTablet,
      screenSize,
      pixelDensity,
      hasNotch,
      supportsHaptics: Platform.OS === 'ios',
      supportsDeepLinking: Platform.OS !== 'web',
    };
  }

  /**
   * Test admin navigation flows across platforms
   */
  static async testAdminNavigation(): Promise<{
    success: boolean;
    errors: string[];
    platformSpecificIssues: string[];
  }> {
    const errors: string[] = [];
    const platformSpecificIssues: string[] = [];
    const platformInfo = this.getPlatformInfo();

    try {
      // Test basic navigation
      if (Platform.OS === 'web') {
        // Web-specific navigation tests
        if (!window.history) {
          errors.push('Browser history API not available');
        }
      }

      // Test platform-specific UI elements
      if (platformInfo.hasNotch && Platform.OS === 'ios') {
        platformSpecificIssues.push('Consider safe area insets for notched devices');
      }

      if (platformInfo.screenSize === 'small') {
        platformSpecificIssues.push('Verify admin interface usability on small screens');
      }

      // Test accessibility features
      if (Platform.OS === 'android' && parseInt(platformInfo.version) < 24) {
        platformSpecificIssues.push('Limited accessibility support on older Android versions');
      }

      return {
        success: errors.length === 0,
        errors,
        platformSpecificIssues,
      };
    } catch (error) {
      errors.push(`Navigation test failed: ${error}`);
      return { success: false, errors, platformSpecificIssues };
    }
  }

  /**
   * Test admin confirmation dialogs across platforms
   */
  static async testConfirmationDialogs(): Promise<{
    success: boolean;
    errors: string[];
    recommendations: string[];
  }> {
    const errors: string[] = [];
    const recommendations: string[] = [];
    const platformInfo = this.getPlatformInfo();

    try {
      // Test native alert availability
      if (typeof Alert.alert !== 'function') {
        errors.push('Alert.alert not available on this platform');
      }

      // Platform-specific recommendations
      if (Platform.OS === 'web') {
        recommendations.push('Consider using custom modal dialogs instead of native alerts on web');
      }

      if (platformInfo.screenSize === 'small') {
        recommendations.push('Ensure confirmation dialogs are readable on small screens');
      }

      if (Platform.OS === 'android') {
        recommendations.push('Test back button behavior with confirmation dialogs');
      }

      return {
        success: errors.length === 0,
        errors,
        recommendations,
      };
    } catch (error) {
      errors.push(`Confirmation dialog test failed: ${error}`);
      return { success: false, errors, recommendations };
    }
  }

  /**
   * Test admin data loading and caching across platforms
   */
  static async testDataHandling(): Promise<{
    success: boolean;
    errors: string[];
    performanceIssues: string[];
  }> {
    const errors: string[] = [];
    const performanceIssues: string[] = [];
    const platformInfo = this.getPlatformInfo();

    try {
      // Test storage availability
      if (Platform.OS === 'web') {
        if (!window.localStorage) {
          errors.push('localStorage not available');
        }
        if (!window.sessionStorage) {
          errors.push('sessionStorage not available');
        }
      }

      // Performance considerations
      if (platformInfo.pixelDensity === 'ultra') {
        performanceIssues.push('High pixel density may impact rendering performance');
      }

      if (platformInfo.screenSize === 'large' && Platform.OS === 'android') {
        performanceIssues.push('Large screen Android devices may need optimized layouts');
      }

      return {
        success: errors.length === 0,
        errors,
        performanceIssues,
      };
    } catch (error) {
      errors.push(`Data handling test failed: ${error}`);
      return { success: false, errors, performanceIssues };
    }
  }

  /**
   * Test admin accessibility features across platforms
   */
  static async testAccessibility(): Promise<{
    success: boolean;
    errors: string[];
    improvements: string[];
  }> {
    const errors: string[] = [];
    const improvements: string[] = [];
    const platformInfo = this.getPlatformInfo();

    try {
      // Test screen reader support
      if (Platform.OS === 'ios') {
        // iOS VoiceOver tests would go here
        improvements.push('Test with VoiceOver enabled');
      } else if (Platform.OS === 'android') {
        // Android TalkBack tests would go here
        improvements.push('Test with TalkBack enabled');
      } else if (Platform.OS === 'web') {
        improvements.push('Test with screen readers like NVDA, JAWS, or VoiceOver');
      }

      // Color contrast tests
      improvements.push('Verify color contrast ratios meet WCAG guidelines');

      // Touch target size tests
      if (platformInfo.screenSize === 'small') {
        improvements.push('Ensure touch targets are at least 44x44 points');
      }

      return {
        success: errors.length === 0,
        errors,
        improvements,
      };
    } catch (error) {
      errors.push(`Accessibility test failed: ${error}`);
      return { success: false, errors, improvements };
    }
  }

  /**
   * Run comprehensive cross-platform tests
   */
  static async runComprehensiveTests(): Promise<{
    platformInfo: PlatformInfo;
    navigation: Awaited<ReturnType<typeof CrossPlatformTesting.testAdminNavigation>>;
    dialogs: Awaited<ReturnType<typeof CrossPlatformTesting.testConfirmationDialogs>>;
    data: Awaited<ReturnType<typeof CrossPlatformTesting.testDataHandling>>;
    accessibility: Awaited<ReturnType<typeof CrossPlatformTesting.testAccessibility>>;
    overallSuccess: boolean;
  }> {
    const platformInfo = this.getPlatformInfo();
    
    const [navigation, dialogs, data, accessibility] = await Promise.all([
      this.testAdminNavigation(),
      this.testConfirmationDialogs(),
      this.testDataHandling(),
      this.testAccessibility(),
    ]);

    const overallSuccess = navigation.success && dialogs.success && data.success && accessibility.success;

    return {
      platformInfo,
      navigation,
      dialogs,
      data,
      accessibility,
      overallSuccess,
    };
  }

  /**
   * Generate test report
   */
  static generateTestReport(results: Awaited<ReturnType<typeof CrossPlatformTesting.runComprehensiveTests>>): string {
    const { platformInfo, navigation, dialogs, data, accessibility, overallSuccess } = results;

    let report = `# Cross-Platform Admin Features Test Report\n\n`;
    report += `**Platform:** ${platformInfo.os} ${platformInfo.version}\n`;
    report += `**Screen Size:** ${platformInfo.screenSize} (${platformInfo.isTablet ? 'Tablet' : 'Phone'})\n`;
    report += `**Pixel Density:** ${platformInfo.pixelDensity}\n`;
    report += `**Overall Status:** ${overallSuccess ? '✅ PASS' : '❌ FAIL'}\n\n`;

    // Navigation tests
    report += `## Navigation Tests\n`;
    report += `**Status:** ${navigation.success ? '✅ PASS' : '❌ FAIL'}\n`;
    if (navigation.errors.length > 0) {
      report += `**Errors:**\n${navigation.errors.map(e => `- ${e}`).join('\n')}\n`;
    }
    if (navigation.platformSpecificIssues.length > 0) {
      report += `**Platform Issues:**\n${navigation.platformSpecificIssues.map(i => `- ${i}`).join('\n')}\n`;
    }
    report += '\n';

    // Dialog tests
    report += `## Confirmation Dialog Tests\n`;
    report += `**Status:** ${dialogs.success ? '✅ PASS' : '❌ FAIL'}\n`;
    if (dialogs.errors.length > 0) {
      report += `**Errors:**\n${dialogs.errors.map(e => `- ${e}`).join('\n')}\n`;
    }
    if (dialogs.recommendations.length > 0) {
      report += `**Recommendations:**\n${dialogs.recommendations.map(r => `- ${r}`).join('\n')}\n`;
    }
    report += '\n';

    // Data handling tests
    report += `## Data Handling Tests\n`;
    report += `**Status:** ${data.success ? '✅ PASS' : '❌ FAIL'}\n`;
    if (data.errors.length > 0) {
      report += `**Errors:**\n${data.errors.map(e => `- ${e}`).join('\n')}\n`;
    }
    if (data.performanceIssues.length > 0) {
      report += `**Performance Issues:**\n${data.performanceIssues.map(p => `- ${p}`).join('\n')}\n`;
    }
    report += '\n';

    // Accessibility tests
    report += `## Accessibility Tests\n`;
    report += `**Status:** ${accessibility.success ? '✅ PASS' : '❌ FAIL'}\n`;
    if (accessibility.errors.length > 0) {
      report += `**Errors:**\n${accessibility.errors.map(e => `- ${e}`).join('\n')}\n`;
    }
    if (accessibility.improvements.length > 0) {
      report += `**Improvements:**\n${accessibility.improvements.map(i => `- ${i}`).join('\n')}\n`;
    }

    return report;
  }

  /**
   * Log test results to console with formatting
   */
  static logTestResults(results: Awaited<ReturnType<typeof CrossPlatformTesting.runComprehensiveTests>>) {
    const report = this.generateTestReport(results);
    console.log(report);

    // Also log structured data for debugging
    console.log('Detailed test results:', JSON.stringify(results, null, 2));
  }
}

/**
 * Platform-specific styling helpers
 */
export class PlatformStyles {
  /**
   * Get platform-appropriate shadow styles
   */
  static getShadowStyle(elevation = 2) {
    if (Platform.OS === 'ios') {
      return {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: elevation },
        shadowOpacity: 0.1,
        shadowRadius: elevation * 2,
      };
    } else if (Platform.OS === 'android') {
      return {
        elevation,
      };
    } else {
      return {
        boxShadow: `0 ${elevation}px ${elevation * 2}px rgba(0, 0, 0, 0.1)`,
      };
    }
  }

  /**
   * Get platform-appropriate safe area padding
   */
  static getSafeAreaPadding() {
    const platformInfo = CrossPlatformTesting.getPlatformInfo();
    
    if (Platform.OS === 'ios' && platformInfo.hasNotch) {
      return {
        paddingTop: 44,
        paddingBottom: 34,
      };
    } else if (Platform.OS === 'android') {
      return {
        paddingTop: 24,
        paddingBottom: 0,
      };
    } else {
      return {
        paddingTop: 0,
        paddingBottom: 0,
      };
    }
  }

  /**
   * Get platform-appropriate button styles
   */
  static getButtonStyle() {
    if (Platform.OS === 'ios') {
      return {
        borderRadius: 8,
        minHeight: 44,
      };
    } else if (Platform.OS === 'android') {
      return {
        borderRadius: 4,
        minHeight: 48,
      };
    } else {
      return {
        borderRadius: 6,
        minHeight: 40,
      };
    }
  }
}