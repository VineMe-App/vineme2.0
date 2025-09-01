/**
 * Migration utilities for converting existing components to use the new styling system
 */

export { ComponentMigrator } from './ComponentMigrator';
export { StyleMigrator } from './StyleMigrator';
export { ThemeCompatibilityLayer } from './ThemeCompatibilityLayer';
export { migrationHelpers } from './migrationHelpers';
export { createMigrationScript } from './migrationScripts';

export type {
  MigrationConfig,
  ComponentMigrationResult,
  StyleMigrationOptions,
  LegacyStyleMapping,
  MigrationReport,
} from './types';