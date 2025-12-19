import { ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { Theme } from '../../theme/themes/types';

/**
 * Configuration for component migration
 */
export interface MigrationConfig {
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

/**
 * Result of component migration
 */
export interface ComponentMigrationResult {
  /** Original component code */
  originalCode: string;
  /** Migrated component code */
  migratedCode: string;
  /** Migration warnings */
  warnings: string[];
  /** Migration errors */
  errors: string[];
  /** Success status */
  success: boolean;
  /** Backup file path */
  backupPath?: string;
}

/**
 * Options for style migration
 */
export interface StyleMigrationOptions {
  /** Target theme to migrate to */
  targetTheme?: Theme;
  /** Whether to use semantic color names */
  useSemanticColors: boolean;
  /** Whether to convert hardcoded values to theme tokens */
  convertToTokens: boolean;
  /** Whether to preserve original values as comments */
  preserveComments: boolean;
}

/**
 * Mapping between legacy styles and new theme tokens
 */
export interface LegacyStyleMapping {
  /** Legacy style property */
  legacyProperty: string;
  /** Legacy value */
  legacyValue: string | number;
  /** New theme token path */
  themeTokenPath: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Whether manual review is needed */
  needsReview: boolean;
}

/**
 * Migration report
 */
export interface MigrationReport {
  /** Total components processed */
  totalComponents: number;
  /** Successfully migrated components */
  successfulMigrations: number;
  /** Failed migrations */
  failedMigrations: number;
  /** Components with warnings */
  componentsWithWarnings: number;
  /** Style mappings applied */
  styleMappingsApplied: LegacyStyleMapping[];
  /** Migration summary */
  summary: string;
  /** Detailed results per component */
  componentResults: Record<string, ComponentMigrationResult>;
}

/**
 * Legacy style definition
 */
export interface LegacyStyle {
  [key: string]: ViewStyle | TextStyle | ImageStyle;
}

/**
 * Theme-aware style definition
 */
export interface ThemeAwareStyle {
  [key: string]: (theme: Theme) => ViewStyle | TextStyle | ImageStyle;
}

/**
 * Compatibility layer options
 */
export interface CompatibilityLayerOptions {
  /** Whether to enable legacy style support */
  enableLegacyStyles: boolean;
  /** Whether to show deprecation warnings */
  showDeprecationWarnings: boolean;
  /** Custom warning handler */
  onDeprecationWarning?: (message: string) => void;
}

/**
 * Migration script configuration
 */
export interface MigrationScriptConfig {
  /** Source directory to scan */
  sourceDir: string;
  /** Output directory for migrated files */
  outputDir?: string;
  /** File patterns to include */
  includePatterns: string[];
  /** File patterns to exclude */
  excludePatterns: string[];
  /** Migration options */
  migrationOptions: MigrationConfig;
  /** Whether to create backups */
  createBackups: boolean;
  /** Dry run mode */
  dryRun: boolean;
}
