# Styling System Test Suite

This directory contains comprehensive tests for the styling system, covering integration, visual regression, accessibility, performance, and end-to-end functionality.

## Test Categories

### Integration Tests (`integration/`)
Tests for theme switching functionality across components and system integration.

- **theme-switching.test.tsx**: Tests theme switching across multiple components
  - Basic theme switching functionality
  - Component state preservation during theme changes
  - System theme integration
  - Error handling and rapid switching

### Visual Regression Tests (`visual-regression/`)
Tests to ensure visual consistency across themes and components.

- **component-consistency.test.tsx**: Snapshot tests for component visual consistency
  - Theme consistency across all components
  - Component variant rendering
  - Cross-theme visual comparison

### Accessibility Tests (`accessibility/`)
Tests for WCAG compliance and accessibility features.

- **compliance.test.tsx**: Accessibility compliance testing
  - Color contrast ratio validation (WCAG AA)
  - Component accessibility features
  - Screen reader compatibility
  - Focus management

### Performance Tests (`performance/`)
Tests for theme switching performance and style generation efficiency.

- **theme-operations.test.ts**: Performance testing for theme operations
  - Theme switching performance budgets
  - Style generation efficiency
  - Memory usage optimization
  - Performance monitoring and recommendations

### End-to-End Tests (`e2e/`)
Complete workflow tests for the entire styling system.

- **complete-styling-system.test.tsx**: Full app simulation tests
  - Complete user workflows with theme switching
  - Complex interactions across multiple views
  - Performance under load
  - Error recovery scenarios

## Running Tests

### Run All Styling System Tests
```bash
npm run test:styling-system
# or
node src/__tests__/styling-system/test-runner.js all
```

### Run Specific Test Categories
```bash
# Integration tests
node src/__tests__/styling-system/test-runner.js integration

# Visual regression tests
node src/__tests__/styling-system/test-runner.js visual-regression

# Accessibility tests
node src/__tests__/styling-system/test-runner.js accessibility

# Performance tests
node src/__tests__/styling-system/test-runner.js performance

# End-to-end tests
node src/__tests__/styling-system/test-runner.js e2e
```

### Test Options
```bash
# Watch mode
node src/__tests__/styling-system/test-runner.js all --watch

# Update snapshots
node src/__tests__/styling-system/test-runner.js visual-regression --updateSnapshot

# Silent mode
node src/__tests__/styling-system/test-runner.js all --silent
```

## Test Configuration

### Coverage Thresholds
- **Global**: 80% coverage for branches, functions, lines, statements
- **Theme System**: 90% coverage (higher standard for core functionality)
- **UI Components**: 85% coverage

### Performance Budgets
- **Theme Switching**: < 16ms (60fps budget)
- **Style Generation**: < 50ms for 100 components
- **Memory Usage**: < 10MB increase for 1000 style objects

### Accessibility Standards
- **WCAG AA**: Minimum 4.5:1 contrast ratio for normal text
- **WCAG AA**: Minimum 3:1 contrast ratio for large text/UI elements
- **Focus Management**: Proper focus trapping in modals
- **Screen Reader**: Proper accessibility labels and hints

## Custom Test Utilities

### Theme Testing
```javascript
// Create test theme with overrides
const testTheme = testUtils.createTestTheme({
  colors: { primary: { 500: '#FF0000' } }
});

// Wait for theme transitions
await testUtils.waitForThemeTransition();

// Simulate slow device performance
const restore = testUtils.simulateSlowDevice();
// ... run tests
restore();
```

### Custom Matchers
```javascript
// Check theme structure
expect(theme).toHaveValidThemeStructure();

// Check accessibility contrast
expect(color).toHaveAccessibleContrast(backgroundColor);

// Check performance budget
expect(renderTime).toRenderWithinPerformanceBudget(16);
```

## Test Data and Mocks

### Mocked APIs
- `performance.now()`: Consistent timing for performance tests
- `Appearance.getColorScheme()`: System theme detection
- `requestAnimationFrame`: Animation testing
- React Native components: Simplified for testing

### Test Themes
- Light theme with standard colors and spacing
- Dark theme with inverted colors
- Custom test themes with specific overrides

## Debugging Tests

### Performance Issues
1. Check performance logs: `StylePerformanceDebugger.getLogs()`
2. Monitor memory usage during tests
3. Verify style memoization is working

### Theme Issues
1. Verify theme structure with `toHaveValidThemeStructure()`
2. Check theme switching logs
3. Validate color contrast ratios

### Component Issues
1. Use snapshot testing for visual regression
2. Check accessibility props and labels
3. Verify component state preservation

## Continuous Integration

These tests are designed to run in CI environments with:
- Consistent performance measurements
- Snapshot comparison for visual regression
- Accessibility compliance validation
- Coverage reporting

## Contributing

When adding new styling system features:

1. Add integration tests for theme switching behavior
2. Include visual regression tests for new components
3. Verify accessibility compliance
4. Add performance tests for expensive operations
5. Update E2E tests for complete workflows

### Test Naming Convention
- `*.test.tsx` for component tests
- `*.test.ts` for utility/service tests
- Descriptive test names: `should maintain theme consistency during rapid switching`
- Group related tests with `describe` blocks