const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Expo config plugin to inject Google Maps API key into Info.plist
 * This allows the key to come from environment variables instead of being hardcoded
 * Also adds LSApplicationQueriesSchemes for opening Google Maps app
 */
const withGoogleMapsApiKey = (config) => {
  return withInfoPlist(config, (config) => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    
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
};

module.exports = withGoogleMapsApiKey;
