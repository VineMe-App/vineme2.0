import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { ComponentMigrator } from './ComponentMigrator';
import { migrationHelpers } from './migrationHelpers';
import { 
  MigrationScriptConfig, 
  MigrationReport, 
  ComponentMigrationResult,
  MigrationConfig 
} from './types';

/**
 * Automated migration scripts for converting components to use the new styling system
 */
export class MigrationScripts {
  private migrator: ComponentMigrator;

  constructor() {
    this.migrator = new ComponentMigrator();
  }

  /**
   * Run migration on multiple components
   */
  async runBatchMigration(config: MigrationScriptConfig): Promise<MigrationReport> {
    const report: MigrationReport = {
      totalComponents: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      componentsWithWarnings: 0,
      styleMappingsApplied: [],
      summary: '',
      componentResults: {},
    };

    try {
      // Find all component files
      const componentFiles = await this.findComponentFiles(config);
      report.totalComponents = componentFiles.length;

      console.log(`Found ${componentFiles.length} component files to migrate`);

      // Process each component
      for (const filePath of componentFiles) {
        console.log(`Migrating: ${filePath}`);
        
        try {
          const result = await this.migrator.migrateComponent(filePath, config.migrationOptions);
          report.componentResults[filePath] = result;

          if (result.success) {
            report.successfulMigrations++;
            
            if (!config.dryRun) {
              await this.writeFile(filePath, result.migratedCode);
              await this.generateMigrationArtifacts(filePath, result, config);
            }
          } else {
            report.failedMigrations++;
            console.error(`Failed to migrate ${filePath}:`, result.errors);
          }

          if (result.warnings.length > 0) {
            report.componentsWithWarnings++;
            console.warn(`Warnings for ${filePath}:`, result.warnings);
          }

        } catch (error) {
          report.failedMigrations++;
          console.error(`Error migrating ${filePath}:`, error);
          
          report.componentResults[filePath] = {
            originalCode: '',
            migratedCode: '',
            warnings: [],
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            success: false,
          };
        }
      }

      // Generate summary
      report.summary = this.generateSummary(report);
      
      // Write migration report
      if (!config.dryRun) {
        await this.writeMigrationReport(report, config);
      }

      return report;

    } catch (error) {
      throw new Error(`Batch migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find all component files matching the patterns
   */
  private async findComponentFiles(config: MigrationScriptConfig): Promise<string[]> {
    const allFiles: string[] = [];

    for (const pattern of config.includePatterns) {
      const files = await glob(pattern, {
        cwd: config.sourceDir,
        ignore: config.excludePatterns,
      });
      
      allFiles.push(...files.map(file => path.join(config.sourceDir, file)));
    }

    // Remove duplicates and filter out excluded components
    const uniqueFiles = Array.from(new Set(allFiles));
    
    return uniqueFiles.filter(file => {
      const componentName = path.basename(file, path.extname(file));
      return !config.migrationOptions.excludeComponents?.includes(componentName);
    });
  }

  /**
   * Generate migration artifacts (docs, tests, examples)
   */
  private async generateMigrationArtifacts(
    filePath: string,
    result: ComponentMigrationResult,
    config: MigrationScriptConfig
  ): Promise<void> {
    const componentName = path.basename(filePath, path.extname(filePath));
    const componentDir = path.dirname(filePath);

    // Generate migration documentation
    const migrationDocs = migrationHelpers.generateMigrationDocs(
      componentName,
      [], // TODO: Extract mappings from result
      config.migrationOptions
    );
    
    const docsPath = path.join(componentDir, `${componentName}.migration.md`);
    await this.writeFile(docsPath, migrationDocs);

    // Generate example usage
    const exampleUsage = migrationHelpers.generateExampleUsage(componentName, {} as any); // TODO: Pass actual theme
    const examplePath = path.join(componentDir, '__examples__', `${componentName}.example.tsx`);
    await this.ensureDirectoryExists(path.dirname(examplePath));
    await this.writeFile(examplePath, exampleUsage);

    // Generate migration tests
    const migrationTests = migrationHelpers.generateMigrationTests(componentName, []);
    const testPath = path.join(componentDir, '__tests__', `${componentName}.migration.test.tsx`);
    await this.ensureDirectoryExists(path.dirname(testPath));
    await this.writeFile(testPath, migrationTests);

    // Generate rollback instructions
    if (result.backupPath) {
      const rollbackInstructions = migrationHelpers.generateRollbackInstructions(
        componentName,
        result.backupPath
      );
      const rollbackPath = path.join(componentDir, `${componentName}.rollback.md`);
      await this.writeFile(rollbackPath, rollbackInstructions);
    }
  }

  /**
   * Generate migration summary
   */
  private generateSummary(report: MigrationReport): string {
    const lines: string[] = [];
    
    lines.push('# Migration Summary');
    lines.push('');
    lines.push(`- **Total Components**: ${report.totalComponents}`);
    lines.push(`- **Successful Migrations**: ${report.successfulMigrations}`);
    lines.push(`- **Failed Migrations**: ${report.failedMigrations}`);
    lines.push(`- **Components with Warnings**: ${report.componentsWithWarnings}`);
    lines.push('');
    
    const successRate = report.totalComponents > 0 
      ? Math.round((report.successfulMigrations / report.totalComponents) * 100)
      : 0;
    
    lines.push(`**Success Rate**: ${successRate}%`);
    lines.push('');
    
    if (report.failedMigrations > 0) {
      lines.push('## Failed Migrations');
      lines.push('');
      
      Object.entries(report.componentResults).forEach(([filePath, result]) => {
        if (!result.success) {
          lines.push(`- **${filePath}**:`);
          result.errors.forEach(error => {
            lines.push(`  - ${error}`);
          });
        }
      });
      
      lines.push('');
    }
    
    if (report.componentsWithWarnings > 0) {
      lines.push('## Components with Warnings');
      lines.push('');
      
      Object.entries(report.componentResults).forEach(([filePath, result]) => {
        if (result.warnings.length > 0) {
          lines.push(`- **${filePath}**:`);
          result.warnings.forEach(warning => {
            lines.push(`  - ${warning}`);
          });
        }
      });
      
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Write migration report to file
   */
  private async writeMigrationReport(
    report: MigrationReport,
    config: MigrationScriptConfig
  ): Promise<void> {
    const reportPath = path.join(config.outputDir || config.sourceDir, 'migration-report.md');
    await this.writeFile(reportPath, report.summary);
    
    // Also write detailed JSON report
    const jsonReportPath = path.join(config.outputDir || config.sourceDir, 'migration-report.json');
    await this.writeFile(jsonReportPath, JSON.stringify(report, null, 2));
  }

  /**
   * Utility methods
   */
  private async writeFile(filePath: string, content: string): Promise<void> {
    await this.ensureDirectoryExists(path.dirname(filePath));
    
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, content, 'utf8', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.mkdir(dirPath, { recursive: true }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

/**
 * Create and configure a migration script
 */
export function createMigrationScript(config: Partial<MigrationScriptConfig> = {}): MigrationScripts {
  const defaultConfig: MigrationScriptConfig = {
    sourceDir: 'src/components',
    includePatterns: ['**/*.tsx', '**/*.ts'],
    excludePatterns: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**'],
    migrationOptions: {
      preserveOriginalStyles: true,
      addCompatibilityLayer: true,
      generateTypes: true,
    },
    createBackups: true,
    dryRun: false,
  };

  // Merge with provided config
  const finalConfig = { ...defaultConfig, ...config };
  
  const migrationScript = new MigrationScripts();
  
  // Add convenience methods
  return Object.assign(migrationScript, {
    /**
     * Run migration with default settings
     */
    async run(): Promise<MigrationReport> {
      return migrationScript.runBatchMigration(finalConfig);
    },

    /**
     * Run dry run migration
     */
    async dryRun(): Promise<MigrationReport> {
      return migrationScript.runBatchMigration({ ...finalConfig, dryRun: true });
    },

    /**
     * Configure migration options
     */
    configure(options: Partial<MigrationConfig>): typeof migrationScript {
      finalConfig.migrationOptions = { ...finalConfig.migrationOptions, ...options };
      return this;
    },

    /**
     * Set source directory
     */
    sourceDir(dir: string): typeof migrationScript {
      finalConfig.sourceDir = dir;
      return this;
    },

    /**
     * Set output directory
     */
    outputDir(dir: string): typeof migrationScript {
      finalConfig.outputDir = dir;
      return this;
    },

    /**
     * Add include patterns
     */
    include(...patterns: string[]): typeof migrationScript {
      finalConfig.includePatterns.push(...patterns);
      return this;
    },

    /**
     * Add exclude patterns
     */
    exclude(...patterns: string[]): typeof migrationScript {
      finalConfig.excludePatterns.push(...patterns);
      return this;
    },
  });
}

/**
 * Pre-configured migration scripts for common scenarios
 */
export const migrationPresets = {
  /**
   * Migrate all components in src/components
   */
  allComponents: () => createMigrationScript({
    sourceDir: 'src/components',
    includePatterns: ['**/*.tsx'],
    excludePatterns: ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/__examples__/**'],
  }),

  /**
   * Migrate only UI components
   */
  uiComponents: () => createMigrationScript({
    sourceDir: 'src/components/ui',
    includePatterns: ['*.tsx'],
    excludePatterns: ['**/*.test.*', '**/*.spec.*'],
  }),

  /**
   * Migrate specific component types
   */
  componentType: (type: string) => createMigrationScript({
    sourceDir: `src/components/${type}`,
    includePatterns: ['*.tsx'],
    excludePatterns: ['**/*.test.*', '**/*.spec.*'],
  }),

  /**
   * Safe migration with full backups and compatibility
   */
  safeMigration: () => createMigrationScript({
    migrationOptions: {
      preserveOriginalStyles: true,
      addCompatibilityLayer: true,
      generateTypes: true,
    },
    createBackups: true,
    dryRun: false,
  }),

  /**
   * Aggressive migration with minimal compatibility
   */
  aggressiveMigration: () => createMigrationScript({
    migrationOptions: {
      preserveOriginalStyles: false,
      addCompatibilityLayer: false,
      generateTypes: true,
    },
    createBackups: true,
    dryRun: false,
  }),
};