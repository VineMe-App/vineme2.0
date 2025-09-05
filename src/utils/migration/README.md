# Migration Utilities

This package provides comprehensive utilities for migrating existing React Native components to use the new theme system. It includes automated migration tools, compatibility layers, and helper functions to ensure a smooth transition.

## Overview

The migration system consists of several key components:

- **ComponentMigrator**: Automatically converts component files to use theme-aware styles
- **StyleMigrator**: Converts legacy StyleSheet objects to theme-aware style functions
- **ThemeCompatibilityLayer**: Provides backward compatibility during migration
- **Migration Scripts**: Automated batch migration tools
- **Migration Helpers**: Utility functions for documentation, validation, and testing

## Quick Start

### Basic Component Migration

```typescript
import { ComponentMigrator } from './migration';

const migrator = new ComponentMigrator();

const result = await migrator.migrateComponent('src/components/MyComponent.tsx', {
  preserveOriginalStyles: true,
  addCompatibilityLayer: true,
  generateTypes: true,
});

if (result.success) {
  console.log('Migration successful!');
  console.log('Warnings:', result.warnings);
} else {
  console.error('Migration failed:', result.errors);
}
```

### Batch Migration

```typescript
import { createMigrationScript, migrationPresets } from './migration';

// Use preset for all components
const script = migrationPresets.allComponents();
const report = await script.run();

// Or create custom migration
const customScript = createMigrationScript({
  sourceDir: 'src/components',
  includePatterns: ['**/*.tsx'],
  excludePatterns: ['**/*.test.*'],
  migrationOptions: {
    preserveOriginalStyles: true,
    addCompatibilityLayer: true,
    generateTypes: true,
  },
});

const customReport = await customScript.run();
```

### Using Compatibility Layer

```typescript
import { ThemeCompatibilityLayer, useLegacyStyles } from './migration';

// In your component
function MyComponent() {
  const legacyStyles = {
    container: { backgroundColor: '#fff', padding: 16 },
  };

  const themeAwareStyles = (theme) => ({
    container: { 
      backgroundColor: theme.colors.background.primary,
      padding: theme.spacing.lg,
    },
  });

  const styles = useLegacyStyles(legacyStyles, themeAwareStyles);

  return <View style={styles.container} />;
}
```

## Migration Process

### 1. Preparation

Before starting migration, ensure:

- Your theme system is properly set up
- All theme tokens are defined
- You have backups of your components

### 2. Analysis

The migration system will:

- Analyze your existing styles
- Map legacy values to theme tokens
- Identify potential issues
- Generate confidence scores for mappings

### 3. Migration

The automated migration will:

- Add theme imports and hooks
- Convert StyleSheet.create to theme-aware functions
- Apply style mappings
- Add compatibility layers if requested
- Generate TypeScript types

### 4. Validation

After migration:

- Review generated warnings
- Test components with different themes
- Validate accessibility compliance
- Run automated tests

## Configuration Options

### MigrationConfig

```typescript
interface MigrationConfig {
  /** Whether to preserve original styles as fallbacks */
  preserveOriginalStyles: boolean;
  
  /** Whether to add theme compatibility layer */
  addCompatibilityLayer: boolean;
  
  /** Whether to generate TypeScript types */
  generateTypes: boolean;
  
  /** Custom style mappings */
  customMappings?: Record<string, string>;
  
  /** Components to exclude from migration */
  excludeComponents?: string[];
}
```

### StyleMigrationOptions

```typescript
interface StyleMigrationOptions {
  /** Target theme to migrate to */
  targetTheme?: Theme;
  
  /** Whether to use semantic color names */
  useSemanticColors: boolean;
  
  /** Whether to convert hardcoded values to theme tokens */
  convertToTokens: boolean;
  
  /** Whether to preserve original values as comments */
  preserveComments: boolean;
}
```

## Style Mappings

The migration system includes built-in mappings for common patterns:

### Color Mappings

```typescript
'#fff' → 'theme.colors.background.primary'
'#000' → 'theme.colors.text.primary'
'#333' → 'theme.colors.text.primary'
'#666' → 'theme.colors.text.secondary'
'#888' → 'theme.colors.text.tertiary'
```

### Spacing Mappings

```typescript
4  → 'theme.spacing.xs'
8  → 'theme.spacing.sm'
12 → 'theme.spacing.md'
16 → 'theme.spacing.lg'
24 → 'theme.spacing.xl'
32 → 'theme.spacing.xxl'
```

### Typography Mappings

```typescript
12 → 'theme.typography.fontSize.xs'
14 → 'theme.typography.fontSize.sm'
16 → 'theme.typography.fontSize.md'
18 → 'theme.typography.fontSize.lg'
20 → 'theme.typography.fontSize.xl'
24 → 'theme.typography.fontSize.xxl'
```

