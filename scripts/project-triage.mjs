#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { classifyFiles, parseCodeowners } from './classify-pr-risk.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_CODEOWNERS_PATH = path.join(REPO_ROOT, '.github', 'CODEOWNERS');

export const REQUIRED_CHECKS = ['test (20.x)', 'supabase-gate'];

const ISSUE_BRANCH_RE = /^(?:feat|fix|chore|docs|refactor)\/(\d+)(?:-|$)/i;

const CANONICAL_STATUSES = new Map([
  ['backlog', 'Backlog'],
  ['ready', 'Ready'],
  ['in progress', 'In Progress'],
  ['code complete', 'Code Complete'],
  ['ready for qa', 'Ready for QA'],
  ['done', 'Done'],
]);

/**
 * Normalizes a GitHub Project Status name case-insensitively.
 */
export function normalizeStatus(status) {
  if (!status || typeof status !== 'string') return null;
  const trimmed = status.trim().toLowerCase();
  return CANONICAL_STATUSES.get(trimmed) ?? status.trim();
}

/**
 * Extracts closing-keyword issue numbers (e.g. `Closes #12`, `Fixes #13, #14`,
 * `Resolves VineMe-App/vineme2.0#15`) from PR body/title text while ignoring
 * plain mentions such as `See #99` or references to external repositories.
 *
 * @param {string | null | undefined} text
 * @param {string} [repoFullName='VineMe-App/vineme2.0']
 * @returns {number[]}
 */
