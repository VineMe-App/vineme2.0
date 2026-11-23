#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const BASELINE_PATH = path.join(SCRIPT_DIR, 'mobile-typecheck-baseline.json');
const DIAGNOSTIC_RE = /^(.+?)\(\d+,\d+\): error TS\d+:/;

const updateBaseline = process.argv.includes('--update-baseline');

const result = spawnSync('npm', ['run', 'typecheck:mobile'], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});

if (result.error) {
  console.error(`Failed to run mobile typecheck: ${result.error.message}`);
  process.exit(1);
}

const combinedOutput = [result.stdout ?? '', result.stderr ?? '']
  .filter(Boolean)
  .join('\n');

const currentCounts = new Map();
const diagnosticsByFile = new Map();
let totalErrors = 0;

for (const line of combinedOutput.split(/\r?\n/)) {
  const match = line.match(DIAGNOSTIC_RE);
  if (!match) continue;
  const file = match[1].replaceAll('\\', '/');
  totalErrors += 1;
  currentCounts.set(file, (currentCounts.get(file) ?? 0) + 1);
  if (!diagnosticsByFile.has(file)) {
    diagnosticsByFile.set(file, []);
  }
  diagnosticsByFile.get(file).push(line);
}

if (result.status !== 0 && totalErrors === 0) {
  console.error(combinedOutput.trim() || 'Mobile typecheck failed without TS diagnostics.');
  process.exit(result.status ?? 1);
}

if (updateBaseline) {
  const sorted = Object.fromEntries(
    [...currentCounts.entries()].sort(([a], [b]) => a.localeCompare(b, 'en')),
  );
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  console.log(
    `Updated ${path.relative(REPO_ROOT, BASELINE_PATH)}: ${totalErrors} errors across ${currentCounts.size} files.`,
  );
  process.exit(0);
}

if (!fs.existsSync(BASELINE_PATH)) {
  console.error(
    `Missing baseline file at ${path.relative(REPO_ROOT, BASELINE_PATH)}. Run 'node scripts/typecheck-mobile-gate.mjs --update-baseline' first.`,
  );
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
const regressions = [];

for (const [file, count] of [...currentCounts.entries()].sort(([a], [b]) =>
  a.localeCompare(b, 'en'),
)) {
  const allowed = baseline[file] ?? 0;
  if (count > allowed) {
    regressions.push({ file, count, allowed });
  }
}

if (regressions.length > 0) {
  console.error('Error: mobile typecheck failed with new or increased TypeScript errors:\n');
  for (const { file, count, allowed } of regressions) {
    console.error(`- ${file}: ${count} error(s) (baseline max: ${allowed})`);
    for (const line of diagnosticsByFile.get(file) ?? []) {
      console.error(`  ${line}`);
    }
    console.error('');
  }
  process.exit(1);
}

const baselineTotal = Object.values(baseline).reduce((sum, n) => sum + n, 0);
console.log(
  `Mobile typecheck gate passed: 0 regressions (${totalErrors} pre-existing errors across ${currentCounts.size} files; baseline: ${baselineTotal}).`,
);

if (totalErrors < baselineTotal) {
  console.log(
    `Tip: ${baselineTotal - totalErrors} pre-existing error(s) fixed — run 'node scripts/typecheck-mobile-gate.mjs --update-baseline' to ratchet the baseline down.`,
  );
}
