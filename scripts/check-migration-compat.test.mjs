import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CORE_MOBILE_TABLES,
  checkMigrationFiles,
  checkMigrationSql,
  extractStatements,
} from './check-migration-compat.mjs';

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

test('allows safe additive DDL, comments, strings, and dollar-quoted bodies', () => {
  const safeSql = `
    -- Previously we would DROP TABLE public.users; never do that!
    /*
      Nested comment warning:
      /* ALTER TABLE public.groups DROP COLUMN name; */
    */
    CREATE TABLE public.prayer_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.users(id),
      title text NOT NULL
    );

    ALTER TABLE public.groups
      ADD COLUMN IF NOT EXISTS subtitle text,
      ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS search_label text GENERATED ALWAYS AS (coalesce(name, '')) STORED NOT NULL,
      ADD COLUMN IF NOT EXISTS safe_note text DEFAULT 'not null literal -- drop table',
      ADD CONSTRAINT chk_group_sort CHECK (sort_order >= 0 AND name IS NOT NULL);

    ALTER TABLE public.groups ALTER COLUMN subtitle DROP NOT NULL;
    ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS chk_legacy;

    CREATE OR REPLACE VIEW public.group_summary WITH (security_invoker = true) AS
      SELECT id, name FROM public.groups;

    CREATE OR REPLACE FUNCTION public.get_safe_note()
    RETURNS text
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      -- Comment inside function: DROP TABLE public.users;
      RETURN 'DROP VIEW legacy; ALTER TABLE groups DROP COLUMN name;';
    END;
    $fn$;

    CREATE POLICY dashboard_only_read ON public.prayer_requests FOR SELECT USING (true);
    CREATE POLICY auth_users_check ON auth.users FOR SELECT USING (true);
  `;

  const result = checkMigrationSql(safeSql, 'safe.sql');
  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test('extractStatements splits accurately across quotes, comments, and dollar tags', () => {
  const sql = `
    -- Header line
    CREATE TABLE public.a (label text DEFAULT 'semi;colon -- here''s more');
    DO $$
    BEGIN
      PERFORM 'nested;semicolon';
    END;
    $$;
  `;

  const statements = extractStatements(sql);
  assert.equal(statements.length, 2);
  assert.equal(statements[0].line, 3);
  assert.equal(statements[1].line, 4);
  assert.match(statements[1].sql, /^DO \$\$/);
});

test('flags all 9 breaking migration rules', () => {
  const cases = [
    ['drop-table', 'DROP TABLE IF EXISTS public.legacy_items;'],
    ['drop-view', 'DROP MATERIALIZED VIEW public.member_stats;'],
    ['drop-function', 'DROP FUNCTION IF EXISTS public.old_rpc(uuid);'],
    ['drop-column', 'ALTER TABLE public.users DROP COLUMN legacy_pin;'],
    ['drop-column', 'ALTER TABLE public.users DROP legacy_pin;'],
    [
      'rename-object',
      'ALTER TABLE public.events RENAME COLUMN title TO event_title;',
    ],
    ['rename-object', 'ALTER TABLE public.events RENAME TO calendar_events;'],
    [
      'rename-object',
      'ALTER VIEW public.group_summary RENAME TO v_group_summary;',
    ],
    ['rename-object', 'ALTER FUNCTION public.old_rpc(uuid) RENAME TO new_rpc;'],
    [
      'alter-column-type',
      'ALTER TABLE public.groups ALTER COLUMN sort_order TYPE bigint;',
    ],
    [
      'add-not-null-no-default',
      'ALTER TABLE public.users ADD COLUMN phone_verified boolean NOT NULL;',
    ],
    ['set-not-null', 'ALTER TABLE public.users ALTER COLUMN bio SET NOT NULL;'],
    ['modify-core-rls-policy', 'DROP POLICY users_select ON public.users;'],
    [
      'modify-core-rls-policy',
      'CREATE POLICY extra_gate ON "group_memberships" FOR SELECT USING (false);',
    ],
    [
      'modify-core-rls-policy',
      'ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;',
    ],
  ];

  for (const [expectedRule, sql] of cases) {
    const result = checkMigrationSql(sql, 'breaking.sql');
    assert.equal(result.ok, false, `Expected failure for SQL: ${sql}`);
    assert.equal(
      result.violations.some((v) => v.rule === expectedRule),
      true,
      `Expected rule "${expectedRule}" for SQL: ${sql}; got ${JSON.stringify(result.violations)}`
    );
  }
});

test('handles multi-action ALTER TABLE with commas inside CHECK constraints', () => {
  const sql = `
    ALTER TABLE public.users
      ADD CONSTRAINT chk_role CHECK (role IN ('member', 'leader')),
      DROP COLUMN obsolete_flag;
  `;

  const result = checkMigrationSql(sql, 'multi.sql');
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].rule, 'drop-column');
});