export function extractIssueNumbersFromText(
  text,
  repoFullName = 'VineMe-App/vineme2.0'
) {
  if (!text || typeof text !== 'string') return [];

  const targetRepoLower = repoFullName.toLowerCase();
  const numbers = new Set();

  const keywordRe = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\b/gi;
  const escapedRepo = targetRepoLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const itemRe = new RegExp(
    `^(?::?\\s*)(?:(?:(${escapedRepo})|([A-Za-z0-9_.-]+\\/[A-Za-z0-9_.-]+))?#(\\d+)|https?:\\/\\/github\\.com\\/([A-Za-z0-9_.-]+\\/[A-Za-z0-9_.-]+)\\/issues\\/(\\d+))\\b`,
    'i'
  );
  const continuationRe =
    /^(?:\s*(?:,|and)\s*(?:(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?)?\s*)/i;

  let match;
  while ((match = keywordRe.exec(text)) !== null) {
    let cursor = match.index + match[0].length;
    let firstItem = true;

    while (cursor < text.length) {
      let slice = text.slice(cursor);
      if (!firstItem) {
        const contMatch = slice.match(continuationRe);
        if (!contMatch || contMatch[0].length === 0) break;
        cursor += contMatch[0].length;
        slice = text.slice(cursor);
      }

      const refMatch = slice.match(itemRe);
      if (!refMatch) break;

      const explicitSameRepo = refMatch[1];
      const otherRepo = refMatch[2];
      const urlRepo = refMatch[4];
      const numStr = refMatch[3] || refMatch[5];

      if (!otherRepo || explicitSameRepo) {
        if (!urlRepo || urlRepo.toLowerCase() === targetRepoLower) {
          const parsed = Number.parseInt(numStr, 10);
          if (Number.isInteger(parsed) && parsed > 0) {
            numbers.add(parsed);
          }
        }
      }

      cursor += refMatch[0].length;
      firstItem = false;
    }
  }

  return Array.from(numbers).sort((a, b) => a - b);
}

/**
 * Extracts a GitHub issue number from a branch following `<type>/<issue>-<slug>`.
 *
 * @param {string | null | undefined} branchName
 * @returns {number | null}
 */
export function extractIssueNumberFromBranch(branchName) {
  if (!branchName || typeof branchName !== 'string') return null;
  const match = branchName.trim().match(ISSUE_BRANCH_RE);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Extracts individual GitHub usernames (lowercased, without leading `@`)
 * from `.github/CODEOWNERS`.
 *
 * @param {string} codeownersContent
 * @returns {Set<string>}
 */
export function parseCodeownersLogins(codeownersContent) {
  const owners = new Set();
  if (!codeownersContent || typeof codeownersContent !== 'string') {
    return owners;
  }

  for (const rawLine of codeownersContent.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const withoutComment = trimmed.replace(/\s+#.*$/, '').trim();
    if (!withoutComment) continue;
    const parts = withoutComment.split(/\s+/);
    for (const token of parts.slice(1)) {
      const m = token.match(/^@([A-Za-z0-9-]+)$/);
      if (m) {
        owners.add(m[1].toLowerCase());
      }
    }
  }

  return owners;
}

/**
 * Evaluates GitHub PR reviews to see if at least one non-author Code Owner
 * currently approves and whether any non-author reviewer has requested changes.
 *
 * @param {{
 *   reviews: Array<{ user?: { login?: string }, state?: string, submitted_at?: string, id?: number }>,
 *   prAuthor?: string | null,
 *   codeowners: Set<string>
 * }} params
 * @returns {{ approvedByCodeOwner: boolean, hasChangesRequested: boolean }}
 */
export function evaluateCodeOwnerApproval({ reviews, prAuthor, codeowners }) {
  const authorLower = prAuthor ? String(prAuthor).trim().toLowerCase() : '';
  const latestByReviewer = new Map();

  for (const review of reviews ?? []) {
    const login = review?.user?.login?.trim().toLowerCase();
    const state = review?.state?.toUpperCase();
    if (!login || !state) continue;
    if (authorLower && login === authorLower) continue;

    if (
      state === 'APPROVED' ||
      state === 'CHANGES_REQUESTED' ||
      state === 'DISMISSED'
    ) {
      latestByReviewer.set(login, state);
    }
  }

  let approvedByCodeOwner = false;
  let hasChangesRequested = false;

  for (const [login, state] of latestByReviewer.entries()) {
    if (state === 'CHANGES_REQUESTED') {
      hasChangesRequested = true;
    } else if (state === 'APPROVED' && codeowners?.has(login)) {
      approvedByCodeOwner = true;
    }
  }

  return { approvedByCodeOwner, hasChangesRequested };
}

/**
 * Evaluates check runs for a commit SHA, taking the latest check run per name
 * and returning true only when every check in `requiredChecks` is completed
 * with conclusion `success`.
 *
 * @param {Array<{ name?: string, status?: string, conclusion?: string | null, id?: number, completed_at?: string, started_at?: string }>} checkRuns
 * @param {string[]} [requiredChecks=REQUIRED_CHECKS]
 * @returns {boolean}
 */
export function evaluateRequiredChecks(
  checkRuns,
  requiredChecks = REQUIRED_CHECKS
) {
  const latestByName = new Map();

  for (const run of checkRuns ?? []) {
    if (!run?.name) continue;
    const prev = latestByName.get(run.name);
    if (!prev) {
      latestByName.set(run.name, run);
      continue;
    }
    const prevId = prev.id ?? 0;
    const curId = run.id ?? 0;
    if (curId >= prevId) {
      latestByName.set(run.name, run);
    }
  }

  return requiredChecks.every((name) => {
    const run = latestByName.get(name);
    return (
      run?.status === 'completed' &&
      run?.conclusion?.toLowerCase() === 'success'
    );
  });
}

/**
 * Pure state machine deciding the target status column on `VineMe 3.0`.
 * Returns `{ targetStatus: null, reason }` when no update should occur.
 *
 * @param {{
 *   event: 'issues' | 'create' | 'pull_request' | 'pull_request_review' | 'workflow_run',
 *   action?: string | null,
 *   currentStatus?: string | null,
 *   baseRef?: string | null,
 *   isDraft?: boolean,
 *   merged?: boolean,
 *   state?: string | null,
 *   issueAssigned?: boolean,
 *   riskLabel?: string | null,
 *   requiredChecksPassed?: boolean,
 *   authorIsCodeOwner?: boolean,
 *   approvedByCodeOwner?: boolean,
 *   hasChangesRequested?: boolean
 * }} ctx
 * @returns {{ targetStatus: string | null, reason: string }}
 */
export function determineTargetStatus(ctx) {
  const cur = normalizeStatus(ctx.currentStatus);
  const curLower = cur?.toLowerCase() ?? null;

  if (curLower === 'ready for qa' || curLower === 'done') {
    return {
      targetStatus: null,
      reason: `Preserving terminal status "${cur}"`,
    };
  }

  if (ctx.event === 'issues') {
    if (ctx.action === 'opened') {
      if (ctx.issueAssigned) {
        if (curLower === 'in progress' || curLower === 'code complete') {
          return { targetStatus: null, reason: `Already in "${cur}"` };
        }
        return {
          targetStatus: 'In Progress',
          reason: 'Issue opened with an assignee',
        };
      }
      if (!curLower) {
        return {
          targetStatus: 'Backlog',
          reason: 'New unassigned issue placed in Backlog',
        };
      }
      return {
        targetStatus: null,
        reason: `Issue already has status "${cur}"`,
      };
    }

    if (ctx.action === 'assigned') {
      if (curLower === 'code complete' || curLower === 'in progress') {
        return {
          targetStatus: null,
          reason: `Keeping existing status "${cur}" on assignment`,
        };
      }
      return { targetStatus: 'In Progress', reason: 'Issue assigned' };
    }

    return {
      targetStatus: null,
      reason: `Ignored issues action "${ctx.action}"`,
    };
  }

  if (ctx.event === 'create') {
    if (curLower === 'in progress' || curLower === 'code complete') {
      return {
        targetStatus: null,
        reason: `Keeping existing status "${cur}" on branch creation`,
      };
    }
    return {
      targetStatus: 'In Progress',
      reason: 'Work branch created for issue',
    };
  }

  // pull_request, pull_request_review, workflow_run
  if (ctx.baseRef !== 'dev') {
    return {
      targetStatus: null,
      reason: `PR targets "${ctx.baseRef ?? 'unknown'}", not "dev"`,
    };
  }

  if (ctx.merged === true) {
    return {
      targetStatus: 'Ready for QA',
      reason: 'PR merged into dev',
    };
  }

  if (ctx.state === 'closed') {
    return {
      targetStatus: null,
      reason: 'PR closed without merge',
    };
  }

  if (ctx.isDraft) {
    if (curLower === 'in progress') {
      return { targetStatus: null, reason: 'Draft PR already In Progress' };
    }
    return {
      targetStatus: 'In Progress',
      reason: 'Draft PR is not ready to merge',
    };
  }

  const needsCodeOwnerReview = ctx.riskLabel === 'risk:high';
  const reviewSatisfied =
    !needsCodeOwnerReview ||
    Boolean(ctx.authorIsCodeOwner || ctx.approvedByCodeOwner);
  const readyForMerge =
    !ctx.hasChangesRequested &&
    ctx.requiredChecksPassed === true &&
    reviewSatisfied;

  if (readyForMerge) {
    if (curLower === 'code complete') {
      return { targetStatus: null, reason: 'Already Code Complete' };
    }
    return {
      targetStatus: 'Code Complete',
      reason: needsCodeOwnerReview
        ? ctx.authorIsCodeOwner
          ? 'Required checks passed for high-risk PR authored by Code Owner'
          : 'Required checks passed and Code Owner approved'
        : 'Required checks passed for non-high-risk PR',
    };
  }

  if (curLower === 'in progress') {
    return {
      targetStatus: null,
      reason: 'Already In Progress while awaiting CI or review',
    };
  }

  return {
    targetStatus: 'In Progress',
    reason: ctx.hasChangesRequested
      ? 'Changes requested on PR'
      : 'PR awaiting required checks or Code Owner approval',
  };
}

async function githubRequest(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'vineme-project-triage',
      ...(options.headers ?? {}),
    },
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `GitHub API non-JSON response (${res.status}) for ${url}: ${text.slice(0, 200)}`
    );
  }

  if (!res.ok) {
    const message = json?.message || text || `HTTP ${res.status}`;
    throw new Error(`GitHub API error (${res.status}) for ${url}: ${message}`);
  }

  return json;
}

