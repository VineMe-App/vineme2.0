import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  determineTargetStatus,
  evaluateCodeOwnerApproval,
  evaluateRequiredChecks,
  extractIssueNumberFromBranch,
  extractIssueNumbersFromText,
  parseCodeownersLogins,
} from './project-triage.mjs';

const CODEOWNERS_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.github/CODEOWNERS'
);

test('extractIssueNumbersFromText parses closing references and ignores plain mentions', () => {
  const body = `
    ## Summary
    See #99 for background and Follow-up from #444.
    Also relates to some-org/other-repo#55.

    ## Linked Issue
    Closes #12, #13 and Fixes VineMe-App/vineme2.0#14.
    Resolves https://github.com/VineMe-App/vineme2.0/issues/27
    fixes other-org/elsewhere#88
  `;

  assert.deepEqual(extractIssueNumbersFromText(body), [12, 13, 14, 27]);
  assert.deepEqual(extractIssueNumbersFromText(null), []);
  assert.deepEqual(extractIssueNumbersFromText('Closes #5, resolves #5'), [5]);
});

test('extractIssueNumberFromBranch supports valid issue prefixes only', () => {
  assert.equal(extractIssueNumberFromBranch('feat/15-data-1-request-view'), 15);
  assert.equal(extractIssueNumberFromBranch('fix/337-reminder-notes'), 337);
  assert.equal(extractIssueNumberFromBranch('chore/42'), 42);
  assert.equal(extractIssueNumberFromBranch('docs/9-update-guides'), 9);
  assert.equal(extractIssueNumberFromBranch('refactor/101-auth'), 101);

  assert.equal(extractIssueNumberFromBranch('chore/update-codeowners'), null);
  assert.equal(extractIssueNumberFromBranch('release/mobile-2.0.4'), null);
  assert.equal(extractIssueNumberFromBranch('revert-445-chore'), null);
  assert.equal(extractIssueNumberFromBranch('dev'), null);
});

test('parseCodeownersLogins reflects active .github/CODEOWNERS owners', () => {
  const content = fs.readFileSync(CODEOWNERS_PATH, 'utf8');
  const owners = parseCodeownersLogins(content);

  assert.equal(owners.has('hugheshallettj'), true);
  assert.equal(owners.has('tomoakley'), true);
  assert.equal(owners.has('aonghas'), false);
});

test('evaluateCodeOwnerApproval enforces non-author Code Owner approval and detects requested changes', () => {
  const codeowners = new Set(['hugheshallettj', 'tomoakley']);

  assert.deepEqual(
    evaluateCodeOwnerApproval({
      reviews: [{ user: { login: 'hugheshallettj' }, state: 'APPROVED' }],
      prAuthor: 'hugheshallettj',
      codeowners,
    }),
    { approvedByCodeOwner: false, hasChangesRequested: false }
  );

  assert.deepEqual(
    evaluateCodeOwnerApproval({
      reviews: [{ user: { login: 'randomdev' }, state: 'APPROVED' }],
      prAuthor: 'hugheshallettj',
      codeowners,
    }),
    { approvedByCodeOwner: false, hasChangesRequested: false }
  );

  assert.deepEqual(
    evaluateCodeOwnerApproval({
      reviews: [
        { user: { login: 'TomOakley' }, state: 'APPROVED' },
        { user: { login: 'TomOakley' }, state: 'COMMENTED' },
      ],
      prAuthor: 'hugheshallettj',
      codeowners,
    }),
    { approvedByCodeOwner: true, hasChangesRequested: false }
  );

  assert.deepEqual(
    evaluateCodeOwnerApproval({
      reviews: [
        { user: { login: 'tomoakley' }, state: 'APPROVED' },
        { user: { login: 'tomoakley' }, state: 'CHANGES_REQUESTED' },
      ],
      prAuthor: 'hugheshallettj',
      codeowners,
    }),
    { approvedByCodeOwner: false, hasChangesRequested: true }
  );

  assert.deepEqual(
    evaluateCodeOwnerApproval({
      reviews: [
        { user: { login: 'tomoakley' }, state: 'APPROVED' },
        { user: { login: 'tomoakley' }, state: 'DISMISSED' },
      ],
      prAuthor: 'hugheshallettj',
      codeowners,
    }),
    { approvedByCodeOwner: false, hasChangesRequested: false }
  );
});

test('evaluateRequiredChecks inspects latest check run per required check', () => {
  assert.equal(
    evaluateRequiredChecks([
      {
        id: 1,
        name: 'test (20.x)',
        status: 'completed',
        conclusion: 'failure',
      },
      {
        id: 2,
        name: 'test (20.x)',
        status: 'completed',
        conclusion: 'success',
      },
      {
        id: 3,
        name: 'supabase-gate',
        status: 'completed',
        conclusion: 'success',
      },
    ]),
    true
  );

  assert.equal(
    evaluateRequiredChecks([
      { id: 1, name: 'test (20.x)', status: 'in_progress', conclusion: null },
      {
        id: 2,
        name: 'supabase-gate',
        status: 'completed',
        conclusion: 'success',
      },
    ]),
    false
  );
});

