const { withInfoPlist, withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo config plugin to inject Google Maps API key into Info.plist (iOS) and AndroidManifest.xml (Android)
 * This allows the key to come from environment variables instead of being hardcoded
 * Also adds LSApplicationQueriesSchemes for opening Google Maps app
 */
const withGoogleMapsApiKey = (config) => {
  // Handle iOS
  config = withInfoPlist(config, (config) => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || config.ios?.config?.googleMapsApiKey;
    
    if (apiKey) {
      config.modResults.GMSApiKey = apiKey;
    }
    
    // Add LSApplicationQueriesSchemes for Google Maps
    // This allows the app to check if Google Maps is installed and open links to it
    if (!config.modResults.LSApplicationQueriesSchemes) {
      config.modResults.LSApplicationQueriesSchemes = [];
    }
    
    const schemesToAdd = ['comgooglemaps', 'googlemaps'];
    schemesToAdd.forEach((scheme) => {
      if (!config.modResults.LSApplicationQueriesSchemes.includes(scheme)) {
        config.modResults.LSApplicationQueriesSchemes.push(scheme);
      }
    });
    
    return config;
  });

  // Handle Android
  config = withAndroidManifest(config, (config) => {
    // Try to get API key from config first (set by app.config.ts), then environment variable
    const apiKey = config.android?.config?.googleMaps?.apiKey || 
                   process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    // Always log during build to help debug
    console.log('[withGoogleMapsApiKey] Checking API key...');
    console.log('[withGoogleMapsApiKey] API key from config.android.config.googleMaps.apiKey:', config.android?.config?.googleMaps?.apiKey ? 'present' : 'missing');
    console.log('[withGoogleMapsApiKey] API key from process.env:', process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ? 'present' : 'missing');
    
    if (!apiKey) {
      console.warn('[withGoogleMapsApiKey] WARNING: No Google Maps API key found! Maps will not work.');
      return config;
    }
    
    console.log('[withGoogleMapsApiKey] Injecting Google Maps API key into AndroidManifest.xml');
    console.log('[withGoogleMapsApiKey] API key starts with:', apiKey.substring(0, 20) + '...');
    
    const { manifest } = config.modResults;
    
    if (!manifest.application) {
      manifest.application = [{ $: {} }];
    }
    
    const application = manifest.application[0];
    
    // Find or create the meta-data element for Google Maps API key
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }
    
    const metaDataArray = application['meta-data'];
    const existingApiKeyIndex = metaDataArray.findIndex(
      (meta) => meta && meta.$ && meta.$['android:name'] === 'com.google.android.geo.API_KEY'
    );
    
    const apiKeyMetaData = {
      $: {
        'android:name': 'com.google.android.geo.API_KEY',
        'android:value': apiKey,
      },
    };
    
    if (existingApiKeyIndex >= 0) {
      // Update existing meta-data
      console.log('[withGoogleMapsApiKey] Updating existing API key meta-data');
      metaDataArray[existingApiKeyIndex] = apiKeyMetaData;
    } else {
      // Add new meta-data
      console.log('[withGoogleMapsApiKey] Adding new API key meta-data');
      metaDataArray.push(apiKeyMetaData);
    }
    
    // Verify it was added
    const verifyIndex = metaDataArray.findIndex(
      (meta) => meta && meta.$ && meta.$['android:name'] === 'com.google.android.geo.API_KEY'
    );
    if (verifyIndex >= 0) {
      console.log('[withGoogleMapsApiKey] ✓ API key meta-data successfully added/updated');
    } else {
      console.error('[withGoogleMapsApiKey] ✗ Failed to add API key meta-data!');
    }
    
    return config;
  });

  return config;
};

module.exports = withGoogleMapsApiKey;