async function githubGraphql(token, query, variables = {}) {
  const json = await githubRequest('https://api.github.com/graphql', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (json.errors?.length) {
    throw new Error(
      `GitHub GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`
    );
  }

  return json.data;
}

async function githubRest(token, apiPath) {
  return githubRequest(`https://api.github.com${apiPath}`, token, {
    method: 'GET',
  });
}

async function resolveOrgProject(token, { org, title, projectNumber }) {
  const fieldSelection = `
    id
    title
    number
    closed
    field(name: "Status") {
      ... on ProjectV2SingleSelectField {
        id
        name
        options {
          id
          name
        }
      }
    }
  `;

  let project = null;

  if (projectNumber) {
    const num = Number.parseInt(String(projectNumber), 10);
    if (Number.isInteger(num) && num > 0) {
      const data = await githubGraphql(
        token,
        `query($org: String!, $number: Int!) {
          organization(login: $org) {
            projectV2(number: $number) {
              ${fieldSelection}
            }
          }
        }`,
        { org, number: num }
      );
      project = data?.organization?.projectV2 ?? null;
    }
  }

  if (!project) {
    const data = await githubGraphql(
      token,
      `query($org: String!, $query: String!) {
        organization(login: $org) {
          projectsV2(first: 20, query: $query) {
            nodes {
              ${fieldSelection}
            }
          }
        }
      }`,
      { org, query: title }
    );

    const nodes = data?.organization?.projectsV2?.nodes ?? [];
    const targetLower = title.trim().toLowerCase();
    const matches = nodes.filter(
      (p) => p?.title?.trim().toLowerCase() === targetLower
    );
    project = matches.find((p) => !p.closed) ?? matches[0] ?? null;
  }

  if (!project) {
    console.warn(
      `[project-triage] Project "${title}" not found in organization "${org}". Skipping.`
    );
    return null;
  }

  if (!project.field?.id) {
    console.warn(
      `[project-triage] Project "${project.title}" (#${project.number}) has no Status field. Skipping.`
    );
    return null;
  }

  const optionsByLowerName = new Map();
  for (const opt of project.field.options ?? []) {
    if (opt?.name && opt?.id) {
      optionsByLowerName.set(opt.name.trim().toLowerCase(), opt);
    }
  }

  return {
    id: project.id,
    title: project.title,
    number: project.number,
    statusFieldId: project.field.id,
    optionsByLowerName,
  };
}

async function getIssueProjectState(
  projectToken,
  { owner, repo, issueNumber, projectId }
) {
  const data = await githubGraphql(
    projectToken,
    `query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) {
          id
          number
          assignees(first: 1) {
            totalCount
          }
          projectItems(first: 20) {
            nodes {
              id
              project {
                id
              }
              fieldValueByName(name: "Status") {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  optionId
                }
              }
            }
          }
        }
      }
    }`,
    { owner, repo, number: issueNumber }
  );

  const issue = data?.repository?.issue;
  if (!issue) return null;

  const existingItem =
    (issue.projectItems?.nodes ?? []).find(
      (item) => item?.project?.id === projectId
    ) ?? null;

  return {
    issueId: issue.id,
    issueNumber: issue.number,
    assigned: (issue.assignees?.totalCount ?? 0) > 0,
    itemId: existingItem?.id ?? null,
    currentStatus: existingItem?.fieldValueByName?.name ?? null,
  };
}

async function ensureItemAndSetStatus(
  projectToken,
  project,
  issueState,
  targetStatus
) {
  if (!targetStatus) return;

  const option = project.optionsByLowerName.get(
    targetStatus.trim().toLowerCase()
  );
  if (!option) {
    console.warn(
      `[project-triage] Project "${project.title}" is missing Status column "${targetStatus}". Add that column in Project settings to enable this transition.`
    );
    return;
  }

  let itemId = issueState.itemId;
  if (!itemId) {
    const added = await githubGraphql(
      projectToken,
      `mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
          item {
            id
          }
        }
      }`,
      { projectId: project.id, contentId: issueState.issueId }
    );
    itemId = added?.addProjectV2ItemById?.item?.id;
  }

  if (!itemId) {
    throw new Error(
      `Failed to resolve project item ID for issue #${issueState.issueNumber}`
    );
  }

  if (
    issueState.currentStatus &&
    issueState.currentStatus.trim().toLowerCase() ===
      option.name.trim().toLowerCase()
  ) {
    return;
  }

  await githubGraphql(
    projectToken,
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { singleSelectOptionId: $optionId }
        }
      ) {
        projectV2Item {
          id
        }
      }
    }`,
    {
      projectId: project.id,
      itemId,
      fieldId: project.statusFieldId,
      optionId: option.id,
    }
  );

  console.log(
    `[project-triage] Issue #${issueState.issueNumber}: "${issueState.currentStatus ?? 'None'}" -> "${option.name}"`
  );
}

