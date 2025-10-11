/**
 * Style Performance Monitor Component
 * Debug component for monitoring and displaying style performance metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {
  StylePerformanceDebugger,
  PerformanceStyleUtils,
  ThemeSwitchingOptimizer,
} from '../../utils/performanceStyleUtils';
import { useTheme } from '../../theme/provider/useTheme';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface StylePerformanceMonitorProps {
  visible?: boolean;
  onClose?: () => void;
}

export const StylePerformanceMonitor: React.FC<
  StylePerformanceMonitorProps
> = ({ visible = false, onClose }) => {
  const { theme } = useTheme();
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  // Refresh performance data
  const refreshData = useCallback(() => {
    const analysis = StylePerformanceDebugger.analyzePerformance();
    setPerformanceData(analysis);
  }, []);

  // Auto-refresh data
  useEffect(() => {
    if (visible) {
      refreshData();
      const interval = setInterval(refreshData, 2000); // Refresh every 2 seconds
      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [visible, refreshData]);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear Style Cache',
      'This will clear all cached styles. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            PerformanceStyleUtils.cleanup();
            refreshData();
          },
        },
      ]
    );
  }, [refreshData]);

  const handleGenerateReport = useCallback(() => {
    const report = StylePerformanceDebugger.generateReport();
    Alert.alert('Performance Report', report, [{ text: 'OK' }]);
  }, []);

  const styles = {
    container: {
      position: 'absolute' as const,
      top: 50,
      left: 10,
      right: 10,
      bottom: 50,
      backgroundColor: theme.colors.surface.primary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      shadowColor: theme.shadows.lg.shadowColor,
      shadowOffset: theme.shadows.lg.shadowOffset,
      shadowOpacity: theme.shadows.lg.shadowOpacity,
      shadowRadius: theme.shadows.lg.shadowRadius,
      elevation: theme.shadows.lg.elevation,
      zIndex: 1000,
    },
    header: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.primary,
    },
    title: {
      fontSize: theme.typography.fontSize.h3,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    closeButtonText: {
      fontSize: theme.typography.fontSize.body,
      color: theme.colors.primary[500],
      fontWeight: theme.typography.fontWeight.medium,
    },
    content: {
      flex: 1,
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.h4,
      fontWeight: theme.typography.fontWeight.semiBold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    statRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: theme.spacing.xs,
    },
    statLabel: {
      fontSize: theme.typography.fontSize.body,
      color: theme.colors.text.secondary,
    },
    statValue: {
      fontSize: theme.typography.fontSize.body,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    warningText: {
      fontSize: theme.typography.fontSize.caption,
      color: theme.colors.error[500],
      marginTop: theme.spacing.xs,
    },
    recommendationText: {
      fontSize: theme.typography.fontSize.caption,
      color: theme.colors.info[500],
      marginTop: theme.spacing.xs,
    },
    buttonRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-around' as const,
      marginTop: theme.spacing.md,
    },
    performanceItem: {
      backgroundColor: theme.colors.background.secondary,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing.xs,
    },
    performanceKey: {
      fontSize: theme.typography.fontSize.caption,
      color: theme.colors.text.secondary,
      fontFamily: 'monospace',
    },
    performanceValue: {
      fontSize: theme.typography.fontSize.body,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
  };

  if (!visible || !performanceData) {
    return null;
  }

  const { stats, recommendations, warnings } = performanceData;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Style Performance Monitor</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cache Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cache Statistics</Text>
          <Card>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Cache Size</Text>
              <Text style={styles.statValue}>
                {stats.cache.size} / {stats.cache.maxSize}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Hit Rate</Text>
              <Text style={styles.statValue}>
                {(stats.cache.hitRate * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Memory Usage</Text>
              <Text style={styles.statValue}>
                {(stats.cache.totalMemoryUsage / 1000).toFixed(1)} KB
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Avg Creation Time</Text>
              <Text style={styles.statValue}>
                {stats.cache.averageCreationTime.toFixed(2)} ms
              </Text>
            </View>
          </Card>
        </View>

        {/* Memoization Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Memoization</Text>
          <Card>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Memoized Functions</Text>
              <Text style={styles.statValue}>{stats.memoization.size}</Text>
            </View>
          </Card>
        </View>

        {/* Theme Switching Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme Switching</Text>
          <Card>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Cached Transitions</Text>
              <Text style={styles.statValue}>
                {stats.themeSwitching.cachedTransitions}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Is Transitioning</Text>
              <Text style={styles.statValue}>
                {stats.themeSwitching.isTransitioning ? 'Yes' : 'No'}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Queued Updates</Text>
              <Text style={styles.statValue}>
                {stats.themeSwitching.queuedUpdates}
              </Text>
            </View>
          </Card>
        </View>

        {/* Most Accessed Styles */}
        {stats.cache.mostAccessed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Most Accessed Styles</Text>
            <Card>
              {stats.cache.mostAccessed
                .slice(0, 5)
                .map((item: any, index: number) => (
                  <View key={index} style={styles.performanceItem}>
                    <Text style={styles.performanceKey} numberOfLines={1}>
                      {item.key}
                    </Text>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Access Count</Text>
                      <Text style={styles.performanceValue}>{item.count}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Creation Time</Text>
                      <Text style={styles.performanceValue}>
                        {item.creationTime.toFixed(2)} ms
                      </Text>
                    </View>
                  </View>
                ))}
            </Card>
          </View>
        )}

        {/* Performance Metrics */}
        {stats.cache.performanceMetrics.slowestCreations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Slowest Style Creations</Text>
            <Card>
              {stats.cache.performanceMetrics.slowestCreations.map(
                (item: any, index: number) => (
                  <View key={index} style={styles.performanceItem}>
                    <Text style={styles.performanceKey} numberOfLines={1}>
                      {item.key}
                    </Text>
                    <Text style={styles.performanceValue}>
                      {item.time.toFixed(2)} ms
                    </Text>
                  </View>
                )
              )}
            </Card>
          </View>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Warnings</Text>
            <Card>
              {warnings.map((warning: string, index: number) => (
                <Text key={index} style={styles.warningText}>
                  • {warning}
                </Text>
              ))}
            </Card>
          </View>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            <Card>
              {recommendations.map((recommendation: string, index: number) => (
                <Text key={index} style={styles.recommendationText}>
                  • {recommendation}
                </Text>
              ))}
            </Card>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <Button
            title="Clear Cache"
            variant="outline"
            size="small"
            onPress={handleClearCache}
          />
          <Button
            title="Generate Report"
            variant="outline"
            size="small"
            onPress={handleGenerateReport}
          />
          <Button
            title="Refresh"
            variant="primary"
            size="small"
            onPress={refreshData}
          />
        </View>
      </ScrollView>
    </View>
  );
};

/**
 * Hook for managing the performance monitor
 */
export function useStylePerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);

  const showMonitor = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideMonitor = useCallback(() => {
    setIsVisible(false);
  }, []);

  const toggleMonitor = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  return {
    isVisible,
    showMonitor,
    hideMonitor,
    toggleMonitor,
    StylePerformanceMonitor: (
      props: Omit<StylePerformanceMonitorProps, 'visible' | 'onClose'>
    ) => (
      <StylePerformanceMonitor
        {...props}
        visible={isVisible}
        onClose={hideMonitor}
      />
    ),
  };
}
