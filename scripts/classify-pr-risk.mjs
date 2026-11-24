#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_CODEOWNERS_PATH = path.join(REPO_ROOT, '.github', 'CODEOWNERS');

const TIER1_EXCLUDED_PATTERNS = [
  /(^|\/)(AGENTS|CLAUDE|GEMINI)\.md$/i,
  /^\.(agents|claude|cursor)\//,
  /^docs\/\.vitepress\//,
];

const TIER1_ALLOWED_PATTERNS = [
  /^docs\//,
  /\.md$/i,
  /\.(png|jpe?g|svg|gif|webp|ico|ttf|otf|woff2?)$/i,
  /(^|\/)__tests__\//,
  /\.(test|spec)\.[cm]?[jt]sx?$/i,
];

export function normalizePath(filePath) {
  return String(filePath)
    .trim()
    .replaceAll('\\', '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

export function parseCodeowners(content) {
  const patterns = [];
  for (const rawLine of String(content).split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const withoutComment = trimmed.replace(/\s+#.*$/, '').trim();
    if (!withoutComment) continue;
    const [pattern] = withoutComment.split(/\s+/);
    if (pattern) patterns.push(pattern);
  }
  return patterns;
}

function escapeRegex(str) {
  return str.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

function codeownersPatternToRegex(rawPattern) {
  const dirOnly = rawPattern.endsWith('/');
  const withoutLeadingSlash = rawPattern.replace(/^\/+/, '');
  const core = dirOnly ? withoutLeadingSlash.slice(0, -1) : withoutLeadingSlash;
  const anchored = rawPattern.startsWith('/') || core.includes('/');

  let regexBody = '';
  for (let i = 0; i < core.length; i += 1) {
    const ch = core[i];
    if (ch === '*') {
      if (core[i + 1] === '*') {
        if (core[i + 2] === '/') {
          regexBody += '(?:.*/)?';
          i += 2;
        } else {
          regexBody += '.*';
          i += 1;
        }
      } else {
        regexBody += '[^/]*';
      }
    } else if (ch === '?') {
      regexBody += '[^/]';
    } else {
      regexBody += escapeRegex(ch);
    }
  }

  const prefix = anchored ? '^' : '(?:^|/)';
  const suffix = dirOnly ? '/.*' : '(?:/.*|$)';
  return new RegExp(`${prefix}${regexBody}${suffix}`);
}

export function matchesCodeownersPattern(filePath, rawPattern) {
  const normalized = normalizePath(filePath);
  if (!normalized) return false;
  return codeownersPatternToRegex(rawPattern).test(normalized);
}

export function isLowRiskFile(filePath) {
  const normalized = normalizePath(filePath);
  if (!normalized) return false;
  if (TIER1_EXCLUDED_PATTERNS.some((re) => re.test(normalized))) {
    return false;
  }
  return TIER1_ALLOWED_PATTERNS.some((re) => re.test(normalized));
}

export function classifyFiles(files, codeownersPatterns) {
  const normalized = [
    ...new Set(files.map(normalizePath).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, 'en'));

  if (normalized.length === 0) {
    return {
      tier: 'medium',
      label: 'risk:medium',
      eligibleForAutoMerge: false,
      matchedHighRisk: [],
      matchedMediumRisk: [],
      totalFiles: 0,
    };
  }

  const matchedHighRisk = normalized.filter((file) =>
    codeownersPatterns.some((pattern) =>
      matchesCodeownersPattern(file, pattern)
    )
  );

  if (matchedHighRisk.length > 0) {
    return {
      tier: 'high',
      label: 'risk:high',
      eligibleForAutoMerge: false,
      matchedHighRisk,
      matchedMediumRisk: [],
      totalFiles: normalized.length,
    };
  }

  const matchedMediumRisk = normalized.filter((file) => !isLowRiskFile(file));

  if (matchedMediumRisk.length > 0) {
    return {
      tier: 'medium',
      label: 'risk:medium',
      eligibleForAutoMerge: false,
      matchedHighRisk: [],
      matchedMediumRisk,
      totalFiles: normalized.length,
    };
  }

  return {
    tier: 'low',
    label: 'risk:low',
    eligibleForAutoMerge: true,
    matchedHighRisk: [],
    matchedMediumRisk: [],
    totalFiles: normalized.length,
  };
}

function runCli() {
  const args = process.argv.slice(2);
  let codeownersPath = DEFAULT_CODEOWNERS_PATH;
  const positionalFiles = [];

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--codeowners') {
      codeownersPath = path.resolve(args[i + 1] ?? '');
      i += 1;
    } else {
      positionalFiles.push(args[i]);
    }
  }

  const codeownersContent = fs.existsSync(codeownersPath)
    ? fs.readFileSync(codeownersPath, 'utf8')
    : '';
  const patterns = parseCodeowners(codeownersContent);

  const rawFiles =
    positionalFiles.length > 0
      ? positionalFiles
      : fs.readFileSync(0, 'utf8').split(/\r?\n/);

  const result = classifyFiles(rawFiles, patterns);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  runCli();
}