async function getLinkedIssueNumbersForPr({
  readToken,
  owner,
  repo,
  prNumber,
  prBody,
  headRef,
}) {
  const repoFullName = `${owner}/${repo}`;
  const linked = new Set(extractIssueNumbersFromText(prBody, repoFullName));

  const branchIssue = extractIssueNumberFromBranch(headRef);
  if (branchIssue) linked.add(branchIssue);

  try {
    const data = await githubGraphql(
      readToken,
      `query($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $number) {
            closingIssuesReferences(first: 20) {
              nodes {
                number
                repository {
                  nameWithOwner
                }
              }
            }
          }
        }
      }`,
      { owner, repo, number: prNumber }
    );

    const refs =
      data?.repository?.pullRequest?.closingIssuesReferences?.nodes ?? [];
    for (const ref of refs) {
      if (
        ref?.number &&
        ref?.repository?.nameWithOwner?.toLowerCase() ===
          repoFullName.toLowerCase()
      ) {
        linked.add(ref.number);
      }
    }
  } catch (err) {
    console.warn(
      `[project-triage] Could not query closingIssuesReferences for PR #${prNumber}: ${err.message}`
    );
  }

  return Array.from(linked).sort((a, b) => a - b);
}

async function processPullRequest({
  eventName,
  action,
  pr,
  owner,
  repo,
  readToken,
  projectToken,
  project,
  codeowners,
  codeownersPatterns,
}) {
  if (!pr) return;
  const baseRef = pr.base?.ref ?? null;
  if (baseRef !== 'dev') {
    console.log(
      `[project-triage] PR #${pr.number} targets "${baseRef}", skipping.`
    );
    return;
  }

  const issueNumbers = await getLinkedIssueNumbersForPr({
    readToken,
    owner,
    repo,
    prNumber: pr.number,
    prBody: pr.body,
    headRef: pr.head?.ref,
  });

  if (issueNumbers.length === 0) {
    console.log(
      `[project-triage] PR #${pr.number} has no linked issue references.`
    );
    return;
  }

  let requiredChecksPassed = false;
  let approvedByCodeOwner = false;
  let hasChangesRequested = false;
  const authorIsCodeOwner = codeowners.has(
    (pr.user?.login ?? '').trim().toLowerCase()
  );
  let riskLabel =
    (pr.labels ?? []).find((l) => l?.name?.startsWith('risk:'))?.name ?? null;

  if (pr.state === 'open' && !pr.draft && !pr.merged) {
    const [checksData, reviewsData] = await Promise.all([
      githubRest(
        readToken,
        `/repos/${owner}/${repo}/commits/${pr.head.sha}/check-runs?per_page=100`
      ),
      githubRest(
        readToken,
        `/repos/${owner}/${repo}/pulls/${pr.number}/reviews?per_page=100`
      ),
    ]);

    requiredChecksPassed = evaluateRequiredChecks(checksData?.check_runs);
    const reviewStatus = evaluateCodeOwnerApproval({
      reviews: reviewsData,
      prAuthor: pr.user?.login,
      codeowners,
    });
    approvedByCodeOwner = reviewStatus.approvedByCodeOwner;
    hasChangesRequested = reviewStatus.hasChangesRequested;

    if (!riskLabel) {
      const filesData = await githubRest(
        readToken,
        `/repos/${owner}/${repo}/pulls/${pr.number}/files?per_page=100`
      );
      const changedFiles = (filesData ?? [])
        .map((f) => f?.filename)
        .filter(Boolean);
      riskLabel = classifyFiles(changedFiles, codeownersPatterns).label;
    }
  }

  for (const issueNumber of issueNumbers) {
    const issueState = await getIssueProjectState(projectToken, {
      owner,
      repo,
      issueNumber,
      projectId: project.id,
    });
    if (!issueState) {
      console.warn(
        `[project-triage] Referenced issue #${issueNumber} not found in ${owner}/${repo}.`
      );
      continue;
    }

    const decision = determineTargetStatus({
      event: eventName,
      action,
      currentStatus: issueState.currentStatus,
      baseRef,
      isDraft: Boolean(pr.draft),
      merged: Boolean(pr.merged),
      state: pr.state,
      riskLabel,
      requiredChecksPassed,
      authorIsCodeOwner,
      approvedByCodeOwner,
      hasChangesRequested,
    });

    console.log(
      `[project-triage] Issue #${issueNumber} decision: ${decision.targetStatus ?? 'no-op'} (${decision.reason})`
    );

    if (decision.targetStatus) {
      await ensureItemAndSetStatus(
        projectToken,
        project,
        issueState,
        decision.targetStatus
      );
    }
  }
}

