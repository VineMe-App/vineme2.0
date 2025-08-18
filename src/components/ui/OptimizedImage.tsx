import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Image, ImageProps, ImageStyle, View, ViewStyle, Text, StyleSheet, Dimensions } from 'react-native';
import { LoadingSpinner } from './LoadingSpinner';
import { performanceMonitor } from '../../utils/performance';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  placeholder?: React.ReactNode;
  errorComponent?: React.ReactNode;
  lazy?: boolean;
  cachePolicy?: 'memory' | 'disk' | 'memory-disk';
  resizeMode?: ImageStyle['resizeMode'];
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
  quality?: 'low' | 'medium' | 'high';
  maxWidth?: number;
  maxHeight?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export function OptimizedImage({
  source,
  placeholder,
  errorComponent,
  lazy = true,
  cachePolicy = 'memory-disk',
  resizeMode = 'cover',
  style,
  containerStyle,
  onLoadStart,
  onLoadEnd,
  onError,
  quality = 'medium',
  maxWidth,
  maxHeight,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!lazy);
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);

  const imageRef = useRef<Image>(null);
  const containerRef = useRef<View>(null);

  // Optimize image URL based on quality and dimensions
  const optimizedSource = useCallback(() => {
    if (typeof source === 'number') {
      return source;
    }

    let uri = source.uri;

    // Add optimization parameters for supported services
    if (
      uri.includes('supabase') ||
      uri.includes('cloudinary') ||
      uri.includes('imagekit')
    ) {
      const url = new URL(uri);

      // Calculate optimal dimensions
      const targetWidth =
        maxWidth || (style as ImageStyle)?.width || screenWidth;
      const targetHeight = maxHeight || (style as ImageStyle)?.height;

      // Add quality parameter
      const qualityMap = { low: 60, medium: 80, high: 95 };
      url.searchParams.set('quality', qualityMap[quality].toString());

      // Add dimension parameters
      if (targetWidth && typeof targetWidth === 'number') {
        url.searchParams.set('width', Math.round(targetWidth).toString());
      }
      if (targetHeight && typeof targetHeight === 'number') {
        url.searchParams.set('height', Math.round(targetHeight).toString());
      }

      // Add format optimization
      url.searchParams.set('format', 'webp');

      uri = url.toString();
    }

    return { uri };
  }, [source, quality, maxWidth, maxHeight, style]);

  // Intersection observer for lazy loading (simplified for React Native)
  useEffect(() => {
    if (!lazy) {
      setShouldLoad(true);
      return;
    }

    // In a real implementation, you might use react-native-intersection-observer
    // or implement viewport detection. For now, we'll load after a short delay
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [lazy]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setLoadStartTime(Date.now());
    const sourceKey =
      typeof source === 'number'
        ? `asset_${String(source)}`
        : (source as { uri: string }).uri || 'unknown';
    performanceMonitor.startTimer(`image_load_${sourceKey}`);
    onLoadStart?.();
  }, [source, onLoadStart]);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);

    if (loadStartTime) {
      const loadTime = Date.now() - loadStartTime;
      performanceMonitor.recordMetric('image_load_time', loadTime, {
        source:
          typeof source === 'number'
            ? 'local'
            : (source as { uri?: string }).uri || 'unknown',
        quality,
        lazy,
      });
    }

    const sourceKey =
      typeof source === 'number'
        ? `asset_${String(source)}`
        : (source as { uri: string }).uri || 'unknown';
    performanceMonitor.endTimer(`image_load_${sourceKey}`);
    onLoadEnd?.();
  }, [source, loadStartTime, quality, lazy, onLoadEnd]);

  const handleError = useCallback(
    (error: any) => {
      setIsLoading(false);
      setHasError(true);
      performanceMonitor.recordMetric('image_load_error', 1, {
        source:
          typeof source === 'number'
            ? 'local'
            : (source as { uri?: string }).uri || 'unknown',
        error: error?.nativeEvent?.error || 'Unknown error',
      });
      onError?.(error);
    },
    [source, onError]
  );

  const renderPlaceholder = () => {
    if (placeholder) {
      return placeholder;
    }

    return (
      <View style={[styles.placeholder, style]}>
        <LoadingSpinner size="small" />
      </View>
    );
  };

  const renderError = () => {
    if (errorComponent) {
      return errorComponent;
    }

    return (
      <View style={[styles.error, style]}>
        <Text style={styles.errorText}>Failed to load image</Text>
      </View>
    );
  };

  if (!shouldLoad) {
    return (
      <View ref={containerRef} style={[containerStyle, style]}>
        {renderPlaceholder()}
      </View>
    );
  }

  if (hasError) {
    return (
      <View ref={containerRef} style={[containerStyle, style]}>
        {renderError()}
      </View>
    );
  }

  return (
    <View ref={containerRef} style={containerStyle}>
      {isLoading && renderPlaceholder()}
      <Image
        ref={imageRef}
        source={optimizedSource()}
        style={[style, isLoading && styles.hidden]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        {...props}
      />
    </View>
  );
}

// Preload images for better performance
export function preloadImages(imageUris: string[]): Promise<void[]> {
  const preloadPromises = imageUris.map((uri) => {
    return new Promise<void>((resolve, reject) => {
      Image.prefetch(uri)
        .then(() => {
          performanceMonitor.recordMetric('image_preload_success', 1, { uri });
          resolve();
        })
        .catch((error) => {
          performanceMonitor.recordMetric('image_preload_error', 1, {
            uri,
            error,
          });
          reject(error);
        });
    });
  });

  return Promise.all(preloadPromises);
}

// Hook for managing image cache
export function useImageCache() {
  const clearCache = useCallback(async () => {
    try {
      // React Native doesn't have a built-in cache clear method
      // This would need to be implemented with a native module
      performanceMonitor.recordMetric('image_cache_clear', 1);
    } catch (error) {
      performanceMonitor.recordMetric('image_cache_clear_error', 1, { error });
    }
  }, []);

  const getCacheSize = useCallback(async (): Promise<number> => {
    try {
      // This would need to be implemented with a native module
      return 0;
    } catch (error) {
      performanceMonitor.recordMetric('image_cache_size_error', 1, { error });
      return 0;
    }
  }, []);

  return { clearCache, getCacheSize };
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
  },
  error: {
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  errorText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  hidden: {
    opacity: 0,
  },
});
