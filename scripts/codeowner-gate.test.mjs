import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { evaluateCodeownerGate } from './codeowner-gate.mjs';

const CODEOWNERS_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.github/CODEOWNERS'
);

const REAL_CODEOWNERS = fs.readFileSync(CODEOWNERS_PATH, 'utf8');

test('Tier 1 and Tier 2 PRs by non-Code-Owners pass without reviews', () => {
  const tier1 = evaluateCodeownerGate({
    changedFiles: ['docs/getting-started.md'],
    prAuthor: 'danleecreates',
    reviews: [],
    headSha: 'abc1234',
    codeownersContent: REAL_CODEOWNERS,
  });
  assert.equal(tier1.passed, true);
  assert.equal(tier1.conclusion, 'success');
  assert.equal(tier1.tier, 'low');

  const tier2 = evaluateCodeownerGate({
    changedFiles: ['apps/web/app/page.tsx'],
    prAuthor: 'ojtayo',
    reviews: [],
    headSha: 'abc1234',
    codeownersContent: REAL_CODEOWNERS,
  });
  assert.equal(tier2.passed, true);
  assert.equal(tier2.conclusion, 'success');
  assert.equal(tier2.tier, 'medium');
});

test('Tier 3 high-risk PRs authored by hugheshallettj or tomoakley pass with 0 reviews', () => {
  for (const author of ['hugheshallettj', 'TomOakley']) {
    const result = evaluateCodeownerGate({
      changedFiles: ['supabase/migrations/20261127000000_test.sql'],
      prAuthor: author,
      reviews: [],
      headSha: 'sha111',
      codeownersContent: REAL_CODEOWNERS,
    });
    assert.equal(result.passed, true);
    assert.equal(result.conclusion, 'success');
    assert.equal(result.tier, 'high');
    assert.equal(result.authorIsCodeOwner, true);
  }
});

test('Tier 3 PR by non-Code-Owner enforces fresh Code Owner approval on headSha', () => {
  const highRiskFiles = ['supabase/functions/push-notify/index.ts'];

  // 0 reviews -> fail
  const noReview = evaluateCodeownerGate({
    changedFiles: highRiskFiles,
    prAuthor: 'danleecreates',
    reviews: [],
    headSha: 'sha2',
    codeownersContent: REAL_CODEOWNERS,
  });
  assert.equal(noReview.passed, false);
  assert.equal(noReview.conclusion, 'failure');

  // Non-Code-Owner approval -> fail
  const nonOwnerApproval = evaluateCodeownerGate({
    changedFiles: highRiskFiles,
    prAuthor: 'danleecreates',
    reviews: [
      {
        user: { login: 'aonghas' },
        state: 'APPROVED',
        commit_id: 'sha2',
      },
    ],
    headSha: 'sha2',
    codeownersContent: REAL_CODEOWNERS,
  });
  assert.equal(nonOwnerApproval.passed, false);
  assert.equal(nonOwnerApproval.conclusion, 'failure');

  // Stale Code Owner approval on older commit -> fail
  const staleApproval = evaluateCodeownerGate({
    changedFiles: highRiskFiles,
    prAuthor: 'danleecreates',
    reviews: [
      {
        user: { login: 'tomoakley' },
        state: 'APPROVED',
        commit_id: 'sha1',
      },
    ],
    headSha: 'sha2',
    codeownersContent: REAL_CODEOWNERS,
  });
  assert.equal(staleApproval.passed, false);
  assert.equal(staleApproval.conclusion, 'failure');
  assert.match(staleApproval.summary, /new commits were pushed/i);

  // Active CHANGES_REQUESTED overrides another approval -> fail
  const changesRequested = evaluateCodeownerGate({
    changedFiles: highRiskFiles,
    prAuthor: 'danleecreates',
    reviews: [
      {
        user: { login: 'tomoakley' },
        state: 'APPROVED',
        commit_id: 'sha2',
      },
      {
        user: { login: 'hugheshallettj' },
        state: 'CHANGES_REQUESTED',
        commit_id: 'sha2',
      },
    ],
    headSha: 'sha2',
    codeownersContent: REAL_CODEOWNERS,
  });
  assert.equal(changesRequested.passed, false);
  assert.equal(changesRequested.conclusion, 'failure');

  // Fresh Code Owner approval on headSha followed by plain COMMENTED -> pass
  const freshApproval = evaluateCodeownerGate({
    changedFiles: highRiskFiles,
    prAuthor: 'danleecreates',
    reviews: [
      {
        user: { login: 'hugheshallettj' },
        state: 'APPROVED',
        commit_id: 'sha2',
      },
      {
        user: { login: 'chatgpt-codex-connector' },
        state: 'COMMENTED',
        commit_id: 'sha2',
      },
    ],
    headSha: 'sha2',
    codeownersContent: REAL_CODEOWNERS,
  });
  assert.equal(freshApproval.passed, true);
  assert.equal(freshApproval.conclusion, 'success');
});
