/**
 * Styling System Performance Demo
 * Demonstrates performance optimizations in the styling system
 */

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  useOptimizedStyles,
  useStylePerformanceMonitor,
  useOptimizedThemeSwitch,
  useBatchedStyleOperations,
  useStylePerformanceDebug,
  useStyleCacheManagement,
} from '../hooks/useStylePerformance';
import { useTheme } from '../theme/provider/useTheme';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StylePerformanceMonitor } from '../components/debug/StylePerformanceMonitor';
import { Theme } from '../theme/themes/types';

// Example of a performance-optimized component
const OptimizedCard: React.FC<{ title: string; content: string }> = ({ title, content }) => {
  const styles = useOptimizedStyles(
    (theme: Theme) => ({
      card: {
        backgroundColor: theme.colors.surface.primary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        shadowColor: theme.shadows.sm.shadowColor,
        shadowOffset: theme.shadows.sm.shadowOffset,
        shadowOpacity: theme.shadows.sm.shadowOpacity,
        shadowRadius: theme.shadows.sm.shadowRadius,
        elevation: theme.shadows.sm.elevation,
      },
      title: {
        fontSize: theme.typography.fontSize.h4,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
      },
      content: {
        fontSize: theme.typography.fontSize.body,
        color: theme.colors.text.secondary,
        lineHeight: theme.typography.lineHeight.body,
      },
    }),
    {
      componentName: 'OptimizedCard',
      enableMonitoring: true,
      cacheKey: 'optimized-card',
    }
  );

  const { measureStyleOperation } = useStylePerformanceMonitor('OptimizedCard');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.content}>{content}</Text>
    </View>
  );
};

// Example of batch operations
const BatchOperationsDemo: React.FC = () => {
  const { theme } = useTheme();
  const { batchOperations, batchStyleUpdates } = useBatchedStyleOperations();
  const [items, setItems] = useState<Array<{ id: number; color: string }>>([]);

  const handleBatchCreate = useCallback(() => {
    const operations = Array.from({ length: 10 }, (_, i) => () => ({
      id: Date.now() + i,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    }));

    const newItems = batchOperations(operations);
    setItems(prev => [...prev, ...newItems]);
  }, [batchOperations]);

  const handleBatchUpdate = useCallback(() => {
    const updates = items.map((_, index) => () => {
      // Simulate style updates
      console.log(`Updating item ${index}`);
    });

    batchStyleUpdates(updates);
  }, [items, batchStyleUpdates]);

  const styles = {
    container: {
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: theme.typography.fontSize.h4,
      fontWeight: theme.typography.fontWeight.semiBold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
    },
    buttonRow: {
      flexDirection: 'row' as const,
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    itemsContainer: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: theme.spacing.xs,
    },
    item: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing.xs,
    },
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Batch Operations Demo</Text>
      <View style={styles.buttonRow}>
        <Button
          title="Batch Create"
          variant="primary"
          size="small"
          onPress={handleBatchCreate}
        />
        <Button
          title="Batch Update"
          variant="secondary"
          size="small"
          onPress={handleBatchUpdate}
        />
        <Button
          title="Clear"
          variant="outline"
          size="small"
          onPress={() => setItems([])}
        />
      </View>
      <View style={styles.itemsContainer}>
        {items.map(item => (
          <View
            key={item.id}
            style={[styles.item, { backgroundColor: item.color }]}
          />
        ))}
      </View>
    </View>
  );
};

