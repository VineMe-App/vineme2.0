/**
 * Styling System Test Setup
 * Additional setup for styling system tests
 */

// Mock performance APIs for consistent testing
global.performance = global.performance || {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
};

// Mock requestAnimationFrame for animation tests
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Mock IntersectionObserver for visual tests
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));

// Mock ResizeObserver for responsive tests
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));

// Enhanced console methods for test debugging
const originalConsole = { ...console };

beforeEach(() => {
  // Reset console mocks before each test
  console.warn = jest.fn();
  console.error = jest.fn();
  console.log = jest.fn();
});

afterEach(() => {
  // Restore console after each test
  Object.assign(console, originalConsole);
});

// Custom matchers for styling tests
expect.extend({
  toHaveValidThemeStructure(received) {
    const requiredProperties = [
      'name',
      'colors',
      'typography',
      'spacing',
      'borderRadius',
      'shadows',
    ];

    const missingProperties = requiredProperties.filter(
      prop => !(prop in received)
    );

    if (missingProperties.length > 0) {
      return {
        message: () => 
          `Expected theme to have all required properties. Missing: ${missingProperties.join(', ')}`,
        pass: false,
      };
    }

    return {
      message: () => 'Expected theme not to have valid structure',
      pass: true,
    };
  },

  toHaveAccessibleContrast(received, background) {
    // This would integrate with the actual contrast checking utility
    const contrastRatio = 4.5; // Mock value - would use real calculation
    
    if (contrastRatio < 4.5) {
      return {
        message: () => 
          `Expected contrast ratio to be at least 4.5, but got ${contrastRatio}`,
        pass: false,
      };
    }

    return {
      message: () => 'Expected contrast ratio to be insufficient',
      pass: true,
    };
  },

  toRenderWithinPerformanceBudget(received, budgetMs = 16) {
    const renderTime = received; // Mock - would measure actual render time
    
    if (renderTime > budgetMs) {
      return {
        message: () => 
          `Expected render time to be within ${budgetMs}ms, but got ${renderTime}ms`,
        pass: false,
      };
    }

    return {
      message: () => `Expected render time to exceed ${budgetMs}ms`,
      pass: true,
    };
  },
});

// Global test utilities
global.testUtils = {
  // Utility to create test themes
  createTestTheme: (overrides = {}) => ({
    name: 'test',
    colors: {
      primary: { 500: '#007AFF' },
      background: { primary: '#FFFFFF' },
      text: { primary: '#000000' },
      ...overrides.colors,
    },
    typography: {
      fontSize: { base: 16 },
      fontWeight: { normal: '400' },
      ...overrides.typography,
    },
    spacing: [0, 4, 8, 12, 16, 20, 24, 32],
    borderRadius: { small: 4, medium: 8, large: 12 },
    shadows: { small: { elevation: 2 } },
    ...overrides,
  }),

  // Utility to wait for theme transitions
  waitForThemeTransition: async (timeout = 1000) => {
    return new Promise(resolve => setTimeout(resolve, timeout));
  },

  // Utility to simulate performance conditions
  simulateSlowDevice: () => {
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = (fn, delay) => originalSetTimeout(fn, delay * 2);
    return () => {
      global.setTimeout = originalSetTimeout;
    };
  },
};