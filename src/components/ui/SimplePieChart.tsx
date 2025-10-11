import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';

export interface PieChartSegment {
  label: string;
  value: number;
  color: string;
}

interface SimplePieChartProps {
  segments: PieChartSegment[];
  size?: number;
  title?: string;
}

/**
 * Simple pie chart using horizontal bars with percentage indicators
 * This avoids needing react-native-svg dependency
 */
export const SimplePieChart: React.FC<SimplePieChartProps> = ({
  segments,
  size = 160,
  title,
}) => {
  // Calculate total value
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (total === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyCircle, { width: size, height: size }]}>
            <Text style={styles.emptyText}>No Data</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      {/* Total number */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalNumber}>{total}</Text>
        <Text style={styles.totalLabel}>Total</Text>
      </View>

      {/* Segments as horizontal bars */}
      <View style={styles.barsContainer}>
        {segments.map((segment, index) => {
          const percentage = (segment.value / total) * 100;
          return (
            <View key={index} style={styles.segmentContainer}>
              <View style={styles.segmentHeader}>
                <View style={styles.labelRow}>
                  <View
                    style={[
                      styles.colorIndicator,
                      { backgroundColor: segment.color },
                    ]}
                  />
                  <Text style={styles.segmentLabel}>{segment.label}</Text>
                </View>
                <Text style={styles.segmentValue}>
                  {segment.value} ({Math.round(percentage)}%)
                </Text>
              </View>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${percentage}%`,
                      backgroundColor: segment.color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  totalContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 12,
  },
  totalNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1f2937',
  },
  totalLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 4,
  },
  barsContainer: {
    gap: 12,
  },
  segmentContainer: {
    gap: 6,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorIndicator: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  segmentLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  segmentValue: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  barContainer: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyCircle: {
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
});

