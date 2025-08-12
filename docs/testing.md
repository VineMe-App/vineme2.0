# Testing Guide

This document outlines the comprehensive testing strategy for the VineMe mobile application.

## Overview

The VineMe app uses a multi-layered testing approach:

- **Unit Tests**: Test individual functions, components, and services in isolation
- **Integration Tests**: Test interactions between different parts of the application
- **End-to-End Tests**: Test complete user workflows from start to finish
- **Coverage Reports**: Ensure adequate test coverage across the codebase

## Test Structure

```
src/
├── __tests__/
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end tests
├── components/
│   └── **/__tests__/         # Component unit tests
├── hooks/
│   └── __tests__/            # Hook unit tests
├── services/
│   └── __tests__/            # Service unit tests
├── stores/
│   └── __tests__/            # Store unit tests
├── utils/
│   └── __tests__/            # Utility unit tests
└── providers/
    └── __tests__/            # Provider unit tests
```

## Running Tests

### All Tests
```bash
npm test                      # Run all tests
npm run test:watch           # Run tests in watch mode
```

### Specific Test Types
```bash
npm run test:unit            # Unit tests only
npm run test:integration     # Integration tests only
npm run test:e2e            # End-to-end tests only
npm run test:coverage       # Tests with coverage report
npm run test:ci             # CI-optimized test run
```

### Custom Test Runner
```bash
node scripts/test-runner.js all        # Run all test suites
node scripts/test-runner.js unit       # Run unit tests
node scripts/test-runner.js coverage   # Run with coverage
```

## Test Categories

### Unit Tests

Unit tests focus on testing individual components, functions, and services in isolation.

**Services Tests** (`src/services/__tests__/`)
- Test all CRUD operations
- Mock Supabase client responses
- Test error handling scenarios
- Verify authentication requirements

**Component Tests** (`src/components/**/__tests__/`)
- Test component rendering
- Test user interactions
- Test prop handling
- Test accessibility features

**Hook Tests** (`src/hooks/__tests__/`)
- Test custom hook behavior
- Test state management
- Test side effects
- Mock external dependencies

**Utility Tests** (`src/utils/__tests__/`)
- Test helper functions
- Test error handling utilities
- Test data transformations
- Test validation functions

### Integration Tests

Integration tests verify that different parts of the application work together correctly.

**Authentication Flow** (`src/__tests__/integration/auth-flow.test.tsx`)
- Complete sign-in/sign-up process
- Form validation
- Error handling
- State management integration

**Groups Flow** (`src/__tests__/integration/groups-flow.test.tsx`)
- Group listing and filtering
- Group joining/leaving
- Search functionality
- Data loading states

### End-to-End Tests

E2E tests simulate complete user journeys through the application.

**User Journey** (`src/__tests__/e2e/user-journey.test.tsx`)
- Complete user workflow from sign-in to feature usage
- Cross-screen navigation
- Data persistence
- Error recovery

## Coverage Requirements

The project maintains the following coverage thresholds:

- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

### Viewing Coverage Reports

```bash
npm run test:coverage        # Generate coverage report
open coverage/lcov-report/index.html  # View HTML report
```

## Testing Best Practices

### 1. Test Structure

Follow the AAA pattern:
- **Arrange**: Set up test data and mocks
- **Act**: Execute the code being tested
- **Assert**: Verify the expected outcomes

```typescript
it('should create a user profile', async () => {
  // Arrange
  const userData = { name: 'John Doe', email: 'john@example.com' };
  mockSupabase.from.mockReturnValue(mockQuery);
  
  // Act
  const result = await userService.createProfile(userData);
  
  // Assert
  expect(result.error).toBeNull();
  expect(result.data).toEqual(expect.objectContaining(userData));
});
```

### 2. Mocking Strategy

- Mock external dependencies (Supabase, Expo modules)
- Use consistent mock patterns across tests
- Reset mocks between tests

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

### 3. Component Testing

- Test user interactions, not implementation details
- Use semantic queries (getByText, getByRole)
- Test accessibility features

```typescript
it('should be accessible', () => {
  render(<Button onPress={mockPress}>Click me</Button>);
  
  const button = screen.getByRole('button');
  expect(button).toHaveAccessibilityLabel('Click me');
});
```

### 4. Async Testing

- Use waitFor for async operations
- Handle loading states
- Test error scenarios

```typescript
it('should handle loading state', async () => {
  render(<AsyncComponent />);
  
  expect(screen.getByText('Loading...')).toBeTruthy();
  
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeTruthy();
  });
});
```

## Continuous Integration

The project uses GitHub Actions for automated testing:

- Tests run on Node.js 18.x and 20.x
- All test types are executed
- Coverage reports are generated
- Results are uploaded to Codecov

### CI Configuration

See `.github/workflows/test.yml` for the complete CI setup.

## Debugging Tests

### Common Issues

1. **Mock not working**: Ensure mocks are set up before imports
2. **Async test timeout**: Increase timeout or use proper async patterns
3. **Component not rendering**: Check for missing providers or context

### Debug Commands

```bash
npm test -- --verbose        # Detailed test output
npm test -- --detectOpenHandles  # Find hanging processes
npm test -- --runInBand     # Run tests serially
```

### VS Code Integration

Add to `.vscode/settings.json`:

```json
{
  "jest.jestCommandLine": "npm test --",
  "jest.autoRun": "watch",
  "jest.showCoverageOnLoad": true
}
```

## Writing New Tests

### 1. Service Tests

```typescript
describe('ServiceName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should perform operation successfully', async () => {
    // Test implementation
  });

  it('should handle errors gracefully', async () => {
    // Error test implementation
  });
});
```

### 2. Component Tests

```typescript
describe('ComponentName', () => {
  const defaultProps = {
    // Default props
  };

  it('should render correctly', () => {
    render(<ComponentName {...defaultProps} />);
    // Assertions
  });

  it('should handle user interactions', () => {
    const mockHandler = jest.fn();
    render(<ComponentName {...defaultProps} onAction={mockHandler} />);
    
    fireEvent.press(screen.getByText('Action'));
    expect(mockHandler).toHaveBeenCalled();
  });
});
```

### 3. Integration Tests

```typescript
describe('Feature Integration', () => {
  const renderWithProviders = (component) => {
    return render(
      <QueryClientProvider client={testQueryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('should complete full workflow', async () => {
    // Multi-step test implementation
  });
});
```

## Test Maintenance

- Review and update tests when features change
- Remove obsolete tests
- Refactor common test utilities
- Keep test data realistic but minimal
- Document complex test scenarios

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)