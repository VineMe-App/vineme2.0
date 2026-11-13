import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Accessibility utilities for admin interfaces
 */

export interface AccessibilityProps {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean;
    busy?: boolean;
    expanded?: boolean;
  };
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  accessible?: boolean;
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
}

/**
 * Screen reader utilities
 */
export class ScreenReaderUtils {
  /**
   * Check if screen reader is enabled
   */
  static async isScreenReaderEnabled(): Promise<boolean> {
    try {
      return await AccessibilityInfo.isScreenReaderEnabled();
    } catch (error) {
      console.warn('Failed to check screen reader status:', error);
      return false;
    }
  }

  /**
   * Announce message to screen reader
   */
  static announceForAccessibility(message: string): void {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(message);
    } else {
      // Android equivalent
      AccessibilityInfo.announceForAccessibilityWithOptions(message, {
        queue: false,
      });
    }
  }

  /**
   * Set accessibility focus to element
   */
  static setAccessibilityFocus(reactTag: number): void {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }
}

/**
 * Generate accessible labels for admin components
 */
export class AdminAccessibilityLabels {
  /**
   * Generate label for group status
   */
  static groupStatus(status: string, groupTitle: string): string {
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    return `Group ${groupTitle} is ${statusText}`;
  }

  /**
   * Generate label for user connection status
   */
  static userConnectionStatus(
    userName: string,
    isConnected: boolean,
    groupCount: number
  ): string {
    const connectionText = isConnected ? 'connected' : 'unconnected';
    const groupText = groupCount === 1 ? 'group' : 'groups';
    return `${userName} is ${connectionText}, member of ${groupCount} ${groupText}`;
  }

  /**
   * Generate label for admin action buttons
   */
  static adminAction(
    action: string,
    targetType: string,
    targetName: string
  ): string {
    return `${action} ${targetType} ${targetName}`;
  }

  /**
   * Generate label for notification badges
   */
  static notificationBadge(count: number, type: string): string {
    const itemText = count === 1 ? type.slice(0, -1) : type;
    return `${count} pending ${itemText}`;
  }

  /**
   * Generate label for map markers
   */
  static mapMarker(groupTitle: string, memberCount: number): string {
    const memberText = memberCount === 1 ? 'member' : 'members';
    return `Group ${groupTitle} with ${memberCount} ${memberText}`;
  }

  /**
   * Generate label for cluster markers
   */
  static clusterMarker(count: number): string {
    const groupText = count === 1 ? 'group' : 'groups';
    return `Cluster of ${count} ${groupText}, tap to zoom in`;
  }

  /**
   * Generate label for filter states
   */
  static filterState(
    filterName: string,
    isActive: boolean,
    count?: number
  ): string {
    const activeText = isActive ? 'active' : 'inactive';
    const countText = count !== undefined ? ` showing ${count} items` : '';
    return `${filterName} filter is ${activeText}${countText}`;
  }
}

/**
 * Color contrast utilities
 */
export class ColorContrastUtils {
  /**
   * Calculate relative luminance of a color
   */
  static getRelativeLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;

    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Calculate contrast ratio between two colors
   */
  static getContrastRatio(color1: string, color2: string): number {
    const l1 = this.getRelativeLuminance(color1);
    const l2 = this.getRelativeLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Check if color combination meets WCAG AA standards
   */
  static meetsWCAGAA(foreground: string, background: string): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    return ratio >= 4.5; // WCAG AA standard for normal text
  }

  /**
   * Check if color combination meets WCAG AAA standards
   */
  static meetsWCAGAAA(foreground: string, background: string): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    return ratio >= 7; // WCAG AAA standard for normal text
  }

  /**
   * Convert hex color to RGB
   */
  private static hexToRgb(
    hex: string
  ): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  /**
   * Get accessible color combinations for status indicators
   */
  static getAccessibleStatusColors() {
    return {
      pending: {
        background: '#fef3c7', // Light yellow
        text: '#92400e', // Dark brown
        border: '#f59e0b', // Orange
      },
      approved: {
        background: '#fff0f8', // Light pink
        text: '#99004b', // Dark pink
        border: '#ff0083', // Primary pink
      },
      denied: {
        background: '#fee2e2', // Light red
        text: '#991b1b', // Dark red
        border: '#ef4444', // Red
      },
      closed: {
        background: '#f3f4f6', // Light gray
        text: '#374151', // Dark gray
        border: '#6b7280', // Gray
      },
    };
  }
}

/**
 * Keyboard navigation utilities
 */
export class KeyboardNavigationUtils {
  /**
   * Generate tab index for keyboard navigation
   */
  static getTabIndex(isInteractive: boolean, order?: number): number {
    if (!isInteractive) return -1;
    return order || 0;
  }

  /**
   * Check if element should be focusable
   */
  static shouldBeFocusable(element: {
    disabled?: boolean;
    hidden?: boolean;
    interactive?: boolean;
  }): boolean {
    return (
      !element.disabled && !element.hidden && element.interactive !== false
    );
  }
}

/**
 * Accessibility testing utilities
 */
export class AccessibilityTestUtils {
  /**
   * Validate accessibility props
   */
  static validateAccessibilityProps(props: AccessibilityProps): string[] {
    const issues: string[] = [];

    if (!props.accessibilityLabel && !props.accessible) {
      issues.push('Missing accessibilityLabel for interactive element');
    }

    if (props.accessibilityRole && !this.isValidRole(props.accessibilityRole)) {
      issues.push(`Invalid accessibilityRole: ${props.accessibilityRole}`);
    }

    return issues;
  }

  /**
   * Check if accessibility role is valid
   */
  private static isValidRole(role: string): boolean {
    const validRoles = [
      'button',
      'link',
      'search',
      'image',
      'keyboardkey',
      'text',
      'adjustable',
      'imagebutton',
      'header',
      'summary',
      'alert',
      'checkbox',
      'combobox',
      'menu',
      'menubar',
      'menuitem',
      'progressbar',
      'radio',
      'radiogroup',
      'scrollbar',
      'spinbutton',
      'switch',
      'tab',
      'tablist',
      'timer',
      'toolbar',
    ];
    return validRoles.includes(role);
  }
}

/**
 * High-level accessibility helper functions
 */
export const AccessibilityHelpers = {
  /**
   * Create accessible props for admin buttons
   */
  createButtonProps: (
    label: string,
    hint?: string,
    disabled?: boolean
  ): AccessibilityProps => ({
    accessibilityRole: 'button',
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: { disabled: disabled || false },
    accessible: true,
  }),

  /**
   * Create accessible props for status indicators
   */
  createStatusProps: (
    status: string,
    itemName: string
  ): AccessibilityProps => ({
    accessibilityRole: 'text',
    accessibilityLabel: AdminAccessibilityLabels.groupStatus(status, itemName),
    accessible: true,
    importantForAccessibility: 'yes',
  }),

  /**
   * Create accessible props for navigation elements
   */
  createNavigationProps: (
    label: string,
    hint?: string
  ): AccessibilityProps => ({
    accessibilityRole: 'button',
    accessibilityLabel: label,
    accessibilityHint: hint || 'Double tap to navigate',
    accessible: true,
  }),

  /**
   * Create accessible props for form inputs
   */
  createInputProps: (
    label: string,
    value?: string,
    required?: boolean,
    error?: string
  ): AccessibilityProps => ({
    accessibilityLabel: label + (required ? ' required' : ''),
    accessibilityValue: value ? { text: value } : undefined,
    accessibilityHint: error || undefined,
    accessible: true,
    importantForAccessibility: 'yes',
  }),
};