async function runCli() {
  const projectToken = process.env.PROJECT_TOKEN?.trim();
  if (!projectToken) {
    console.log(
      '[project-triage] PROJECT_AUTOMATION_TOKEN secret is not configured; skipping Org Project board sync.'
    );
    return;
  }

  const readToken = process.env.GITHUB_TOKEN?.trim() || projectToken;
  const eventName = process.env.GITHUB_EVENT_NAME;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const repoFullName = process.env.GITHUB_REPOSITORY || 'VineMe-App/vineme2.0';
  const [owner, repo] = repoFullName.split('/');

  if (!eventName || !eventPath || !owner || !repo) {
    console.warn(
      '[project-triage] Missing GitHub Actions event environment variables; exiting.'
    );
    return;
  }

  const payload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const projectOrg = process.env.PROJECT_ORG?.trim() || owner;
  const projectTitle = process.env.PROJECT_TITLE?.trim() || 'VineMe 3.0';
  const projectNumber = process.env.PROJECT_NUMBER?.trim() || '';

  const project = await resolveOrgProject(projectToken, {
    org: projectOrg,
    title: projectTitle,
    projectNumber,
  });
  if (!project) return;

  const codeownersText = fs.existsSync(DEFAULT_CODEOWNERS_PATH)
    ? fs.readFileSync(DEFAULT_CODEOWNERS_PATH, 'utf8')
    : '';
  const codeowners = parseCodeownersLogins(codeownersText);
  const codeownersPatterns = parseCodeowners(codeownersText);

  if (eventName === 'issues') {
    const issue = payload.issue;
    if (!issue?.number) return;
    const issueState = await getIssueProjectState(projectToken, {
      owner,
      repo,
      issueNumber: issue.number,
      projectId: project.id,
    });
    if (!issueState) return;

    const decision = determineTargetStatus({
      event: 'issues',
      action: payload.action,
      currentStatus: issueState.currentStatus,
      issueAssigned: issueState.assigned || (issue.assignees?.length ?? 0) > 0,
    });
    console.log(
      `[project-triage] Issue #${issue.number} decision: ${decision.targetStatus ?? 'no-op'} (${decision.reason})`
    );
    if (decision.targetStatus) {
      await ensureItemAndSetStatus(
        projectToken,
        project,
        issueState,
        decision.targetStatus
      );
    }
    return;
  }

  if (eventName === 'create') {
    if (payload.ref_type !== 'branch') return;
    const issueNumber = extractIssueNumberFromBranch(payload.ref);
    if (!issueNumber) {
      console.log(
        `[project-triage] Branch "${payload.ref}" does not match <type>/<issue>-<slug>; skipping.`
      );
      return;
    }

    const issueState = await getIssueProjectState(projectToken, {
      owner,
      repo,
      issueNumber,
      projectId: project.id,
    });
    if (!issueState) return;

    const decision = determineTargetStatus({
      event: 'create',
      currentStatus: issueState.currentStatus,
    });
    console.log(
      `[project-triage] Issue #${issueNumber} decision: ${decision.targetStatus ?? 'no-op'} (${decision.reason})`
    );
    if (decision.targetStatus) {
      await ensureItemAndSetStatus(
        projectToken,
        project,
        issueState,
        decision.targetStatus
      );
    }
    return;
  }

  if (eventName === 'pull_request') {
    const pr = payload.pull_request;
    if (pr?.head?.repo?.full_name !== repoFullName) {
      console.log('[project-triage] Skipping forked PR.');
      return;
    }
    await processPullRequest({
      eventName: 'pull_request',
      action: payload.action,
      pr,
      owner,
      repo,
      readToken,
      projectToken,
      project,
      codeowners,
      codeownersPatterns,
    });
    return;
  }

  if (eventName === 'pull_request_review') {
    const prSummary = payload.pull_request;
    if (prSummary?.head?.repo?.full_name !== repoFullName) {
      console.log('[project-triage] Skipping review on forked PR.');
      return;
    }
    if (prSummary?.base?.ref !== 'dev' || prSummary?.state !== 'open') {
      return;
    }
    const pr = await githubRest(
      readToken,
      `/repos/${owner}/${repo}/pulls/${prSummary.number}`
    );
    await processPullRequest({
      eventName: 'pull_request_review',
      action: payload.action,
      pr,
      owner,
      repo,
      readToken,
      projectToken,
      project,
      codeowners,
      codeownersPatterns,
    });
    return;
  }

  if (eventName === 'workflow_run') {
    const run = payload.workflow_run;
    if (!run || run.head_repository?.full_name !== repoFullName) {
      console.log('[project-triage] Skipping forked workflow_run.');
      return;
    }
    if (payload.action !== 'completed') return;

    const candidateNums = new Set();
    for (const ref of run.pull_requests ?? []) {
      if (ref?.number) candidateNums.add(ref.number);
    }

    try {
      const commitPrs = await githubRest(
        readToken,
        `/repos/${owner}/${repo}/commits/${run.head_sha}/pulls?per_page=20`
      );
      for (const ref of commitPrs ?? []) {
        if (ref?.number) candidateNums.add(ref.number);
      }
    } catch (err) {
      console.warn(
        `[project-triage] Could not query commit PRs for ${run.head_sha}: ${err.message}`
      );
    }

    for (const prNumber of candidateNums) {
      const pr = await githubRest(
        readToken,
        `/repos/${owner}/${repo}/pulls/${prNumber}`
      );
      if (
        pr.state !== 'open' ||
        pr.base?.ref !== 'dev' ||
        pr.head?.sha !== run.head_sha
      ) {
        continue;
      }
      await processPullRequest({
        eventName: 'workflow_run',
        action: payload.action,
        pr,
        owner,
        repo,
        readToken,
        projectToken,
        project,
        codeowners,
        codeownersPatterns,
      });
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  runCli().catch((err) => {
    console.error(`[project-triage] ${err.stack || err.message}`);
    process.exitCode = 1;
  });
}
