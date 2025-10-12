const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Expo config plugin to inject Google Maps API key into Info.plist
 * This allows the key to come from environment variables instead of being hardcoded
 */
const withGoogleMapsApiKey = (config) => {
  return withInfoPlist(config, (config) => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (apiKey) {
      config.modResults.GMSApiKey = apiKey;
    }
    
    return config;
  });
};

module.exports = withGoogleMapsApiKey;
