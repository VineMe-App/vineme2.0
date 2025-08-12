# Performance Optimizations

This document outlines the performance optimizations implemented in the VineMe mobile app.

## Overview

The performance optimizations focus on five key areas:
1. React Query caching configuration
2. Image lazy loading and optimization
3. Bundle size optimization with code splitting
4. Performance monitoring and metrics
5. Optimistic updates for better user experience

## 1. React Query Caching Configuration

### Enhanced Caching Strategy
- **Stale Time**: 5 minutes for medium-lived data, configurable per query type
- **Garbage Collection Time**: 30 minutes for long-term caching
- **Network Mode**: `offlineFirst` for queries, `online` for mutations
- **Retry Logic**: Smart retry with exponential backoff, avoiding retries for auth/validation errors

### Configuration Location
- `src/providers/QueryProvider.tsx` - Main configuration
- `src/config/performance.ts` - Performance presets and settings

### Key Features
- Automatic network status detection
- Platform-specific optimizations
- Error-aware retry logic
- Performance metrics integration

## 2. Image Lazy Loading and Optimization

### OptimizedImage Component
Location: `src/components/ui/OptimizedImage.tsx`

#### Features
- **Lazy Loading**: Images load only when needed
- **Quality Control**: Low/medium/high quality settings
- **Size Optimization**: Automatic resizing based on container dimensions
- **Format Optimization**: WebP format when supported
- **Caching**: Memory and disk caching strategies
- **Error Handling**: Graceful fallbacks for failed loads
- **Performance Tracking**: Load time and error metrics

#### Usage Example
```tsx
<OptimizedImage 
  source={{ uri: imageUrl }} 
  style={styles.image}
  quality="medium"
  lazy={true}
  maxWidth={400}
  maxHeight={120}
  resizeMode="cover"
/>
```

#### Integration
- Updated `EventCard` and `GroupCard` components
- Available through `src/components/ui/index.ts`

## 3. Bundle Size Optimization

### Code Splitting Utilities
Location: `src/utils/bundleOptimization.ts`

#### Features
- **Lazy Loading HOC**: `withLazyLoading` for component-level code splitting
- **Screen Splitting**: `CodeSplitting.lazyScreen` for route-based splitting
- **Component Splitting**: `CodeSplitting.lazyComponent` for feature-based splitting
- **Critical Path Preloading**: Preload essential screens
- **Bundle Tracking**: Monitor bundle sizes and load times

#### Usage Examples
```tsx
// Lazy load a screen
const LazyScreen = CodeSplitting.lazyScreen(
  () => import('./screens/ProfileScreen'),
  'ProfileScreen'
);

// Lazy load a component
const LazyComponent = CodeSplitting.lazyComponent(
  () => import('./components/HeavyComponent'),
  'HeavyComponent'
);
```

### Memory Optimization
- Component cleanup utilities
- Memory usage monitoring
- Image memory optimization
- Cache size management

## 4. Performance Monitoring and Metrics

### Performance Monitor
Location: `src/utils/performance.ts`

#### Capabilities
- **Timer Management**: Start/stop timers for measuring operations
- **Metric Recording**: Record custom performance metrics
- **Automatic Tracking**: Component renders, network requests, queries
- **Sampling**: Configurable sampling rates for production
- **Export**: JSON export for analytics integration

#### Key Metrics Tracked
- Component render times
- Network request durations
- Query performance (cache hits/misses)
- Image load times
- Bundle load times
- Memory usage patterns

#### Usage Examples
```tsx
// Manual timing
performanceMonitor.startTimer('operation');
// ... do work
performanceMonitor.endTimer('operation');

// Hook for component monitoring
const { startRender, endRender } = usePerformanceMonitor('MyComponent');

// HOC for automatic monitoring
const MonitoredComponent = withPerformanceMonitoring(MyComponent);
```

### Configuration
Location: `src/config/performance.ts`

#### Performance Presets
- **High Performance**: Good network, powerful device
- **Balanced**: Default configuration
- **Low Performance**: Slow network, older device

#### Monitoring Thresholds
- Render time: 16ms (60fps target)
- Query time: 1000ms
- Image load time: 3000ms
- Bundle load time: 5000ms

## 5. Optimistic Updates

### Implementation
Enhanced mutation hooks with optimistic updates for better perceived performance:

#### Groups
- **Join Group**: Immediately shows membership status
- **Leave Group**: Instantly removes from user's groups
- **Rollback**: Automatic reversion on failure

#### Friendships
- **Send Request**: Shows pending status immediately
- **Accept Request**: Moves to friends list instantly
- **Error Handling**: Reverts optimistic changes on failure

### Benefits
- Immediate UI feedback
- Better perceived performance
- Reduced loading states
- Improved user experience

## Configuration and Customization

### Performance Config
The performance configuration can be customized based on device capabilities:

```typescript
import { getPerformanceConfig, PERFORMANCE_PRESETS } from '../config/performance';

// Get adaptive configuration
const config = getPerformanceConfig();

// Use specific preset
const lowPerfConfig = PERFORMANCE_PRESETS.low;
```

### Monitoring Configuration
```typescript
performanceMonitor.configure({
  enableLogging: __DEV__,
  sampleRate: __DEV__ ? 1.0 : 0.1,
  maxMetrics: 1000,
});
```

## Testing

### Performance Tests
Location: `src/utils/__tests__/performance.test.ts`

Tests cover:
- Timer functionality
- Metric recording
- Memory management
- Sampling behavior
- Export functionality
- Specialized metrics

### Running Tests
```bash
npm test -- --testPathPatterns=performance.test.ts
```

## Best Practices

### Component Optimization
1. Use `React.memo` for stable props
2. Use `useMemo` for expensive calculations
3. Use `useCallback` for stable function references
4. Avoid inline objects and functions in render
5. Use proper keys in lists

### Image Optimization
1. Use WebP format when supported
2. Implement lazy loading for below-the-fold images
3. Use appropriate sizes for screen densities
4. Preload critical images
5. Use placeholder images while loading

### List Optimization
1. Use `FlatList` or `VirtualizedList` for long lists
2. Implement `getItemLayout` when possible
3. Use `keyExtractor` for better performance
4. Optimize `renderItem` with `React.memo`
5. Use `removeClippedSubviews` for very long lists

### Network Optimization
1. Implement request deduplication
2. Use appropriate cache strategies
3. Implement optimistic updates
4. Use pagination for large datasets
5. Implement offline support

## Monitoring and Analytics

### Production Monitoring
- Performance metrics are sampled at 10% in production
- Metrics can be exported for analytics platforms
- Error tracking includes performance context
- Bundle size tracking for optimization insights

### Development Tools
- React Query DevTools integration
- Performance logging in development
- Bundle analysis utilities
- Memory usage tracking

## Future Enhancements

### Planned Improvements
1. Native module integration for memory monitoring
2. Advanced image caching with native modules
3. Automatic performance regression detection
4. A/B testing for performance optimizations
5. Real-time performance dashboards

### Metrics to Add
1. Time to Interactive (TTI)
2. First Contentful Paint (FCP)
3. Largest Contentful Paint (LCP)
4. Cumulative Layout Shift (CLS)
5. Frame rate monitoring

## Conclusion

These performance optimizations provide a solid foundation for a fast, responsive mobile application. The modular approach allows for easy customization and extension based on specific needs and device capabilities.

Key benefits achieved:
- ✅ Improved caching strategies
- ✅ Optimized image loading
- ✅ Bundle size optimization
- ✅ Comprehensive performance monitoring
- ✅ Better user experience with optimistic updates
- ✅ Configurable performance presets
- ✅ Production-ready monitoring system