/**
 * Example: Batch Migration Script
 * 
 * This example demonstrates how to use the migration scripts to migrate
 * multiple components at once with different strategies and configurations.
 */

import { createMigrationScript, migrationPresets } from '../migrationScripts';
import { MigrationReport } from '../types';

// ============================================================================
// BASIC BATCH MIGRATION
// ============================================================================

export async function runBasicBatchMigration(): Promise<MigrationReport> {
  console.log('Starting basic batch migration...');

  // Use the all components preset
  const script = migrationPresets.allComponents();
  
  // Run dry run first to see what would be changed
  console.log('Running dry run...');
  const dryRunReport = await script.dryRun();
  
  console.log('Dry run results:');
  console.log(`- Total components: ${dryRunReport.totalComponents}`);
  console.log(`- Would succeed: ${dryRunReport.successfulMigrations}`);
  console.log(`- Would fail: ${dryRunReport.failedMigrations}`);
  console.log(`- Would have warnings: ${dryRunReport.componentsWithWarnings}`);

  // If dry run looks good, run actual migration
  if (dryRunReport.failedMigrations === 0) {
    console.log('Dry run successful, running actual migration...');
    const report = await script.run();
    
    console.log('Migration complete!');
    console.log(report.summary);
    
    return report;
  } else {
    console.log('Dry run had failures, please review before running actual migration');
    return dryRunReport;
  }
}

// ============================================================================
// CUSTOM BATCH MIGRATION
// ============================================================================

