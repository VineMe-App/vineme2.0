import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { 
  Text, 
  Heading1, 
  Heading2, 
  Heading3, 
  Heading4, 
  Heading5, 
  Heading6,
  BodyText, 
  BodyLarge, 
  BodySmall, 
  Caption, 
  Label,
  LabelLarge,
  LabelSmall
} from '../Text';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';

/**
 * Text Component Examples
 * 
 * Demonstrates all typography variants, color options, and accessibility features
 */
export const TextExample: React.FC = () => {
  return (
    <ThemeProvider initialTheme="light">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Typography Hierarchy */}
        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Typography Hierarchy</Text>
          
          <Heading1>Display Heading 1</Heading1>
          <Heading2>Display Heading 2</Heading2>
          <Heading3>Display Heading 3</Heading3>
          <Heading4>Display Heading 4</Heading4>
          <Heading5>Display Heading 5</Heading5>
          <Heading6>Display Heading 6</Heading6>
          
          <Text variant="display1" style={styles.spacer}>Display 1 - Largest</Text>
          <Text variant="display2" style={styles.spacer}>Display 2 - Large</Text>
          <Text variant="display3" style={styles.spacer}>Display 3 - Medium</Text>
        </View>

        {/* Body Text Variants */}
        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Body Text Variants</Text>
          
          <BodyLarge style={styles.spacer}>
            Large body text - Perfect for introductory paragraphs and important content that needs emphasis.
          </BodyLarge>
          
          <BodyText style={styles.spacer}>
            Regular body text - The standard text size for most content. This provides optimal readability 
            for extended reading and is the most commonly used text variant.
          </BodyText>
          
          <BodySmall style={styles.spacer}>
            Small body text - Useful for secondary information, fine print, or when space is limited 
            but readability is still important.
          </BodySmall>
        </View>

        {/* Labels and Captions */}
        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Labels and Captions</Text>
          
          <LabelLarge style={styles.spacer}>Large Label Text</LabelLarge>
          <Label style={styles.spacer}>Standard Label Text</Label>
          <LabelSmall style={styles.spacer}>Small Label Text</LabelSmall>
          
          <Caption style={styles.spacer}>Caption text for images, tables, or additional context</Caption>
          <Text variant="captionBold" style={styles.spacer}>Bold caption for emphasis</Text>
        </View>

        {/* Color Variants */}
        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Color Variants</Text>
          
          <Text color="primary" style={styles.spacer}>Primary text color</Text>
          <Text color="secondary" style={styles.spacer}>Secondary text color</Text>
          <Text color="tertiary" style={styles.spacer}>Tertiary text color</Text>
          <Text color="disabled" style={styles.spacer}>Disabled text color</Text>
          
          <Text color="success" style={styles.spacer}>Success message text</Text>
          <Text color="warning" style={styles.spacer}>Warning message text</Text>
          <Text color="error" style={styles.spacer}>Error message text</Text>
          <Text color="info" style={styles.spacer}>Information text</Text>
        </View>

        {/* Font Weight Variations */}
        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Font Weight Variations</Text>
          
          <Text weight="thin" style={styles.spacer}>Thin weight (100)</Text>
          <Text weight="light" style={styles.spacer}>Light weight (300)</Text>
          <Text weight="normal" style={styles.spacer}>Normal weight (400)</Text>
          <Text weight="medium" style={styles.spacer}>Medium weight (500)</Text>
          <Text weight="semiBold" style={styles.spacer}>Semi-bold weight (600)</Text>
          <Text weight="bold" style={styles.spacer}>Bold weight (700)</Text>
          <Text weight="extraBold" style={styles.spacer}>Extra-bold weight (800)</Text>
        </View>

        {/* Text Alignment */}
        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Text Alignment</Text>
          
          <Text align="left" style={styles.spacer}>Left aligned text (default)</Text>
          <Text align="center" style={styles.spacer}>Center aligned text</Text>
          <Text align="right" style={styles.spacer}>Right aligned text</Text>
          <Text align="justify" style={styles.spacer}>
            Justified text alignment distributes text evenly across the full width of the container, 
            creating clean edges on both sides.
          </Text>
        </View>

        {/* Combined Styling */}
        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Combined Styling Examples</Text>
          
          <Text 
            variant="h2" 
            color="primary" 
            align="center" 
            style={styles.spacer}
          >
            Centered Primary Heading
          </Text>
          
          <Text 
            variant="body" 
            color="error" 
            weight="semiBold" 
            style={styles.spacer}
          >
            Semi-bold error message text
          </Text>
          
          <Text 
            variant="caption" 
            color="secondary" 
            align="right" 
            style={styles.spacer}
          >
            Right-aligned secondary caption
          </Text>
        </View>

        {/* Accessibility Features */}
        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Accessibility Features</Text>
          
          <Text style={styles.spacer}>
            All text components support font scaling for accessibility. Users can adjust their 
            system font size and the text will scale appropriately.
          </Text>
          
          <Text selectable style={styles.spacer}>
            This text is selectable - users can copy it to their clipboard.
          </Text>
          
          <Text variant="h4" style={styles.spacer}>
            Headings have proper accessibility roles for screen readers
          </Text>
          
          <Text style={styles.spacer}>
            Regular text has appropriate accessibility labels and roles for assistive technologies.
          </Text>
        </View>

        {/* Custom Styling */}
        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Custom Styling</Text>
          
          <Text 
            variant="body" 
            style={[styles.spacer, styles.customText]}
          >
            Text with custom styling applied via the style prop
          </Text>
          
          <Text 
            variant="h2" 
            style={[styles.spacer, styles.gradientText]}
          >
            Custom styled heading
          </Text>
        </View>

        {/* Button Text Variants */}
        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Button Text Variants</Text>
          
          <Text variant="buttonLarge" style={styles.spacer}>Large Button Text</Text>
          <Text variant="button" style={styles.spacer}>Standard Button Text</Text>
          <Text variant="buttonSmall" style={styles.spacer}>Small Button Text</Text>
        </View>

      </ScrollView>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  spacer: {
    marginBottom: 12,
  },
  customText: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  gradientText: {
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default TextExample;