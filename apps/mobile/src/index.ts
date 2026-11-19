// Main barrel export for src directory
export * from './types';
export * from './stores';
export * from './hooks';

// Export services selectively to avoid conflicts
export {
  supabase,
  authService,
  churchService,
  userService,
  groupService,
  eventService,
  friendshipService,
  permissionService,
  groupAdminService,
  userAdminService,
  groupCreationService,
} from './services';

// Export components selectively to avoid conflicts
export * from './components/onboarding';
export * from './components/profile';
export * from './components/groups';
export * from './components/events';
export * from './components/friends';
export { ErrorBoundary } from './components/ErrorBoundary';

// Export UI components selectively
export {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Input,
  LoadingSpinner,
  LoadingButton,
  Modal,
  Select,
  ErrorMessage,
  EmptyState,
  OfflineBanner,
  OptimizedImage,
  preloadImages,
  useImageCache,
  RoleBasedRender,
  AdminOnly,
  SuperAdminOnly,
  ChurchMemberOnly,
  PermissionGate,
  AnimatedCard,
  Form,
  useFormContext,
} from './components/ui';

// Export utils selectively to avoid conflicts
export {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  formatDateTime,
  formatDate,
  formatTime,
  capitalizeFirst,
  truncateText,
  validateEmail,
  validatePassword,
  generateId,
  debounce,
  throttle,
  globalErrorHandler,
  secureStorage,
  SECURE_STORAGE_KEYS,
  performanceMonitor,
  usePerformanceMonitor,
  withPerformanceMonitoring,
  bundleOptimizer,
  CodeSplitting,
  MemoryOptimization,
  PerformanceHints,
} from './utils';