export async function runCustomBatchMigration(): Promise<MigrationReport> {
  console.log('Starting custom batch migration...');

  const script = createMigrationScript({
    sourceDir: 'src/components',
    outputDir: 'src/components-migrated', // Output to different directory
    includePatterns: [
      '**/*.tsx',
      '**/*.ts',
    ],
    excludePatterns: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/__tests__/**',
      '**/__examples__/**',
      '**/node_modules/**',
    ],
    migrationOptions: {
      preserveOriginalStyles: true,
      addCompatibilityLayer: true,
      generateTypes: true,
      customMappings: {
        // Custom color mappings for your app
        '#1e40af': 'colors.primary.700',
        '#3b82f6': 'colors.primary.500',
        '#dbeafe': 'colors.primary.100',
        // Custom spacing mappings
        '10': 'spacing.sm',
        '14': 'spacing.md',
        '18': 'spacing.lg',
      },
      excludeComponents: [
        'LegacyComponent', // Skip components that shouldn't be migrated
        'ThirdPartyWrapper',
      ],
    },
    createBackups: true,
    dryRun: false,
  });

  const report = await script.run();
  
  console.log('Custom migration complete!');
  console.log(report.summary);
  
  return report;
}

// ============================================================================
// INCREMENTAL MIGRATION STRATEGY
// ============================================================================

export async function runIncrementalMigration(): Promise<void> {
  console.log('Starting incremental migration strategy...');

  // Step 1: Migrate UI components first (they're usually simpler)
  console.log('Step 1: Migrating UI components...');
  const uiReport = await migrationPresets.uiComponents().run();
  console.log(`UI components: ${uiReport.successfulMigrations}/${uiReport.totalComponents} migrated`);

  // Step 2: Migrate form components
  console.log('Step 2: Migrating form components...');
  const formScript = migrationPresets.componentType('forms');
  const formReport = await formScript.run();
  console.log(`Form components: ${formReport.successfulMigrations}/${formReport.totalComponents} migrated`);

  // Step 3: Migrate navigation components
  console.log('Step 3: Migrating navigation components...');
  const navScript = migrationPresets.componentType('navigation');
  const navReport = await navScript.run();
  console.log(`Navigation components: ${navReport.successfulMigrations}/${navReport.totalComponents} migrated`);

  // Step 4: Migrate remaining components with safe settings
  console.log('Step 4: Migrating remaining components...');
  const safeScript = migrationPresets.safeMigration()
    .exclude('**/ui/**') // Exclude already migrated UI components
    .exclude('**/forms/**') // Exclude already migrated form components
    .exclude('**/navigation/**'); // Exclude already migrated navigation components
  
  const remainingReport = await safeScript.run();
  console.log(`Remaining components: ${remainingReport.successfulMigrations}/${remainingReport.totalComponents} migrated`);

  console.log('Incremental migration complete!');
}

// ============================================================================
// SAFE MIGRATION WITH ROLLBACK PREPARATION
// ============================================================================

export async function runSafeMigrationWithRollback(): Promise<MigrationReport> {
  console.log('Starting safe migration with rollback preparation...');

  // Create a safe migration script with full backups
  const script = createMigrationScript({
    sourceDir: 'src/components',
    migrationOptions: {
      preserveOriginalStyles: true, // Keep original styles as fallbacks
      addCompatibilityLayer: true,  // Add compatibility layer
      generateTypes: true,          // Generate TypeScript types
    },
    createBackups: true,            // Create backup files
    dryRun: false,
  });

  try {
    // Run the migration
    const report = await script.run();
    
    if (report.failedMigrations > 0) {
      console.warn(`Migration completed with ${report.failedMigrations} failures`);
      console.log('Failed components can be rolled back using their backup files');
      
      // Log rollback instructions for failed components
      Object.entries(report.componentResults).forEach(([filePath, result]) => {
        if (!result.success && result.backupPath) {
          console.log(`Rollback ${filePath}: cp ${result.backupPath} ${filePath}`);
        }
      });
    }
    
    return report;
  } catch (error) {
    console.error('Migration failed:', error);
    console.log('All backup files are preserved for rollback');
    throw error;
  }
}

// ============================================================================
// AGGRESSIVE MIGRATION (MINIMAL COMPATIBILITY)
// ============================================================================

export async function runAggressiveMigration(): Promise<MigrationReport> {
  console.log('Starting aggressive migration (minimal compatibility)...');
  console.warn('This migration removes legacy style support - ensure thorough testing!');

  const script = migrationPresets.aggressiveMigration();
  
  // Always do a dry run first for aggressive migrations
  const dryRunReport = await script.dryRun();
  
  if (dryRunReport.failedMigrations > 0) {
    console.error('Dry run failed - aggressive migration not recommended');
    console.log('Consider using safe migration instead');
    return dryRunReport;
  }

  // Confirm before proceeding
  console.log('Dry run successful. Proceeding with aggressive migration...');
  const report = await script.run();
  
  console.log('Aggressive migration complete!');
  console.log('Remember to test all components thoroughly');
  
  return report;
}

// ============================================================================
// MIGRATION WITH CUSTOM VALIDATION
// ============================================================================

export async function runMigrationWithValidation(): Promise<MigrationReport> {
  console.log('Starting migration with custom validation...');

  const script = createMigrationScript()
    .sourceDir('src/components')
    .include('**/*.tsx')
    .exclude('**/*.test.*')
    .configure({
      preserveOriginalStyles: true,
      addCompatibilityLayer: true,
      generateTypes: true,
    });

  const report = await script.run();

  // Custom validation after migration
  console.log('Running custom validation...');
  
  let validationErrors = 0;
  
  Object.entries(report.componentResults).forEach(([filePath, result]) => {
    if (result.success) {
      // Check if migrated code follows our standards
      if (!result.migratedCode.includes('useTheme')) {
        console.warn(`${filePath}: Missing useTheme hook`);
        validationErrors++;
      }
      
      if (result.migratedCode.includes('StyleSheet.create') && 
          !result.migratedCode.includes('theme')) {
        console.warn(`${filePath}: StyleSheet.create without theme usage`);
        validationErrors++;
      }
      
      // Check for TODO comments that need attention
      const todoCount = (result.migratedCode.match(/TODO/g) || []).length;
      if (todoCount > 0) {
        console.warn(`${filePath}: ${todoCount} TODO items need attention`);
      }
    }
  });

  if (validationErrors > 0) {
    console.warn(`Validation found ${validationErrors} issues that need attention`);
  } else {
    console.log('All migrated components passed validation!');
  }

  return report;
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

export async function runMigrationExamples() {
  console.log('='.repeat(60));
  console.log('MIGRATION EXAMPLES');
  console.log('='.repeat(60));

  try {
    // Example 1: Basic batch migration
    console.log('\n1. Basic Batch Migration');
    console.log('-'.repeat(30));
    await runBasicBatchMigration();

    // Example 2: Custom migration
    console.log('\n2. Custom Migration');
    console.log('-'.repeat(30));
    await runCustomBatchMigration();

    // Example 3: Incremental migration
    console.log('\n3. Incremental Migration');
    console.log('-'.repeat(30));
    await runIncrementalMigration();

    // Example 4: Safe migration with rollback
    console.log('\n4. Safe Migration with Rollback');
    console.log('-'.repeat(30));
    await runSafeMigrationWithRollback();

    // Example 5: Migration with validation
    console.log('\n5. Migration with Validation');
    console.log('-'.repeat(30));
    await runMigrationWithValidation();

    console.log('\n' + '='.repeat(60));
    console.log('ALL MIGRATION EXAMPLES COMPLETED');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Migration examples failed:', error);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createMigrationPlan(components: string[]): {
  phase1: string[]; // Simple UI components
  phase2: string[]; // Form and input components  
  phase3: string[]; // Complex components
  phase4: string[]; // Navigation and layout components
} {
  const plan = {
    phase1: [] as string[],
    phase2: [] as string[],
    phase3: [] as string[],
    phase4: [] as string[],
  };

  components.forEach(component => {
    const name = component.toLowerCase();
    
    if (name.includes('button') || name.includes('text') || name.includes('icon')) {
      plan.phase1.push(component);
    } else if (name.includes('input') || name.includes('form') || name.includes('field')) {
      plan.phase2.push(component);
    } else if (name.includes('nav') || name.includes('header') || name.includes('layout')) {
      plan.phase4.push(component);
    } else {
      plan.phase3.push(component);
    }
  });

  return plan;
}

export function generateMigrationReport(report: MigrationReport): string {
  const lines: string[] = [];
  
  lines.push('# Migration Report');
  lines.push('');
  lines.push(`**Date**: ${new Date().toISOString()}`);
  lines.push(`**Total Components**: ${report.totalComponents}`);
  lines.push(`**Successful**: ${report.successfulMigrations}`);
  lines.push(`**Failed**: ${report.failedMigrations}`);
  lines.push(`**With Warnings**: ${report.componentsWithWarnings}`);
  lines.push(`**Success Rate**: ${Math.round((report.successfulMigrations / report.totalComponents) * 100)}%`);
  lines.push('');
  
  if (report.failedMigrations > 0) {
    lines.push('## Failed Migrations');
    Object.entries(report.componentResults).forEach(([path, result]) => {
      if (!result.success) {
        lines.push(`- **${path}**`);
        result.errors.forEach(error => lines.push(`  - ${error}`));
      }
    });
    lines.push('');
  }
  
  if (report.componentsWithWarnings > 0) {
    lines.push('## Warnings');
    Object.entries(report.componentResults).forEach(([path, result]) => {
      if (result.warnings.length > 0) {
        lines.push(`- **${path}**`);
        result.warnings.forEach(warning => lines.push(`  - ${warning}`));
      }
    });
  }
  
  return lines.join('\n');
}