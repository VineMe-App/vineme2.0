# Admin Features Testing Guide

This document provides comprehensive guidance for testing the admin features in the VineMe mobile application.

## Overview

The admin features testing suite covers all aspects of administrative functionality including:

- Church admin group and user management
- Group leader capabilities
- Permission enforcement
- Performance with large datasets
- Error handling and recovery
- Security and access control

## Test Structure

### Test Categories

#### 1. Unit Tests - Admin Services

**Location**: `src/services/__tests__/`

Tests individual service methods in isolation:

- **admin.test.ts**: Core admin service functionality
- **admin-comprehensive.test.ts**: Extended admin service tests with edge cases
- **adminServiceWrapper.test.ts**: Error handling wrapper tests
- **groupCreation.test.ts**: Group creation and management tests
- **joinRequests.test.ts**: Join request handling tests
- **contactAudit.test.ts**: Contact sharing and audit tests

**Key Test Areas**:

- Permission validation
- Data transformation
- Error handling
- Database interaction mocking
- Business logic validation

#### 2. Unit Tests - Admin Hooks

**Location**: `src/hooks/__tests__/`

Tests React hooks for admin functionality:

- **useAdminAsyncOperation.test.ts**: Async operation handling
- **useGroupLeaderActions.test.ts**: Group leader action hooks
- **useJoinRequests.test.ts**: Join request management hooks
- **useContactAudit.test.ts**: Contact audit hooks

**Key Test Areas**:

- Hook state management
- Error handling
- Loading states
- Optimistic updates
- Retry mechanisms

#### 3. Unit Tests - Admin Components

**Location**: `src/components/*/tests__/`

Tests React Native components:

- **UserManagementCard.test.tsx**: User management UI
- **GroupLeaderPanel.test.tsx**: Group leader interface
- **CreateGroupModal.test.tsx**: Group creation UI
  (Removed) Join request modal tests were deleted as the flow now uses a native alert.
- **AdminErrorBoundary.test.tsx**: Error boundary component
- **AdminLoadingStates.test.tsx**: Loading state components

**Key Test Areas**:

- Component rendering
- User interactions
- Props handling
- State updates
- Accessibility

#### 4. Integration Tests - Admin Workflows

**Location**: `src/__tests__/integration/`

Tests complete admin workflows:

- **admin-workflows.test.tsx**: End-to-end admin workflows
- **admin-permissions.test.tsx**: Permission enforcement integration

**Key Test Areas**:

- Multi-step workflows
- Service integration
- State management
- Error propagation
- User experience flows

#### 5. End-to-End Tests - Admin Journeys

**Location**: `src/__tests__/e2e/`

Tests complete user journeys:

- **admin-journeys.test.tsx**: Complete admin user journeys

**Key Test Areas**:

- Authentication flows
- Navigation
- Cross-screen interactions
- Data persistence
- Error recovery

#### 6. Performance Tests

**Location**: `src/__tests__/performance/`

Tests performance with large datasets:

- **admin-performance.test.ts**: Performance benchmarks

**Key Test Areas**:

- Large dataset handling
- Memory usage
- Query optimization
- Concurrent operations
- Response times

## Running Tests

### Quick Start

```bash
# Run all admin tests
npm test -- --testPathPattern="admin"

# Run specific test category
npm test -- --testPathPattern="src/services/__tests__/admin"

# Run with coverage
npm run test:coverage -- --testPathPattern="admin"
```

### Individual Test Categories

```bash
# Unit tests - Services
npm test -- --testPathPattern="src/services/__tests__/admin"

# Unit tests - Hooks
npm test -- --testPathPattern="src/hooks/__tests__/.*admin"

# Integration tests
npm test -- --testPathPattern="src/__tests__/integration/admin"

# E2E tests
npm test -- --testPathPattern="src/__tests__/e2e/admin"

# Performance tests
npm test -- --testPathPattern="src/__tests__/performance/admin"
```

## Test Data and Mocking

### Mock Data Generation

Tests use factory functions to generate consistent mock data:

```typescript
// Example from admin-performance.test.ts
const generateMockGroups = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `group-${i}`,
    title: `Test Group ${i}`,
    status: i % 3 === 0 ? 'pending' : 'approved',
    // ... other properties
  }));
};
```

### Service Mocking

Services are mocked using Jest:

```typescript
jest.mock('@/services/admin');
const mockAdminService = adminService as jest.Mocked<typeof adminService>;
```

### Database Mocking

Supabase client is mocked globally:

```typescript
jest.mock('@/services/supabase', () => ({
  supabase: global.mockSupabaseClient,
}));
```

## Test Scenarios

### Permission Testing Scenarios

1. **Church Admin Access**
   - Valid church admin can access all admin features
   - Admin can only access their church's data
   - Admin actions are properly logged

2. **Group Leader Access**
   - Group leaders can manage their groups
   - Leaders cannot access other groups
   - Member promotion/demotion works correctly

