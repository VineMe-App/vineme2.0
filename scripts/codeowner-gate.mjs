#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { classifyFiles, parseCodeowners } from './classify-pr-risk.mjs';
import { parseCodeownersLogins } from './project-triage.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_CODEOWNERS_PATH = path.join(REPO_ROOT, '.github', 'CODEOWNERS');

/**
 * Evaluates whether a pull request satisfies the Code Owner policy:
 * - Non-high-risk PRs (`tier !== 'high'`) pass without Code Owner review.
 * - High-risk PRs authored by a listed Code Owner pass automatically.
 * - High-risk PRs authored by anyone else require a fresh `APPROVED` review
 *   from at least one non-author Code Owner on `headSha`, with no active
 *   `CHANGES_REQUESTED` reviews.
 *
 * @param {{
 *   changedFiles: string[],
 *   prAuthor?: string | null,
 *   reviews?: Array<{ user?: { login?: string }, state?: string, commit_id?: string | null }>,
 *   headSha?: string | null,
 *   codeownersContent: string
 * }} params
 * @returns {{
 *   passed: boolean,
 *   conclusion: 'success' | 'failure',
 *   tier: 'low' | 'medium' | 'high',
 *   authorIsCodeOwner: boolean,
 *   matchedHighRisk: string[],
 *   title: string,
 *   summary: string
 * }}
 */
export function evaluateCodeownerGate({
  changedFiles,
  prAuthor,
  reviews = [],
  headSha = null,
  codeownersContent,
}) {
  const patterns = parseCodeowners(codeownersContent);
  const classification = classifyFiles(changedFiles, patterns);
  const codeowners = parseCodeownersLogins(codeownersContent);
  const authorLower = prAuthor ? String(prAuthor).trim().toLowerCase() : '';
  const authorIsCodeOwner = Boolean(authorLower && codeowners.has(authorLower));

  if (classification.tier !== 'high') {
    return {
      passed: true,
      conclusion: 'success',
      tier: classification.tier,
      authorIsCodeOwner,
      matchedHighRisk: [],
      title: 'No Code Owner review required',
      summary: `Risk tier is \`${classification.label}\`; no paths in \`.github/CODEOWNERS\` were modified.`,
    };
  }

  const ownersList = Array.from(codeowners)
    .map((u) => `@${u}`)
    .join(' or ');

  if (authorIsCodeOwner) {
    return {
      passed: true,
      conclusion: 'success',
      tier: 'high',
      authorIsCodeOwner: true,
      matchedHighRisk: classification.matchedHighRisk,
      title: 'Authored by Code Owner',
      summary: `PR author \`@${authorLower}\` is a listed Code Owner, so no extra Code Owner review is required for these \`${classification.matchedHighRisk.length}\` high-risk path(s).`,
    };
  }

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
      latestByReviewer.set(login, {
        state,
        commitId: review?.commit_id ?? null,
      });
    }
  }

  let hasChangesRequested = false;
  let freshApprovedByCodeOwner = false;
  let staleApprovedByCodeOwner = false;

  for (const [login, entry] of latestByReviewer.entries()) {
    if (entry.state === 'CHANGES_REQUESTED') {
      hasChangesRequested = true;
    } else if (entry.state === 'APPROVED' && codeowners.has(login)) {
      const matchesHead = !headSha || entry.commitId === headSha;
      if (matchesHead) {
        freshApprovedByCodeOwner = true;
      } else {
        staleApprovedByCodeOwner = true;
      }
    }
  }

  if (!hasChangesRequested && freshApprovedByCodeOwner) {
    return {
      passed: true,
      conclusion: 'success',
      tier: 'high',
      authorIsCodeOwner: false,
      matchedHighRisk: classification.matchedHighRisk,
      title: 'Code Owner approved',
      summary: `A Code Owner (${ownersList}) approved the latest commit on this high-risk PR.`,
    };
  }

  const reasons = [];
  if (hasChangesRequested) {
    reasons.push('An active **Changes Requested** review must be addressed.');
  }
  if (!freshApprovedByCodeOwner) {
    if (staleApprovedByCodeOwner) {
      reasons.push(
        `A previous Code Owner approval was made before new commits were pushed; fresh approval from ${ownersList} on commit \`${headSha}\` is required.`
      );
    } else {
      reasons.push(
        `Requires an **Approve** review from ${ownersList} because this PR modifies high-risk path(s) in \`.github/CODEOWNERS\`.`
      );
    }
  }

  const fileList = classification.matchedHighRisk
    .slice(0, 15)
    .map((f) => `- \`${f}\``)
    .join('\n');

  return {
    passed: false,
    conclusion: 'failure',
    tier: 'high',
    authorIsCodeOwner: false,
    matchedHighRisk: classification.matchedHighRisk,
    title: 'Code Owner approval required',
    summary: `${reasons.join('\n')}\n\n**Matched high-risk paths:**\n${fileList}`,
  };
}

