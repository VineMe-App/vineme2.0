/**
 * Styling System Test Runner
 * Runs all styling system tests with proper configuration
 */

const { execSync } = require('child_process');
const path = require('path');

const testCategories = {
  integration: 'src/__tests__/styling-system/integration/**/*.test.{ts,tsx}',
  'visual-regression': 'src/__tests__/styling-system/visual-regression/**/*.test.{ts,tsx}',
  accessibility: 'src/__tests__/styling-system/accessibility/**/*.test.{ts,tsx}',
  performance: 'src/__tests__/styling-system/performance/**/*.test.{ts,tsx}',
  e2e: 'src/__tests__/styling-system/e2e/**/*.test.{ts,tsx}',
  all: 'src/__tests__/styling-system/**/*.test.{ts,tsx}',
};

function runTests(category = 'all', options = {}) {
  const testPattern = testCategories[category];
  
  if (!testPattern) {
    console.error(`Unknown test category: ${category}`);
    console.log('Available categories:', Object.keys(testCategories).join(', '));
    process.exit(1);
  }

  const jestArgs = [
    '--testPathPattern', testPattern,
    '--verbose',
    '--coverage',
    '--coverageDirectory', 'coverage/styling-system',
  ];

  if (options.watch) {
    jestArgs.push('--watch');
  }

  if (options.updateSnapshots) {
    jestArgs.push('--updateSnapshot');
  }

  if (options.silent) {
    jestArgs.push('--silent');
  }

  const command = `npx jest ${jestArgs.join(' ')}`;
  
  console.log(`Running styling system tests: ${category}`);
  console.log(`Command: ${command}`);
  
  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`✅ ${category} tests completed successfully`);
  } catch (error) {
    console.error(`❌ ${category} tests failed`);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const category = args[0] || 'all';
const options = {
  watch: args.includes('--watch'),
  updateSnapshots: args.includes('--updateSnapshot'),
  silent: args.includes('--silent'),
};

runTests(category, options);