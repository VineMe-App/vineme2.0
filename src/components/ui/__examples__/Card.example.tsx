/**
 * Card Component Examples
 * Demonstrates various Card component configurations and use cases
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card } from '../Card';
import { useTheme } from '../../../theme/provider/useTheme';

export const CardExamples: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [pressCount, setPressCount] = useState(0);
  const [isDisabled, setIsDisabled] = useState(false);

  const handlePress = () => {
    setPressCount((prev) => prev + 1);
    Alert.alert('Card Pressed', `Press count: ${pressCount + 1}`);
  };

  const handleLongPress = () => {
    Alert.alert('Card Long Pressed', 'Long press detected!');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Card Component Examples
      </Text>

      {/* Theme Toggle */}
      <Card onPress={toggleTheme} variant="outlined" style={styles.section}>
        <Text
          style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
        >
          Current Theme: {isDark ? 'Dark' : 'Light'}
        </Text>
        <Text
          style={[styles.description, { color: theme.colors.text.secondary }]}
        >
          Tap to toggle theme
        </Text>
      </Card>

      {/* Basic Variants */}
      <View style={styles.section}>
        <Text
          style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
        >
          Card Variants
        </Text>

        <Card variant="default" style={styles.exampleCard}>
          <Text
            style={[styles.cardTitle, { color: theme.colors.text.primary }]}
          >
            Default Card
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            Standard card with subtle shadow
          </Text>
        </Card>

        <Card variant="outlined" style={styles.exampleCard}>
          <Text
            style={[styles.cardTitle, { color: theme.colors.text.primary }]}
          >
            Outlined Card
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            Card with border, no shadow
          </Text>
        </Card>

        <Card variant="elevated" style={styles.exampleCard}>
          <Text
            style={[styles.cardTitle, { color: theme.colors.text.primary }]}
          >
            Elevated Card
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            Card with prominent shadow
          </Text>
        </Card>

        <Card variant="filled" style={styles.exampleCard}>
          <Text
            style={[styles.cardTitle, { color: theme.colors.text.primary }]}
          >
            Filled Card
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            Card with secondary background
          </Text>
        </Card>

        <Card variant="ghost" style={styles.exampleCard}>
          <Text
            style={[styles.cardTitle, { color: theme.colors.text.primary }]}
          >
            Ghost Card
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            Transparent card, no background
          </Text>
        </Card>
      </View>

      {/* Sizes */}
      <View style={styles.section}>
        <Text
          style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
        >
          Card Sizes
        </Text>

        <Card size="sm" variant="outlined" style={styles.exampleCard}>
          <Text
            style={[styles.cardTitle, { color: theme.colors.text.primary }]}
          >
            Small Card
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            Compact padding
          </Text>
        </Card>

        <Card size="md" variant="outlined" style={styles.exampleCard}>
          <Text
            style={[styles.cardTitle, { color: theme.colors.text.primary }]}
          >
            Medium Card (Default)
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            Standard padding
          </Text>
        </Card>

        <Card size="lg" variant="outlined" style={styles.exampleCard}>
          <Text
            style={[styles.cardTitle, { color: theme.colors.text.primary }]}
          >
            Large Card
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            Generous padding
          </Text>
        </Card>
      </View>

      {/* Interactive Cards */}
      <View style={styles.section}>
        <Text
          style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
        >
          Interactive Cards
        </Text>

        <Card
          onPress={handlePress}
          variant="elevated"
          style={styles.exampleCard}
          accessibilityLabel="Pressable card"
          accessibilityHint="Tap to increment counter"
        >
          <Text
            style={[styles.cardTitle, { color: theme.colors.text.primary }]}
          >
            Pressable Card
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            Press count: {pressCount}
          </Text>
        </Card>

        <Card
          onLongPress={handleLongPress}
          variant="outlined"
          style={styles.exampleCard}
          accessibilityLabel="Long pressable card"
          accessibilityHint="Long press to trigger action"
        >
          <Text
            style={[styles.cardTitle, { color: theme.colors.text.primary }]}
          >
            Long Press Card
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            Hold to trigger action
          </Text>
        </Card>

        <Card
          onPress={() => Alert.alert('Interactive card pressed')}
          variant="filled"
          style={styles.exampleCard}
        >
          <Text
            style={[styles.cardTitle, { color: theme.colors.text.primary }]}
          >
            Interactive Card
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            Responds to touch interactions
          </Text>
        </Card>
      </View>

      {/* Disabled State */}
      <View style={styles.section}>
        <Text
          style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
        >
          Disabled State
        </Text>

        <Card
          onPress={() => setIsDisabled(!isDisabled)}
          variant="outlined"
          style={styles.exampleCard}
        >
          <Text
            style={[styles.cardTitle, { color: theme.colors.text.primary }]}
          >
            Toggle Disabled State
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            Currently: {isDisabled ? 'Disabled' : 'Enabled'}
          </Text>
        </Card>

        <Card
          onPress={() => Alert.alert('This should not show')}
          disabled={isDisabled}
          variant="elevated"
          style={styles.exampleCard}
        >
          <Text
            style={[styles.cardTitle, { color: theme.colors.text.primary }]}
          >
            Disabled Card
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            {isDisabled ? 'This card is disabled' : 'This card is enabled'}
          </Text>
        </Card>
      </View>

      {/* Custom Styling */}
      <View style={styles.section}>
        <Text
          style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
        >
          Custom Styling
        </Text>

        <Card
          borderRadius="xl"
          shadow="lg"
          padding={6}
          style={styles.exampleCard}
        >
          <Text
            style={[styles.cardTitle, { color: theme.colors.text.primary }]}
          >
            Custom Border Radius & Shadow
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            Extra large border radius with large shadow
          </Text>
        </Card>

        <Card
          variant="outlined"
          style={[
            styles.exampleCard,
            {
              borderColor: theme.colors.primary[500],
              borderWidth: 2,
            },
          ]}
        >
          <Text
            style={[styles.cardTitle, { color: theme.colors.primary[600] }]}
          >
            Custom Border Color
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            Primary colored border
          </Text>
        </Card>
      </View>

      {/* Nested Cards */}
      <View style={styles.section}>
        <Text
          style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
        >
          Nested Cards
        </Text>

        <Card variant="elevated" style={styles.exampleCard}>
          <Text
            style={[styles.cardTitle, { color: theme.colors.text.primary }]}
          >
            Parent Card
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            Contains nested cards
          </Text>

          <View style={styles.nestedContainer}>
            <Card
              variant="outlined"
              size="sm"
              onPress={() => Alert.alert('Nested card 1')}
              style={styles.nestedCard}
            >
              <Text
                style={[
                  styles.nestedText,
                  { color: theme.colors.text.primary },
                ]}
              >
                Nested 1
              </Text>
            </Card>

            <Card
              variant="filled"
              size="sm"
              onPress={() => Alert.alert('Nested card 2')}
              style={styles.nestedCard}
            >
              <Text
                style={[
                  styles.nestedText,
                  { color: theme.colors.text.primary },
                ]}
              >
                Nested 2
              </Text>
            </Card>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
  },
  exampleCard: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
  },
  nestedContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  nestedCard: {
    flex: 1,
  },
  nestedText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default CardExamples;