async function githubRequest(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'vineme-codeowner-gate',
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

async function fetchPaginated(apiPathBase, token) {
  const results = [];
  let page = 1;
  while (true) {
    const sep = apiPathBase.includes('?') ? '&' : '?';
    const items = await githubRequest(
      `https://api.github.com${apiPathBase}${sep}per_page=100&page=${page}`,
      token
    );
    if (!Array.isArray(items) || items.length === 0) break;
    results.push(...items);
    if (items.length < 100) break;
    page += 1;
  }
  return results;
}

async function runCli() {
  const token = process.env.GITHUB_TOKEN?.trim();
  const eventName = process.env.GITHUB_EVENT_NAME;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const repoFullName = process.env.GITHUB_REPOSITORY || 'VineMe-App/vineme2.0';
  const [owner, repo] = repoFullName.split('/');

  if (!token || !eventName || !eventPath || !owner || !repo) {
    console.error('[codeowner-gate] Missing required GitHub Actions env vars.');
    process.exitCode = 1;
    return;
  }

  const payload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const prSummary = payload.pull_request;
  if (!prSummary?.number) {
    console.log('[codeowner-gate] No pull_request in payload; skipping.');
    return;
  }

  if (prSummary.head?.repo?.full_name !== repoFullName) {
    console.log('[codeowner-gate] Skipping forked PR.');
    return;
  }

  const pr = await githubRequest(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prSummary.number}`,
    token
  );

  if (pr.state !== 'open') {
    console.log(`[codeowner-gate] PR #${pr.number} is ${pr.state}; skipping.`);
    return;
  }

  if (pr.base?.ref !== 'dev' && pr.base?.ref !== 'main') {
    console.log(
      `[codeowner-gate] PR #${pr.number} targets "${pr.base?.ref}", skipping.`
    );
    return;
  }

  const codeownersContent = fs.existsSync(DEFAULT_CODEOWNERS_PATH)
    ? fs.readFileSync(DEFAULT_CODEOWNERS_PATH, 'utf8')
    : '';

  const [filesData, reviewsData] = await Promise.all([
    fetchPaginated(`/repos/${owner}/${repo}/pulls/${pr.number}/files`, token),
    fetchPaginated(`/repos/${owner}/${repo}/pulls/${pr.number}/reviews`, token),
  ]);

  const changedFiles = filesData.map((f) => f?.filename).filter(Boolean);

  const result = evaluateCodeownerGate({
    changedFiles,
    prAuthor: pr.user?.login,
    reviews: reviewsData,
    headSha: pr.head?.sha,
    codeownersContent,
  });

  await githubRequest(
    `https://api.github.com/repos/${owner}/${repo}/check-runs`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'codeowner-gate',
        head_sha: pr.head.sha,
        status: 'completed',
        conclusion: result.conclusion,
        output: {
          title: result.title,
          summary: result.summary,
        },
      }),
    }
  );

  console.log(
    `[codeowner-gate] PR #${pr.number} (${pr.head.sha.slice(0, 7)}): ${result.conclusion} — ${result.title}`
  );

  if (
    eventName === 'pull_request_target' &&
    payload.action === 'opened' &&
    result.tier === 'high' &&
    result.authorIsCodeOwner
  ) {
    try {
      const codeowners = parseCodeownersLogins(codeownersContent);
      const codeownersToRemove = (pr.requested_reviewers ?? [])
        .map((r) => r?.login)
        .filter((login) => login && codeowners.has(login.toLowerCase()));

      if (codeownersToRemove.length > 0) {
        await githubRequest(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}/requested_reviewers`,
          token,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reviewers: codeownersToRemove }),
          }
        );
        console.log(
          `[codeowner-gate] Removed auto-requested Code Owner reviewers (${codeownersToRemove.join(', ')}) because author is a Code Owner.`
        );
      }
    } catch (err) {
      console.warn(
        `[codeowner-gate] Non-fatal: could not clear auto-requested Code Owner reviewers: ${err.message}`
      );
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  runCli().catch((err) => {
    console.error(`[codeowner-gate] ${err.stack || err.message}`);
    process.exitCode = 1;
  });
}