## Compatibility Layer

The compatibility layer allows gradual migration by supporting both legacy and theme-aware styles:

### Configuration

```typescript
import { ThemeCompatibilityLayer } from './migration';

ThemeCompatibilityLayer.configure({
  enableLegacyStyles: true,
  showDeprecationWarnings: __DEV__,
  onDeprecationWarning: (message) => console.warn(message),
});
```

### HOC Usage

```typescript
import { withThemeCompatibility } from './migration';

const MyComponent = ({ theme }) => {
  // Component implementation
};

export default withThemeCompatibility(MyComponent);
```

### Hook Usage

```typescript
import { useLegacyStyles } from './migration';

function MyComponent() {
  const styles = useLegacyStyles(legacyStyles, themeAwareStyles);
  return <View style={styles.container} />;
}
```

## Migration Scripts

### Presets

```typescript
import { migrationPresets } from './migration';

// Migrate all components
await migrationPresets.allComponents().run();

// Migrate only UI components
await migrationPresets.uiComponents().run();

// Safe migration with full compatibility
await migrationPresets.safeMigration().run();

// Aggressive migration with minimal compatibility
await migrationPresets.aggressiveMigration().run();
```

### Custom Scripts

```typescript
import { createMigrationScript } from './migration';

const script = createMigrationScript()
  .sourceDir('src/components')
  .include('**/*.tsx')
  .exclude('**/*.test.*')
  .configure({
    preserveOriginalStyles: true,
    addCompatibilityLayer: true,
  });

// Dry run first
const dryRunReport = await script.dryRun();
console.log('Dry run results:', dryRunReport.summary);

// Run actual migration
const report = await script.run();
console.log('Migration complete:', report.summary);
```

## Best Practices

### 1. Start with Dry Run

Always run a dry run first to see what changes will be made:

```typescript
const report = await migrationScript.dryRun();
console.log(report.summary);
```

### 2. Migrate Incrementally

Start with simple components and gradually move to more complex ones:

```typescript
// Start with UI components
await migrationPresets.uiComponents().run();

// Then migrate specific component types
await migrationPresets.componentType('forms').run();
await migrationPresets.componentType('navigation').run();
```

### 3. Use Compatibility Layer

Enable compatibility layer during transition:

```typescript
const config = {
  addCompatibilityLayer: true,
  preserveOriginalStyles: true,
};
```

### 4. Review Low-Confidence Mappings

Always review mappings with confidence < 0.8:

```typescript
const lowConfidenceMappings = report.styleMappingsApplied
  .filter(mapping => mapping.confidence < 0.8);

lowConfidenceMappings.forEach(mapping => {
  console.log(`Review: ${mapping.legacyProperty} → ${mapping.themeTokenPath}`);
});
```

### 5. Test Thoroughly

After migration:

- Test with different themes
- Verify accessibility compliance
- Run visual regression tests
- Test on different devices/screen sizes

## Troubleshooting

### Common Issues

1. **Missing Theme Imports**
   - Ensure theme provider is properly set up
   - Check import paths are correct

2. **Style Mapping Failures**
   - Review custom mappings configuration
   - Check theme token definitions

3. **TypeScript Errors**
   - Ensure theme types are properly exported
   - Update component prop types

4. **Runtime Errors**
   - Check compatibility layer configuration
   - Verify theme context is available

### Getting Help

1. Check migration report for detailed errors
2. Review generated documentation
3. Use validation helpers to identify issues
4. Check rollback instructions if needed

## API Reference

### ComponentMigrator

- `migrateComponent(filePath, config)` - Migrate single component
- `processComponentCode(code, config)` - Process component code string

### StyleMigrator

- `migrateStyles(legacyStyles, options)` - Convert legacy styles
- `generateMigrationCode(styleName, style, mappings)` - Generate code

### ThemeCompatibilityLayer

- `configure(options)` - Configure compatibility layer
- `mergeStyles(legacy, themeAware, theme)` - Merge style objects
- `convertLegacyStyleSheet(styles, theme)` - Convert StyleSheet

### Migration Helpers

- `generateMigrationDocs(component, mappings, config)` - Generate docs
- `generateExampleUsage(component, theme)` - Generate examples
- `validateMigration(original, migrated, mappings)` - Validate results

### Migration Scripts

- `createMigrationScript(config)` - Create custom script
- `migrationPresets` - Pre-configured scripts
- `runBatchMigration(config)` - Run batch migration

## Examples

See the `__examples__` directory for complete examples of:

- Basic component migration
- Complex component migration
- Gradual migration strategies
- Custom migration scripts
- Compatibility layer usage