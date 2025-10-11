/**
 * Button Component Examples
 * Demonstrates the enhanced Button component with all its features
 */

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { Button } from '../Button';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';

// Example icons (you can replace these with actual icon components)
const PlusIcon = () => (
  <Text style={{ fontSize: 16, color: 'inherit' }}>+</Text>
);
const ArrowIcon = () => (
  <Text style={{ fontSize: 16, color: 'inherit' }}>→</Text>
);
const HeartIcon = () => (
  <Text style={{ fontSize: 16, color: 'inherit' }}>♥</Text>
);

export const ButtonExample: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handlePress = () => {
    console.log('Button pressed!');
  };

  const handleLoadingPress = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <ThemeProvider initialTheme="light">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.sectionTitle}>Button Variants</Text>
        <View style={styles.section}>
          <Button title="Primary" variant="primary" onPress={handlePress} />
          <Button title="Secondary" variant="secondary" onPress={handlePress} />
          <Button title="Success" variant="success" onPress={handlePress} />
          <Button title="Warning" variant="warning" onPress={handlePress} />
          <Button title="Error" variant="error" onPress={handlePress} />
          <Button title="Info" variant="info" onPress={handlePress} />
          <Button title="Ghost" variant="ghost" onPress={handlePress} />
          <Button title="Outline" variant="outline" onPress={handlePress} />
        </View>

        <Text style={styles.sectionTitle}>Button Sizes</Text>
        <View style={styles.section}>
          <Button title="Small" size="small" onPress={handlePress} />
          <Button title="Medium" size="medium" onPress={handlePress} />
          <Button title="Large" size="large" onPress={handlePress} />
        </View>

        <Text style={styles.sectionTitle}>Button States</Text>
        <View style={styles.section}>
          <Button title="Normal" onPress={handlePress} />
          <Button title="Disabled" disabled onPress={handlePress} />
          <Button
            title="Loading"
            loading={loading}
            onPress={handleLoadingPress}
          />
        </View>

        <Text style={styles.sectionTitle}>Buttons with Icons</Text>
        <View style={styles.section}>
          <Button title="Add Item" icon={<PlusIcon />} onPress={handlePress} />
          <Button
            title="Continue"
            iconRight={<ArrowIcon />}
            onPress={handlePress}
          />
          <Button
            title="Favorite"
            icon={<HeartIcon />}
            iconRight={<ArrowIcon />}
            variant="outline"
            onPress={handlePress}
          />
        </View>

        <Text style={styles.sectionTitle}>Loading Variants</Text>
        <View style={styles.section}>
          <Button
            title="Circular"
            loading
            loadingVariant="circular"
            onPress={handlePress}
          />
          <Button
            title="Dots"
            loading
            loadingVariant="dots"
            variant="secondary"
            onPress={handlePress}
          />
          <Button
            title="Pulse"
            loading
            loadingVariant="pulse"
            variant="success"
            onPress={handlePress}
          />
          <Button
            title="Bars"
            loading
            loadingVariant="bars"
            variant="outline"
            onPress={handlePress}
          />
        </View>

        <Text style={styles.sectionTitle}>Full Width Buttons</Text>
        <View style={styles.section}>
          <Button title="Full Width Primary" fullWidth onPress={handlePress} />
          <Button
            title="Full Width with Icon"
            fullWidth
            icon={<PlusIcon />}
            variant="secondary"
            onPress={handlePress}
          />
        </View>

        <Text style={styles.sectionTitle}>Custom Styled Buttons</Text>
        <View style={styles.section}>
          <Button
            title="Custom Background"
            style={{ backgroundColor: '#FF6B6B' }}
            textStyle={{ color: 'white', fontWeight: 'bold' }}
            onPress={handlePress}
          />
          <Button
            title="Custom Border"
            variant="outline"
            style={{
              borderColor: '#4ECDC4',
              borderWidth: 2,
              borderRadius: 20,
            }}
            textStyle={{ color: '#4ECDC4' }}
            onPress={handlePress}
          />
        </View>

        <Text style={styles.sectionTitle}>Accessibility Features</Text>
        <View style={styles.section}>
          <Button
            title="Accessible Button"
            accessibilityLabel="This button has custom accessibility features"
            accessibilityHint="Tap to perform an action with accessibility support"
            onPress={handlePress}
          />
          <Button
            title="Screen Reader Friendly"
            icon={<HeartIcon />}
            accessibilityLabel="Add to favorites button"
            accessibilityHint="Double tap to add this item to your favorites"
            variant="outline"
            onPress={handlePress}
          />
        </View>
      </ScrollView>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  section: {
    gap: 10,
    marginBottom: 10,
  },
});

export default ButtonExample;
