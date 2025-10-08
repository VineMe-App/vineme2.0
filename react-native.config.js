module.exports = {
  dependencies: {
    'react-native-maps': {
      platforms: {
        ios: {
          // Disable autolinking for react-native-maps to prevent duplicate symbols
          // We'll manually add the Google Maps variant in Podfile
          sourceDir: null,
        },
      },
    },
  },
};