test('determineTargetStatus handles issues, branches, PR tiers, merge to dev, and terminal guards', () => {
  // Unassigned new issue -> Backlog; pre-assigned new issue -> In Progress
  assert.equal(
    determineTargetStatus({
      event: 'issues',
      action: 'opened',
      currentStatus: null,
      issueAssigned: false,
    }).targetStatus,
    'Backlog'
  );
  assert.equal(
    determineTargetStatus({
      event: 'issues',
      action: 'opened',
      currentStatus: null,
      issueAssigned: true,
    }).targetStatus,
    'In Progress'
  );

  // Assignment moves Backlog/Ready -> In Progress, never pulls back Code Complete or Ready for QA
  assert.equal(
    determineTargetStatus({
      event: 'issues',
      action: 'assigned',
      currentStatus: 'Ready',
    }).targetStatus,
    'In Progress'
  );
  assert.equal(
    determineTargetStatus({
      event: 'issues',
      action: 'assigned',
      currentStatus: 'Code Complete',
    }).targetStatus,
    null
  );
  assert.equal(
    determineTargetStatus({
      event: 'issues',
      action: 'assigned',
      currentStatus: 'Ready for QA',
    }).targetStatus,
    null
  );

  // Branch creation moves Backlog -> In Progress
  assert.equal(
    determineTargetStatus({
      event: 'create',
      currentStatus: 'Backlog',
    }).targetStatus,
    'In Progress'
  );

  // Draft PR -> In Progress (including reverting Code Complete -> In Progress)
  assert.equal(
    determineTargetStatus({
      event: 'pull_request',
      baseRef: 'dev',
      state: 'open',
      isDraft: true,
      currentStatus: 'Code Complete',
    }).targetStatus,
    'In Progress'
  );

  // Tier 2: awaiting CI -> In Progress; CI green -> Code Complete
  assert.equal(
    determineTargetStatus({
      event: 'pull_request',
      baseRef: 'dev',
      state: 'open',
      isDraft: false,
      riskLabel: 'risk:medium',
      requiredChecksPassed: false,
      currentStatus: 'Backlog',
    }).targetStatus,
    'In Progress'
  );
  assert.equal(
    determineTargetStatus({
      event: 'workflow_run',
      baseRef: 'dev',
      state: 'open',
      isDraft: false,
      riskLabel: 'risk:medium',
      requiredChecksPassed: true,
      approvedByCodeOwner: false,
      hasChangesRequested: false,
      currentStatus: 'In Progress',
    }).targetStatus,
    'Code Complete'
  );

  // Tier 3: CI green without Code Owner approval stays In Progress
  assert.equal(
    determineTargetStatus({
      event: 'workflow_run',
      baseRef: 'dev',
      state: 'open',
      isDraft: false,
      riskLabel: 'risk:high',
      requiredChecksPassed: true,
      approvedByCodeOwner: false,
      hasChangesRequested: false,
      currentStatus: 'In Progress',
    }).targetStatus,
    null
  );

  // Tier 3: CI green + Code Owner approval -> Code Complete
  assert.equal(
    determineTargetStatus({
      event: 'pull_request_review',
      baseRef: 'dev',
      state: 'open',
      isDraft: false,
      riskLabel: 'risk:high',
      requiredChecksPassed: true,
      approvedByCodeOwner: true,
      hasChangesRequested: false,
      currentStatus: 'In Progress',
    }).targetStatus,
    'Code Complete'
  );

  // Changes requested moves Code Complete back to In Progress
  assert.equal(
    determineTargetStatus({
      event: 'pull_request_review',
      baseRef: 'dev',
      state: 'open',
      isDraft: false,
      riskLabel: 'risk:high',
      requiredChecksPassed: true,
      approvedByCodeOwner: false,
      hasChangesRequested: true,
      currentStatus: 'Code Complete',
    }).targetStatus,
    'In Progress'
  );

  // Merged to dev -> Ready for QA
  assert.equal(
    determineTargetStatus({
      event: 'pull_request',
      baseRef: 'dev',
      state: 'closed',
      merged: true,
      currentStatus: 'Code Complete',
    }).targetStatus,
    'Ready for QA'
  );

  // Already Done stays untouched even when another PR merges
  assert.equal(
    determineTargetStatus({
      event: 'pull_request',
      baseRef: 'dev',
      state: 'closed',
      merged: true,
      currentStatus: 'Done',
    }).targetStatus,
    null
  );

  // Release PRs targeting main are ignored
  assert.equal(
    determineTargetStatus({
      event: 'pull_request',
      baseRef: 'main',
      state: 'closed',
      merged: true,
      currentStatus: 'Ready for QA',
    }).targetStatus,
    null
  );
});