// Main performance demo component
export default function StylingSystemPerformanceDemo() {
  const { theme } = useTheme();
  const [showMonitor, setShowMonitor] = useState(false);
  const [cardCount, setCardCount] = useState(5);
  
  const { optimizedToggleTheme } = useOptimizedThemeSwitch();
  const { logPerformanceInfo, getPerformanceAnalysis } = useStylePerformanceDebug('PerformanceDemo');
  const { clearCache, getCacheStats } = useStyleCacheManagement();

  const styles = useOptimizedStyles(
    (theme: Theme) => ({
      container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
      },
      content: {
        flex: 1,
        padding: theme.spacing.md,
      },
      header: {
        marginBottom: theme.spacing.lg,
      },
      title: {
        fontSize: theme.typography.fontSize.h1,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.sm,
      },
      subtitle: {
        fontSize: theme.typography.fontSize.body,
        color: theme.colors.text.secondary,
        lineHeight: theme.typography.lineHeight.body,
      },
      section: {
        marginBottom: theme.spacing.lg,
      },
      sectionTitle: {
        fontSize: theme.typography.fontSize.h3,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
      },
      controlsRow: {
        flexDirection: 'row' as const,
        flexWrap: 'wrap' as const,
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
      },
      statsCard: {
        backgroundColor: theme.colors.surface.secondary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
      },
      statRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        marginBottom: theme.spacing.xs,
      },
      statLabel: {
        fontSize: theme.typography.fontSize.caption,
        color: theme.colors.text.secondary,
      },
      statValue: {
        fontSize: theme.typography.fontSize.caption,
        color: theme.colors.text.primary,
        fontWeight: theme.typography.fontWeight.medium,
      },
    }),
    {
      componentName: 'PerformanceDemo',
      enableMonitoring: true,
      preloadStyles: true,
    }
  );

  const handleAddCards = useCallback(() => {
    logPerformanceInfo('user_action', 'Adding cards', { newCount: cardCount + 5 });
    setCardCount(prev => prev + 5);
  }, [cardCount, logPerformanceInfo]);

  const handleRemoveCards = useCallback(() => {
    logPerformanceInfo('user_action', 'Removing cards', { newCount: Math.max(0, cardCount - 5) });
    setCardCount(prev => Math.max(0, prev - 5));
  }, [cardCount, logPerformanceInfo]);

  const handleClearCache = useCallback(() => {
    clearCache();
    logPerformanceInfo('cache_action', 'Cache cleared');
  }, [clearCache, logPerformanceInfo]);

  const handleShowStats = useCallback(() => {
    const stats = getCacheStats();
    const analysis = getPerformanceAnalysis();
    
    logPerformanceInfo('stats_request', 'Performance stats requested', {
      cacheSize: stats.size,
      hitRate: stats.hitRate,
      recommendations: analysis.recommendations.length,
      warnings: analysis.warnings.length,
    });
    
    alert(`Cache Size: ${stats.size}\nHit Rate: ${(stats.hitRate * 100).toFixed(1)}%\nMemory: ${(stats.totalMemoryUsage / 1000).toFixed(1)}KB`);
  }, [getCacheStats, getPerformanceAnalysis, logPerformanceInfo]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Performance Demo</Text>
          <Text style={styles.subtitle}>
            Demonstrates styling system performance optimizations including caching, 
            memoization, efficient theme switching, and performance monitoring.
          </Text>
        </View>

        {/* Performance Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Controls</Text>
          <View style={styles.controlsRow}>
            <Button
              title="Toggle Theme"
              variant="primary"
              size="small"
              onPress={optimizedToggleTheme}
            />
            <Button
              title="Show Monitor"
              variant="secondary"
              size="small"
              onPress={() => setShowMonitor(true)}
            />
            <Button
              title="Clear Cache"
              variant="outline"
              size="small"
              onPress={handleClearCache}
            />
            <Button
              title="Show Stats"
              variant="outline"
              size="small"
              onPress={handleShowStats}
            />
          </View>
        </View>

        {/* Dynamic Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dynamic Content ({cardCount} cards)</Text>
          <View style={styles.controlsRow}>
            <Button
              title="Add 5 Cards"
              variant="primary"
              size="small"
              onPress={handleAddCards}
            />
            <Button
              title="Remove 5 Cards"
              variant="secondary"
              size="small"
              onPress={handleRemoveCards}
            />
          </View>
          
          {Array.from({ length: cardCount }, (_, i) => (
            <OptimizedCard
              key={i}
              title={`Optimized Card ${i + 1}`}
              content={`This card uses performance-optimized styles with caching and memoization. Theme: ${theme.name}`}
            />
          ))}
        </View>

        {/* Batch Operations Demo */}
        <BatchOperationsDemo />

        {/* Performance Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Tips</Text>
          <Card>
            <Text style={styles.subtitle}>
              • Use useOptimizedStyles for component styles{'\n'}
              • Enable performance monitoring in development{'\n'}
              • Batch style operations when possible{'\n'}
              • Use optimized theme switching{'\n'}
              • Monitor cache hit rates and memory usage{'\n'}
              • Preload critical styles for better performance
            </Text>
          </Card>
        </View>
      </ScrollView>

      {/* Performance Monitor Overlay */}
      <StylePerformanceMonitor
        visible={showMonitor}
        onClose={() => setShowMonitor(false)}
      />
    </SafeAreaView>
  );
}