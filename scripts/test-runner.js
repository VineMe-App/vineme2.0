#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COVERAGE_THRESHOLD = {
  statements: 70,
  branches: 70,
  functions: 70,
  lines: 70,
};

function runCommand(command, options = {}) {
  try {
    console.log(`\n🔄 Running: ${command}`);
    const result = execSync(command, {
      stdio: 'inherit',
      encoding: 'utf8',
      ...options,
    });
    return { success: true, result };
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    return { success: false, error };
  }
}

function checkCoverageThreshold() {
  const coveragePath = path.join(
    process.cwd(),
    'coverage',
    'coverage-summary.json'
  );

  if (!fs.existsSync(coveragePath)) {
    console.warn('⚠️  Coverage summary not found, skipping threshold check');
    return true;
  }

  try {
    const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const total = coverage.total;

    console.log('\n📊 Coverage Summary:');
    console.log(`  Statements: ${total.statements.pct}%`);
    console.log(`  Branches: ${total.branches.pct}%`);
    console.log(`  Functions: ${total.functions.pct}%`);
    console.log(`  Lines: ${total.lines.pct}%`);

    const failed = [];

    Object.keys(COVERAGE_THRESHOLD).forEach((key) => {
      if (total[key].pct < COVERAGE_THRESHOLD[key]) {
        failed.push(`${key}: ${total[key].pct}% < ${COVERAGE_THRESHOLD[key]}%`);
      }
    });

    if (failed.length > 0) {
      console.error('\n❌ Coverage threshold not met:');
      failed.forEach((failure) => console.error(`  ${failure}`));
      return false;
    }

    console.log('\n✅ All coverage thresholds met!');
    return true;
  } catch (error) {
    console.error('❌ Error reading coverage summary:', error.message);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';

  console.log('🧪 VineMe Test Runner');
  console.log('====================');

  let success = true;

  switch (testType) {
    case 'unit':
      console.log('\n🔬 Running unit tests...');
      const unitResult = runCommand('npm run test:unit');
      success = unitResult.success;
      break;

    case 'integration':
      console.log('\n🔗 Running integration tests...');
      const integrationResult = runCommand('npm run test:integration');
      success = integrationResult.success;
      break;

    case 'e2e':
      console.log('\n🎭 Running end-to-end tests...');
      const e2eResult = runCommand('npm run test:e2e');
      success = e2eResult.success;
      break;

    case 'coverage':
      console.log('\n📈 Running tests with coverage...');
      const coverageResult = runCommand('npm run test:coverage');
      success = coverageResult.success && checkCoverageThreshold();
      break;

    case 'ci':
      console.log('\n🚀 Running CI test suite...');
      const ciResult = runCommand('npm run test:ci');
      success = ciResult.success && checkCoverageThreshold();
      break;

    case 'all':
    default:
      console.log('\n🎯 Running all test suites...');

      // Run unit tests
      console.log('\n1️⃣ Unit Tests');
      const allUnitResult = runCommand('npm run test:unit');
      if (!allUnitResult.success) success = false;

      // Run integration tests
      console.log('\n2️⃣ Integration Tests');
      const allIntegrationResult = runCommand('npm run test:integration');
      if (!allIntegrationResult.success) success = false;

      // Run e2e tests
      console.log('\n3️⃣ End-to-End Tests');
      const allE2eResult = runCommand('npm run test:e2e');
      if (!allE2eResult.success) success = false;

      // Generate coverage report
      console.log('\n4️⃣ Coverage Report');
      const allCoverageResult = runCommand('npm run test:coverage');
      if (!allCoverageResult.success || !checkCoverageThreshold()) {
        success = false;
      }
      break;
  }

  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('✅ All tests passed successfully!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please check the output above.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runCommand, checkCoverageThreshold };
