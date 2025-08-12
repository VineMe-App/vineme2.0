import { Platform, Dimensions } from 'react-native';
import * as Device from 'expo-device';

export interface PlatformInfo {
  platform: 'ios' | 'android' | 'web';
  isDevice: boolean;
  deviceType: 'phone' | 'tablet' | 'desktop' | 'unknown';
  screenSize: 'small' | 'medium' | 'large';
  osVersion: string;
  modelName?: string;
}

/**
 * Get comprehensive platform information
 */
export const getPlatformInfo = (): PlatformInfo => {
  const { width, height } = Dimensions.get('window');
  const screenSize = getScreenSize(width, height);
  const versionRaw = (Platform as any)?.Version;
  const osVersion =
    typeof versionRaw === 'string'
      ? versionRaw
      : typeof versionRaw === 'number'
      ? String(versionRaw)
      : 'unknown';
  
  return {
    platform: Platform.OS as 'ios' | 'android' | 'web',
    isDevice: Device.isDevice,
    deviceType: getDeviceType(width, height),
    screenSize,
    osVersion,
    modelName: Device.modelName || undefined,
  };
};

/**
 * Determine device type based on screen dimensions
 */
const getDeviceType = (width: number, height: number): 'phone' | 'tablet' | 'desktop' | 'unknown' => {
  const minDimension = Math.min(width, height);
  const maxDimension = Math.max(width, height);
  
  if (Platform.OS === 'web') {
    return width > 1024 ? 'desktop' : width > 768 ? 'tablet' : 'phone';
  }
  
  // For mobile platforms
  if (minDimension >= 768) {
    return 'tablet';
  } else if (minDimension >= 320) {
    return 'phone';
  }
  
  return 'unknown';
};

/**
 * Determine screen size category
 */
const getScreenSize = (width: number, height: number): 'small' | 'medium' | 'large' => {
  const minDimension = Math.min(width, height);
  
  if (minDimension < 375) {
    return 'small';
  } else if (minDimension < 768) {
    return 'medium';
  } else {
    return 'large';
  }
};

/**
 * Check if running on iOS
 */
export const isIOS = (): boolean => Platform.OS === 'ios';

/**
 * Check if running on Android
 */
export const isAndroid = (): boolean => Platform.OS === 'android';

/**
 * Check if running on web
 */
export const isWeb = (): boolean => Platform.OS === 'web';

/**
 * Check if running on a tablet
 */
export const isTablet = (): boolean => {
  const { width, height } = Dimensions.get('window');
  return getDeviceType(width, height) === 'tablet';
};

/**
 * Get platform-specific styles
 */
export const getPlatformStyles = (styles: {
  ios?: any;
  android?: any;
  web?: any;
  default?: any;
}) => {
  if (isIOS() && styles.ios) {
    return styles.ios;
  } else if (isAndroid() && styles.android) {
    return styles.android;
  } else if (isWeb() && styles.web) {
    return styles.web;
  } else {
    return styles.default || {};
  }
};

/**
 * Get safe area insets for different platforms
 */
export const getSafeAreaInsets = () => {
  if (isIOS()) {
    return {
      top: 44, // Status bar + navigation bar
      bottom: 34, // Home indicator
      left: 0,
      right: 0,
    };
  } else if (isAndroid()) {
    return {
      top: 24, // Status bar
      bottom: 0,
      left: 0,
      right: 0,
    };
  } else {
    return {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    };
  }
};

/**
 * Test platform-specific features
 */
export const testPlatformFeatures = () => {
  const info = getPlatformInfo();
  const features = {
    pushNotifications: Device.isDevice,
    biometrics: Device.isDevice && (isIOS() || isAndroid()),
    camera: Device.isDevice,
    location: Device.isDevice,
    deepLinking: true,
    sharing: true,
    haptics: Device.isDevice && (isIOS() || isAndroid()),
  };
  
  return {
    platformInfo: info,
    supportedFeatures: features,
  };
};

/**
 * Log platform information for debugging
 */
export const logPlatformInfo = () => {
  const info = getPlatformInfo();
  const features = testPlatformFeatures();
  
  console.log('=== Platform Information ===');
  console.log('Platform:', info.platform);
  console.log('Device Type:', info.deviceType);
  console.log('Screen Size:', info.screenSize);
  console.log('OS Version:', info.osVersion);
  console.log('Model:', info.modelName || 'Unknown');
  console.log('Is Device:', info.isDevice);
  console.log('=== Supported Features ===');
  Object.entries(features.supportedFeatures).forEach(([feature, supported]) => {
    console.log(`${feature}:`, supported ? '✅' : '❌');
  });
  console.log('============================');
};