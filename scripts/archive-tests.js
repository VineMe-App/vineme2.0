#!/usr/bin/env node
/*
  Archives test files into `archived-tests/` preserving their original structure.
  - Moves any `__tests__` directories under `src/`
  - Moves any files matching `*.test.*` or `*.spec.*` under `src/`
*/

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const ARCHIVE_ROOT = path.join(ROOT, 'archived-tests');

function isTestFile(filePath) {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filePath);
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function pathExists(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

async function* walk(dir) {
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (e) {
    // Directory may have been moved/removed between scans
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield { type: 'dir', path: full, name: entry.name };
      yield* walk(full);
    } else if (entry.isFile()) {
      yield { type: 'file', path: full, name: entry.name };
    }
  }
}

async function movePath(srcPath, destPath) {
  const destDir = path.dirname(destPath);
  await ensureDir(destDir);
  // If destination exists, skip to avoid accidental overwrite
  if (await pathExists(destPath)) {
    console.warn(`[skip] exists: ${path.relative(ROOT, destPath)}`);
    return false;
  }
  await fsp.rename(srcPath, destPath);
  console.log(`[moved] ${path.relative(ROOT, srcPath)} -> ${path.relative(ROOT, destPath)}`);
  return true;
}

(async () => {
  if (!(await pathExists(SRC))) {
    console.error('No src/ directory found. Nothing to archive.');
    process.exit(0);
  }

  let movedCount = 0;

  // Collect all __tests__ directories first
  const testDirs = [];
  for await (const entry of walk(SRC)) {
    if (entry.type === 'dir' && entry.name === '__tests__') {
      testDirs.push(entry.path);
    }
  }
  // Sort longest first to move deepest paths first
  testDirs.sort((a, b) => b.length - a.length);
  for (const dirPath of testDirs) {
    const rel = path.relative(ROOT, dirPath);
    const dest = path.join(ARCHIVE_ROOT, rel);
    await ensureDir(path.dirname(dest));
    try {
      const ok = await movePath(dirPath, dest);
      if (ok) movedCount++;
    } catch (err) {
      console.error(`[error] moving dir ${rel}:`, err.message);
    }
  }

  // Now move individual test files under src
  for await (const entry of walk(SRC)) {
    if (entry.type === 'file' && isTestFile(entry.name)) {
      const rel = path.relative(ROOT, entry.path);
      const dest = path.join(ARCHIVE_ROOT, rel);
      try {
        const ok = await movePath(entry.path, dest);
        if (ok) movedCount++;
      } catch (err) {
        console.error(`[error] moving file ${rel}:`, err.message);
      }
    }
  }

  if (movedCount === 0) {
    console.log('No test files or directories found to archive.');
  } else {
    console.log(`Done. Archived ${movedCount} item(s) into ${path.relative(ROOT, ARCHIVE_ROOT)}/`);
  }
})();
