import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  classifyFiles,
  isLowRiskFile,
  parseCodeowners,
} from './classify-pr-risk.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CODEOWNERS_PATH = path.resolve(SCRIPT_DIR, '../.github/CODEOWNERS');
const codeownersPatterns = parseCodeowners(
  fs.readFileSync(CODEOWNERS_PATH, 'utf8')
);

test('Tier 1: docs, non-agent markdown, static assets, and tests auto-merge cleanly', () => {
  const result = classifyFiles(
    [
      'docs/README.md',
      'docs/glossary.md',
      'docs/public/vineme-logo-email.png',
      'CONTRIBUTING.md',
      'apps/web/docs/dashboard/README.md',
      'apps/mobile/src/__tests__/groups.test.ts',
      'apps/mobile/src/services/groups.spec.tsx',
    ],
    codeownersPatterns
  );

  assert.equal(result.tier, 'low');
  assert.equal(result.label, 'risk:low');
  assert.equal(result.eligibleForAutoMerge, true);
  assert.deepEqual(result.matchedHighRisk, []);
  assert.deepEqual(result.matchedMediumRisk, []);
});

test('Tier 2: AGENTS.md, CLAUDE.md, .agents/**, docs/.vitepress/**, and app code are excluded from Tier 1', () => {
  const tier2Inputs = [
    'AGENTS.md',
    'apps/web/AGENTS.md',
    'CLAUDE.md',
    'apps/mobile/CLAUDE.md',
    '.agents/skills/write-spec/SKILL.md',
    '.claude/skills',
    'docs/.vitepress/config.mts',
    'apps/web/components/dashboard/OverviewCard.tsx',
    'apps/mobile/src/components/ui/Button.tsx',
    'packages/shared/src/database.ts',
  ];

  for (const file of tier2Inputs) {
    assert.equal(
      isLowRiskFile(file),
      false,
      `Expected ${file} not to qualify as Tier 1 low-risk`
    );
    const result = classifyFiles([file], codeownersPatterns);
    assert.equal(result.tier, 'medium', `Expected ${file} to be Tier 2`);
    assert.equal(result.eligibleForAutoMerge, false);
  }
});

test('Tier 2 safe fallback when no files are provided', () => {
  const result = classifyFiles([], codeownersPatterns);
  assert.equal(result.tier, 'medium');
  assert.equal(result.eligibleForAutoMerge, false);
});

test('Tier 3: all CODEOWNERS high-risk paths escalate to risk:high', () => {
  const highRiskFiles = [
    'supabase/migrations/20261124000000_add_test.sql',
    'supabase/functions/create-referred-user/index.ts',
    'supabase/config.toml',
    'supabase/seed.sql',
    '.github/workflows/test.yml',
    '.github/rulesets/dev-branch-ruleset.json',
    '.github/CODEOWNERS',
    'scripts/check-db-security.sql',
    'scripts/typecheck-mobile-gate.mjs',
    'scripts/mobile-typecheck-baseline.json',
    'scripts/classify-pr-risk.mjs',
    'scripts/classify-pr-risk.test.mjs',
    'apps/web/lib/supabase/server.ts',
    'apps/web/app/api/contact/route.ts',
    'apps/web/app/login/page.tsx',
    'apps/mobile/src/services/auth.ts',
    'apps/mobile/src/services/permissions.ts',
    'apps/mobile/src/services/supabase.ts',
  ];

  for (const file of highRiskFiles) {
    const result = classifyFiles([file], codeownersPatterns);
    assert.equal(
      result.tier,
      'high',
      `Expected ${file} to match CODEOWNERS as Tier 3 high-risk`
    );
    assert.equal(result.label, 'risk:high');
    assert.equal(result.eligibleForAutoMerge, false);
    assert.deepEqual(result.matchedHighRisk, [file]);
  }
});

test('Mixed-tier PRs always escalate to the highest tier present', () => {
  const docsPlusAgents = classifyFiles(
    ['docs/README.md', 'AGENTS.md'],
    codeownersPatterns
  );
  assert.equal(docsPlusAgents.tier, 'medium');
  assert.equal(docsPlusAgents.eligibleForAutoMerge, false);
  assert.deepEqual(docsPlusAgents.matchedMediumRisk, ['AGENTS.md']);

  const docsPlusMigration = classifyFiles(
    ['docs/README.md', 'supabase/migrations/20261124_rls.sql'],
    codeownersPatterns
  );
  assert.equal(docsPlusMigration.tier, 'high');
  assert.equal(docsPlusMigration.eligibleForAutoMerge, false);
  assert.deepEqual(docsPlusMigration.matchedHighRisk, [
    'supabase/migrations/20261124_rls.sql',
  ]);
});
