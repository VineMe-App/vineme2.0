import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { NotificationIconWithBadge } from '../NotificationIconWithBadge';
import { Text } from '../Text';
import { Button } from '../Button';
import { useTheme } from '@/theme/provider/useTheme';

export const NotificationIconWithBadgeExample: React.FC = () => {
  const { theme } = useTheme();
  const [count, setCount] = useState(3);

  const handlePress = () => {
    console.log('Notification icon pressed!');
  };

  const incrementCount = () => setCount((prev) => prev + 1);
  const decrementCount = () => setCount((prev) => Math.max(0, prev - 1));
  const setHighCount = () => setCount(150);
  const resetCount = () => setCount(0);

  return (
    <ScrollView style={styles.container}>
      <View
        style={[
          styles.section,
          { backgroundColor: theme.colors.surface.primary },
        ]}
      >
        <Text variant="h3" style={styles.title}>
          Notification Icon with Badge Examples
        </Text>

        {/* Basic Example */}
        <View style={styles.example}>
          <Text variant="h4" style={styles.exampleTitle}>
            Basic Usage (Count: {count})
          </Text>
          <View style={styles.iconContainer}>
            <NotificationIconWithBadge
              onPress={handlePress}
              unreadCount={count}
            />
          </View>
          <View style={styles.controls}>
            <Button title="+" onPress={incrementCount} size="small" />
            <Button title="-" onPress={decrementCount} size="small" />
            <Button title="99+" onPress={setHighCount} size="small" />
            <Button title="Reset" onPress={resetCount} size="small" />
          </View>
        </View>

        {/* Different Sizes */}
        <View style={styles.example}>
          <Text variant="h4" style={styles.exampleTitle}>
            Different Sizes
          </Text>
          <View style={styles.sizeRow}>
            <View style={styles.sizeExample}>
              <Text variant="body">Small (20px)</Text>
              <NotificationIconWithBadge
                onPress={handlePress}
                unreadCount={5}
                size={20}
              />
            </View>
            <View style={styles.sizeExample}>
              <Text variant="body">Medium (24px)</Text>
              <NotificationIconWithBadge
                onPress={handlePress}
                unreadCount={5}
                size={24}
              />
            </View>
            <View style={styles.sizeExample}>
              <Text variant="body">Large (32px)</Text>
              <NotificationIconWithBadge
                onPress={handlePress}
                unreadCount={5}
                size={32}
              />
            </View>
          </View>
        </View>

        {/* Different Badge Colors */}
        <View style={styles.example}>
          <Text variant="h4" style={styles.exampleTitle}>
            Different Badge Colors
          </Text>
          <View style={styles.sizeRow}>
            <View style={styles.sizeExample}>
              <Text variant="body">Red (Error)</Text>
              <NotificationIconWithBadge
                onPress={handlePress}
                unreadCount={3}
                badgeColor={theme.colors.error[500]}
              />
            </View>
            <View style={styles.sizeExample}>
              <Text variant="body">Blue (Info)</Text>
              <NotificationIconWithBadge
                onPress={handlePress}
                unreadCount={3}
                badgeColor={theme.colors.info[500]}
              />
            </View>
            <View style={styles.sizeExample}>
              <Text variant="body">Green (Success)</Text>
              <NotificationIconWithBadge
                onPress={handlePress}
                unreadCount={3}
                badgeColor={theme.colors.success[500]}
              />
            </View>
          </View>
        </View>

        {/* States */}
        <View style={styles.example}>
          <Text variant="h4" style={styles.exampleTitle}>
            Different States
          </Text>
          <View style={styles.sizeRow}>
            <View style={styles.sizeExample}>
              <Text variant="body">No Badge</Text>
              <NotificationIconWithBadge
                onPress={handlePress}
                unreadCount={0}
              />
            </View>
            <View style={styles.sizeExample}>
              <Text variant="body">Disabled</Text>
              <NotificationIconWithBadge
                onPress={handlePress}
                unreadCount={5}
                disabled={true}
              />
            </View>
            <View style={styles.sizeExample}>
              <Text variant="body">High Count</Text>
              <NotificationIconWithBadge
                onPress={handlePress}
                unreadCount={150}
              />
            </View>
          </View>
        </View>

        {/* Header Layout Example */}
        <View style={styles.example}>
          <Text variant="h4" style={styles.exampleTitle}>
            Header Layout Example
          </Text>
          <View style={styles.headerExample}>
            <Text variant="h4" weight="semiBold">
              VineMe
            </Text>
            <NotificationIconWithBadge
              onPress={handlePress}
              unreadCount={count}
              size={24}
              color={theme.colors.text.primary}
              badgeColor={theme.colors.error[500]}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  example: {
    marginBottom: 32,
  },
  exampleTitle: {
    marginBottom: 16,
  },
  iconContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  sizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  sizeExample: {
    alignItems: 'center',
    gap: 8,
  },
  headerExample: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
});