test('supports valid file-header and per-statement overrides', () => {
  const headerOverrideSql = `
    -- allow-breaking-migration: Contract phase after mobile v2.4 forced upgrade
    ALTER TABLE public.users DROP COLUMN legacy_a;
    DROP VIEW IF EXISTS public.legacy_v;
  `;

  const headerResult = checkMigrationSql(headerOverrideSql, 'contract.sql');
  assert.equal(headerResult.ok, true);
  assert.equal(headerResult.violations.length, 0);
  assert.equal(headerResult.overrides.length, 1);
  assert.deepEqual(headerResult.overrides[0].rules, [
    'drop-column',
    'drop-view',
  ]);

  const partialOverrideSql = `
    ALTER TABLE public.groups ADD COLUMN extra_note text;

    -- allow-breaking-migration: Audited mobile v2.1+ no longer reads old_flag
    ALTER TABLE public.groups DROP COLUMN old_flag;

    DROP TABLE public.events;
  `;

  const partialResult = checkMigrationSql(partialOverrideSql, 'partial.sql');
  assert.equal(partialResult.ok, false);
  assert.equal(partialResult.overrides.length, 1);
  assert.equal(partialResult.violations.length, 1);
  assert.equal(partialResult.violations[0].rule, 'drop-table');
});

test('rejects empty or short override reasons', () => {
  const shortReasonSql = `
    -- allow-breaking-migration: too short
    DROP TABLE public.users;
  `;
  const emptyReasonSql = `
    -- allow-breaking-migration:
    ALTER TABLE public.users DROP COLUMN email;
  `;

  for (const sql of [shortReasonSql, emptyReasonSql]) {
    const result = checkMigrationSql(sql, 'bad-override.sql');
    assert.equal(result.ok, false);
    assert.equal(result.overrides.length, 0);
    assert.equal(result.invalidOverrides.length, 1);
    assert.equal(result.violations.length, 1);
  }
});

test('checkMigrationFiles skips non-sql paths and checks sql files on disk', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-compat-'));
  try {
    const sqlPath = path.join(tmpDir, '20261124000000_safe.sql');
    const mdPath = path.join(tmpDir, 'README.md');
    fs.writeFileSync(
      sqlPath,
      'ALTER TABLE public.groups ADD COLUMN notes text;\n'
    );
    fs.writeFileSync(mdPath, 'DROP TABLE public.users;\n');

    const result = checkMigrationFiles([mdPath, sqlPath]);
    assert.equal(result.ok, true);
    assert.deepEqual(result.checkedFiles, [sqlPath]);
    assert.equal(result.violations.length, 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('smoke test: parses all existing supabase/migrations/*.sql without errors', () => {
  const migrationsDir = path.join(REPO_ROOT, 'supabase', 'migrations');
  const sqlFiles = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => path.join(migrationsDir, name));

  assert.ok(sqlFiles.length > 0, 'Expected existing SQL migration files');
  assert.ok(CORE_MOBILE_TABLES.has('users'));

  for (const filePath of sqlFiles) {
    const sql = fs.readFileSync(filePath, 'utf8');
    const statements = extractStatements(sql);
    assert.ok(Array.isArray(statements));
    if (sql.trim().length > 0) {
      assert.ok(
        statements.length > 0,
        `Expected non-empty statements in ${path.basename(filePath)}`
      );
    }
    for (const stmt of statements) {
      assert.ok(stmt.line >= 1);
    }
    const result = checkMigrationSql(sql, filePath);
    assert.equal(typeof result.ok, 'boolean');
  }
});
