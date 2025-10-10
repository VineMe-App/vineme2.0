/**
 * Utility to detect if the app is running in Expo Go
 * 
 * Use this to conditionally render components that require native modules
 * not available in Expo Go (like react-native-maps)
 */

import Constants from 'expo-constants';

/**
 * Check if the app is running in Expo Go
 * @returns true if running in Expo Go, false if in development build or production
 */
export function isExpoGo(): boolean {
  // Check if explicitly set via config
  const configFlag = Constants.expoConfig?.extra?.isExpoGo;
  if (configFlag !== undefined) {
    return configFlag === true;
  }

  // Fallback: Check if running in Expo Go by detecting the app ownership
  // In Expo Go, appOwnership is 'expo'
  // In development builds or standalone apps, it's null or undefined
  return Constants.appOwnership === 'expo';
}

/**
 * Check if native features are available
 * @returns true if native features like react-native-maps are available
 */
export function hasNativeFeatures(): boolean {
  return !isExpoGo();
}