3. **Access Denial**
   - Regular users cannot access admin features
   - Cross-church access is prevented
   - Permission revocation is handled

4. **Edge Cases**
   - Concurrent permission changes
   - Session tampering attempts
   - Role hierarchy validation

### Workflow Testing Scenarios

1. **Group Management Workflow**
   - Create group request → Admin review → Approval/Denial
   - Batch operations on multiple groups
   - Group closure process

2. **User Management Workflow**
   - View user statistics
   - Filter connected/unconnected users
   - User group history tracking

3. **Join Request Workflow**
   - User requests to join → Leader review → Approval/Denial
   - Contact information sharing
   - Notification system

### Performance Testing Scenarios

1. **Large Dataset Handling**
   - 1000+ groups loading
   - 5000+ users management
   - Pagination efficiency

2. **Concurrent Operations**
   - Multiple admin actions
   - Batch processing
   - Real-time updates

3. **Memory Management**
   - Memory leak detection
   - Garbage collection efficiency
   - Resource cleanup

## Coverage Requirements

### Minimum Coverage Targets

- **Unit Tests**: 90% line coverage
- **Integration Tests**: 80% workflow coverage
- **E2E Tests**: 70% user journey coverage

### Critical Path Coverage

Ensure 100% coverage for:

- Permission validation logic
- Data security checks
- Error handling paths
- Business rule enforcement

## Debugging Tests

### Common Issues

1. **Mock Setup Issues**

   ```typescript
   // Ensure mocks are cleared between tests
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

2. **Async Test Issues**

   ```typescript
   // Always await async operations
   await waitFor(() => {
     expect(screen.getByText('Expected Text')).toBeTruthy();
   });
   ```

3. **State Management Issues**
   ```typescript
   // Reset state between tests
   beforeEach(() => {
     mockUser = null;
   });
   ```

### Debug Tools

1. **Test Output**

   ```bash
   npm test -- --verbose --no-coverage
   ```

2. **Debug Mode**

   ```bash
   npm test -- --runInBand --detectOpenHandles
   ```

3. **Coverage Analysis**
   ```bash
   npm run test:coverage
   open coverage/lcov-report/index.html
   ```

## Continuous Integration

### GitHub Actions Integration

```yaml
name: Admin Tests
on: [push, pull_request]
jobs:
  admin-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test -- --testPathPattern="admin"
      - uses: codecov/codecov-action@v1
```

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test -- --testPathPattern=\"admin\" --passWithNoTests"
    }
  }
}
```

## Best Practices

### Writing Tests

1. **Descriptive Test Names**

   ```typescript
   it('should allow church admin to approve pending group with valid permissions', async () => {
     // Test implementation
   });
   ```

2. **Arrange-Act-Assert Pattern**

   ```typescript
   it('should handle permission denial', async () => {
     // Arrange
     mockPermissionService.hasPermission.mockResolvedValue({
       hasPermission: false,
       reason: 'Access denied',
     });

     // Act
     const result = await adminService.getChurchGroups('church-1');

     // Assert
     expect(result.error).toBeTruthy();
     expect(result.error.message).toBe('Access denied');
   });
   ```

3. **Test Edge Cases**
   - Empty datasets
   - Network failures
   - Permission changes
   - Concurrent operations

### Maintaining Tests

1. **Keep Tests Updated**
   - Update tests when features change
   - Add tests for new functionality
   - Remove obsolete tests

2. **Regular Test Reviews**
   - Review test coverage monthly
   - Identify gaps in testing
   - Update test data as needed

3. **Performance Monitoring**
   - Monitor test execution time
   - Optimize slow tests
   - Update performance benchmarks

## Troubleshooting

### Common Test Failures

1. **Permission Tests Failing**
   - Check mock permission service setup
   - Verify user role configuration
   - Ensure church ID consistency

2. **Component Tests Failing**
   - Verify React Query provider setup
   - Check mock data structure
   - Ensure proper async handling

3. **Performance Tests Failing**
   - Adjust timeout values
   - Check system resources
   - Verify mock data generation

### Getting Help

1. **Documentation**: Review this guide and inline comments
2. **Code Examples**: Check existing test files for patterns
3. **Team Support**: Reach out to the development team
4. **Debug Tools**: Use Jest debugging features

## Future Enhancements

### Planned Improvements

1. **Visual Regression Testing**
   - Screenshot comparison for admin screens
   - UI consistency validation

2. **Load Testing**
   - Stress testing with realistic data volumes
   - Performance benchmarking

3. **Security Testing**
   - Penetration testing scenarios
   - Vulnerability assessment

4. **Accessibility Testing**
   - Screen reader compatibility
   - Keyboard navigation testing

### Contributing

When adding new admin features:

1. Write tests first (TDD approach)
2. Ensure comprehensive coverage
3. Include performance considerations
4. Add integration test scenarios
5. Update this documentation

---

This testing guide ensures comprehensive coverage of all admin features while maintaining high quality and performance standards.
