/**
 * Jest Configuration for Styling System Tests
 * Specialized configuration for styling system test suite
 */

const baseConfig = require('../../../jest.config');

module.exports = {
  ...baseConfig,
  displayName: 'Styling System Tests',
  testMatch: [
    '<rootDir>/src/__tests__/styling-system/**/*.test.{ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/theme/**/*.{ts,tsx}',
    'src/components/ui/**/*.{ts,tsx}',
    'src/components/brand/**/*.{ts,tsx}',
    'src/utils/colors.ts',
    'src/utils/styleUtils.ts',
    'src/utils/performanceStyleUtils.ts',
    'src/assets/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/*.test.{ts,tsx}',
    '!**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/theme/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/components/ui/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  setupFilesAfterEnv: [
    '<rootDir>/src/test-setup.js',
    '<rootDir>/src/__tests__/styling-system/test-setup.js',
  ],
  testTimeout: 15000, // Longer timeout for performance tests
};