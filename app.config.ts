import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'VineMe',
  owner: 'tonaeko',
  slug: 'vineme-mobile-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*', 'assets/fonts/*.ttf'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.vineme.app',
    associatedDomains: [
      'applinks:vineme.app',
      'applinks:www.vineme.app',
    ],
    config: {
      // Enables Google Maps on iOS when using react-native-maps
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    config: {
      // Enables Google Maps on Android when using react-native-maps
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
    // Configure FCM for Android push notifications (optional)
    // Provide via EAS file env var GOOGLE_SERVICES_JSON when ready
    ...(process.env.GOOGLE_SERVICES_JSON
      ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
      : {}),
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.vineme.app',
    intentFilters: [
      {
        action: 'VIEW',
        data: [
          { scheme: 'https', host: 'vineme.app', pathPrefix: '/group/' },
          { scheme: 'https', host: 'www.vineme.app', pathPrefix: '/group/' },
          { scheme: 'https', host: 'vineme.app', pathPrefix: '/event/' },
          { scheme: 'https', host: 'www.vineme.app', pathPrefix: '/event/' },
          { scheme: 'https', host: 'vineme.app', pathPrefix: '/referral/' },
          { scheme: 'https', host: 'www.vineme.app', pathPrefix: '/referral/' },
          { scheme: 'https', host: 'vineme.app', pathPrefix: '/notifications' },
          {
            scheme: 'https',
            host: 'www.vineme.app',
            pathPrefix: '/notifications',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
        autoVerify: true,
      },
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  scheme: 'vineme',
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: 'd4bf96e9-a94f-464d-ad98-a1265703c652',
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-notifications',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Allow VineMe to use your location to show nearby groups on the map.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});