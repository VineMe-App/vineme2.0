#!/usr/bin/env node

/**
 * Comprehensive Admin Features Test Runner
 *
 * This script runs all admin-related tests in a structured manner,
 * providing detailed reporting and coverage analysis.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Test categories and their corresponding files
const testCategories = {
  'Unit Tests - Admin Services': [
    'src/services/__tests__/admin.test.ts',
    'src/services/__tests__/admin-comprehensive.test.ts',
    'src/services/__tests__/adminServiceWrapper.test.ts',
    'src/services/__tests__/groupCreation.test.ts',
    'src/services/__tests__/joinRequests.test.ts',
    'src/services/__tests__/contactAudit.test.ts',
  ],
  'Unit Tests - Admin Hooks': [
    'src/hooks/__tests__/useAdminAsyncOperation.test.ts',
    'src/hooks/__tests__/useGroupLeaderActions.test.ts',
    'src/hooks/__tests__/useJoinRequests.test.ts',
    'src/hooks/__tests__/useContactAudit.test.ts',
  ],
  'Unit Tests - Admin Components': [
    'src/components/admin/__tests__/UserManagementCard.test.tsx',
    'src/components/groups/__tests__/GroupLeaderPanel.test.tsx',
    'src/components/groups/__tests__/CreateGroupModal.test.tsx',
    'src/components/groups/__tests__/JoinRequestModal.test.tsx',
    'src/components/ui/__tests__/AdminErrorBoundary.test.tsx',
    'src/components/ui/__tests__/AdminLoadingStates.test.tsx',
  ],
  'Integration Tests - Admin Workflows': [
    'src/__tests__/integration/admin-workflows.test.tsx',
    'src/__tests__/integration/admin-permissions.test.tsx',
  ],
  'End-to-End Tests - Admin Journeys': [
    'src/__tests__/e2e/admin-journeys.test.tsx',
  ],
  'Performance Tests - Admin Features': [
    'src/__tests__/performance/admin-performance.test.ts',
  ],
};

// Test execution configuration
const testConfig = {
  timeout: 30000, // 30 seconds per test suite
  coverage: true,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
};

class AdminTestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      categories: {},
      startTime: Date.now(),
      endTime: null,
    };
    this.failedTests = [];
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logHeader(message) {
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log(message, 'bright');
    this.log('='.repeat(60), 'cyan');
  }

  logSubHeader(message) {
    this.log('\n' + '-'.repeat(40), 'blue');
    this.log(message, 'blue');
    this.log('-'.repeat(40), 'blue');
  }

  async runTestCategory(categoryName, testFiles) {
    this.logSubHeader(`Running ${categoryName}`);

    const categoryResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      files: {},
    };

    for (const testFile of testFiles) {
      if (!fs.existsSync(testFile)) {
        this.log(`⚠️  Test file not found: ${testFile}`, 'yellow');
        categoryResults.skipped++;
        continue;
      }

      try {
        this.log(`\n🧪 Running: ${testFile}`, 'cyan');

        const command = this.buildJestCommand(testFile);
        const output = execSync(command, {
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: testConfig.timeout,
        });

        // Parse Jest output for results
        const results = this.parseJestOutput(output);
        categoryResults.files[testFile] = results;
        categoryResults.total += results.total;
        categoryResults.passed += results.passed;
        categoryResults.failed += results.failed;

        if (results.failed > 0) {
          this.log(
            `❌ ${testFile}: ${results.failed} failed, ${results.passed} passed`,
            'red'
          );
          this.failedTests.push({ file: testFile, ...results });
        } else {
          this.log(`✅ ${testFile}: ${results.passed} passed`, 'green');
        }
      } catch (error) {
        this.log(`❌ Error running ${testFile}:`, 'red');
        this.log(error.message, 'red');
        categoryResults.failed++;
        this.failedTests.push({
          file: testFile,
          error: error.message,
          total: 1,
          passed: 0,
          failed: 1,
        });
      }
    }

    this.results.categories[categoryName] = categoryResults;
    this.results.total += categoryResults.total;
    this.results.passed += categoryResults.passed;
    this.results.failed += categoryResults.failed;
    this.results.skipped += categoryResults.skipped;

    // Category summary
    const passRate =
      categoryResults.total > 0
        ? ((categoryResults.passed / categoryResults.total) * 100).toFixed(1)
        : '0.0';

    this.log(`\n📊 ${categoryName} Summary:`, 'bright');
    this.log(`   Total: ${categoryResults.total}`, 'blue');
    this.log(`   Passed: ${categoryResults.passed}`, 'green');
    this.log(`   Failed: ${categoryResults.failed}`, 'red');
    this.log(`   Skipped: ${categoryResults.skipped}`, 'yellow');
    this.log(
      `   Pass Rate: ${passRate}%`,
      categoryResults.failed === 0 ? 'green' : 'red'
    );
  }

  buildJestCommand(testFile) {
    const jestArgs = [
      '--testPathPattern=' + testFile.replace(/\//g, '\\/'),
      '--json',
      '--passWithNoTests',
    ];

    if (testConfig.coverage) {
      jestArgs.push('--coverage');
      jestArgs.push('--coverageReporters=text-summary');
    }

    if (testConfig.verbose) {
      jestArgs.push('--verbose');
    }

    if (testConfig.detectOpenHandles) {
      jestArgs.push('--detectOpenHandles');
    }

    if (testConfig.forceExit) {
      jestArgs.push('--forceExit');
    }

    return `npx jest ${jestArgs.join(' ')}`;
  }

  parseJestOutput(output) {
    try {
      // Extract JSON from Jest output
      const lines = output.split('\n');
      const jsonLine = lines.find(
        (line) => line.trim().startsWith('{') && line.includes('"testResults"')
      );

      if (jsonLine) {
        const results = JSON.parse(jsonLine);
        return {
          total: results.numTotalTests || 0,
          passed: results.numPassedTests || 0,
          failed: results.numFailedTests || 0,
          skipped: results.numPendingTests || 0,
        };
      }
    } catch (error) {
      // Fallback parsing if JSON parsing fails
      const passedMatch = output.match(/(\d+) passed/);
      const failedMatch = output.match(/(\d+) failed/);
      const skippedMatch = output.match(/(\d+) skipped/);

      return {
        total:
          (passedMatch ? parseInt(passedMatch[1]) : 0) +
          (failedMatch ? parseInt(failedMatch[1]) : 0) +
          (skippedMatch ? parseInt(skippedMatch[1]) : 0),
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
      };
    }

    return { total: 0, passed: 0, failed: 0, skipped: 0 };
  }

  async runAllTests() {
    this.logHeader('🚀 Starting Comprehensive Admin Features Testing');

    // Check if Jest is available
    try {
      execSync('npx jest --version', { stdio: 'pipe' });
    } catch (error) {
      this.log('❌ Jest is not available. Please install Jest first.', 'red');
      process.exit(1);
    }

    // Run tests by category
    for (const [categoryName, testFiles] of Object.entries(testCategories)) {
      await this.runTestCategory(categoryName, testFiles);
    }

    this.results.endTime = Date.now();
    this.generateFinalReport();
  }

  generateFinalReport() {
    this.logHeader('📋 Final Test Report');

    const duration = (
      (this.results.endTime - this.results.startTime) /
      1000
    ).toFixed(2);
    const passRate =
      this.results.total > 0
        ? ((this.results.passed / this.results.total) * 100).toFixed(1)
        : '0.0';

    // Overall summary
    this.log('📊 Overall Results:', 'bright');
    this.log(`   Total Tests: ${this.results.total}`, 'blue');
    this.log(`   Passed: ${this.results.passed}`, 'green');
    this.log(`   Failed: ${this.results.failed}`, 'red');
    this.log(`   Skipped: ${this.results.skipped}`, 'yellow');
    this.log(
      `   Pass Rate: ${passRate}%`,
      this.results.failed === 0 ? 'green' : 'red'
    );
    this.log(`   Duration: ${duration}s`, 'blue');

    // Category breakdown
    this.log('\n📈 Category Breakdown:', 'bright');
    for (const [categoryName, categoryResults] of Object.entries(
      this.results.categories
    )) {
      const categoryPassRate =
        categoryResults.total > 0
          ? ((categoryResults.passed / categoryResults.total) * 100).toFixed(1)
          : '0.0';

      this.log(`   ${categoryName}:`, 'cyan');
      this.log(
        `     Tests: ${categoryResults.total} | Passed: ${categoryResults.passed} | Failed: ${categoryResults.failed} | Pass Rate: ${categoryPassRate}%`
      );
    }

    // Failed tests details
    if (this.failedTests.length > 0) {
      this.log('\n❌ Failed Tests:', 'red');
      this.failedTests.forEach((test) => {
        this.log(`   ${test.file}`, 'red');
        if (test.error) {
          this.log(`     Error: ${test.error}`, 'red');
        }
      });
    }

    // Coverage summary (if available)
    this.generateCoverageSummary();

    // Recommendations
    this.generateRecommendations();

    // Exit with appropriate code
    const exitCode = this.results.failed > 0 ? 1 : 0;
    this.log(
      `\n🏁 Testing completed with exit code: ${exitCode}`,
      exitCode === 0 ? 'green' : 'red'
    );

    if (exitCode === 0) {
      this.log('🎉 All admin feature tests passed!', 'green');
    } else {
      this.log(
        '⚠️  Some tests failed. Please review the failures above.',
        'red'
      );
    }

    process.exit(exitCode);
  }

  generateCoverageSummary() {
    // Check if coverage report exists
    const coverageFile = path.join(
      process.cwd(),
      'coverage',
      'coverage-summary.json'
    );
    if (fs.existsSync(coverageFile)) {
      try {
        const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));

        this.log('\n📊 Coverage Summary:', 'bright');
        this.log(`   Lines: ${coverage.total.lines.pct}%`, 'blue');
        this.log(`   Functions: ${coverage.total.functions.pct}%`, 'blue');
        this.log(`   Branches: ${coverage.total.branches.pct}%`, 'blue');
        this.log(`   Statements: ${coverage.total.statements.pct}%`, 'blue');
      } catch (error) {
        this.log('⚠️  Could not parse coverage summary', 'yellow');
      }
    }
  }

  generateRecommendations() {
    this.log('\n💡 Recommendations:', 'bright');

    if (this.results.failed > 0) {
      this.log(
        '   • Fix failing tests before deploying admin features',
        'yellow'
      );
      this.log(
        '   • Review error messages and stack traces for failed tests',
        'yellow'
      );
    }

    if (this.results.skipped > 0) {
      this.log(
        '   • Implement skipped test files to improve coverage',
        'yellow'
      );
    }

    const passRate = (this.results.passed / this.results.total) * 100;
    if (passRate < 90) {
      this.log(
        '   • Aim for >90% test pass rate for production readiness',
        'yellow'
      );
    }

    this.log(
      '   • Run performance tests regularly with production-like data volumes',
      'blue'
    );
    this.log('   • Update tests when adding new admin features', 'blue');
    this.log(
      '   • Consider adding more edge case tests for security-critical features',
      'blue'
    );
  }
}

// Main execution
if (require.main === module) {
  const runner = new AdminTestRunner();
  runner.runAllTests().catch((error) => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = AdminTestRunner;
