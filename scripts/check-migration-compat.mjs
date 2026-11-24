#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const CORE_MOBILE_TABLES = new Set([
  'users',
  'churches',
  'services',
  'groups',
  'group_memberships',
  'group_membership_notes',
  'events',
  'friendships',
  'referrals',
  'notifications',
  'user_notification_settings',
  'user_push_tokens',
  'categories',
  'tickets',
  'feature_flag',
]);

const MIN_OVERRIDE_REASON_LENGTH = 10;
const OVERRIDE_DIRECTIVE_RE = /^allow-breaking-migration\b\s*:?(.*)$/i;
const DOLLAR_TAG_RE = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/;

const IDENT = '(?:"(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_$]*)';
const QUALIFIED_IDENT = `(?:${IDENT}\\s*\\.\\s*)?${IDENT}`;

const DROP_TABLE_RE = /^DROP\s+TABLE\b/i;
const DROP_VIEW_RE = /^DROP\s+(?:MATERIALIZED\s+)?VIEW\b/i;
const DROP_FUNCTION_RE = /^DROP\s+FUNCTION\b/i;
const ALTER_TABLE_HEAD_RE = new RegExp(
  `^ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:ONLY\\s+)?(${QUALIFIED_IDENT})\\s+([\\s\\S]+)$`,
  'i'
);
const ALTER_VIEW_RENAME_RE = new RegExp(
  `^ALTER\\s+(?:MATERIALIZED\\s+)?VIEW\\s+(?:IF\\s+EXISTS\\s+)?${QUALIFIED_IDENT}\\s+RENAME\\s+(?:TO\\b|(?:COLUMN\\s+)?${IDENT}\\s+TO\\b)`,
  'i'
);
const ALTER_FUNCTION_RENAME_RE = /^ALTER\s+FUNCTION\s+[\s\S]*\bRENAME\s+TO\b/i;
const POLICY_STMT_RE = new RegExp(
  `^(?:CREATE|ALTER)\\s+POLICY\\s+${IDENT}\\s+ON\\s+(${QUALIFIED_IDENT})(?=\\s|$)`,
  'i'
);
const DROP_POLICY_STMT_RE = new RegExp(
  `^DROP\\s+POLICY\\s+(?:IF\\s+EXISTS\\s+)?${IDENT}\\s+ON\\s+(${QUALIFIED_IDENT})(?=\\s|$)`,
  'i'
);

const ALTER_CLAUSE_DROP_COLUMN_RE = /^DROP\s+(?!CONSTRAINT\b)/i;
const ALTER_CLAUSE_RENAME_RE = new RegExp(
  `^RENAME\\s+(?:TO\\b|(?:COLUMN\\s+)?(?!CONSTRAINT\\b)${IDENT}\\s+TO\\b)`,
  'i'
);
const ALTER_CLAUSE_TYPE_RE = new RegExp(
  `^ALTER\\s+(?:COLUMN\\s+)?${IDENT}\\s+(?:SET\\s+DATA\\s+)?TYPE\\b`,
  'i'
);
const ALTER_CLAUSE_SET_NOT_NULL_RE = new RegExp(
  `^ALTER\\s+(?:COLUMN\\s+)?${IDENT}\\s+SET\\s+NOT\\s+NULL\\b`,
  'i'
);
const ALTER_CLAUSE_RLS_RE =
  /^(?:ENABLE|DISABLE|(?:NO\s+)?FORCE)\s+ROW\s+LEVEL\s+SECURITY\b/i;
const ALTER_CLAUSE_ADD_CONSTRAINT_RE =
  /^ADD\s+(?:CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|EXCLUDE)\b/i;
const ALTER_CLAUSE_ADD_COLUMN_RE = new RegExp(
  `^ADD\\s+(?:COLUMN\\s+)?(?:IF\\s+NOT\\s+EXISTS\\s+)?${IDENT}\\s+([\\s\\S]+)$`,
  'i'
);

/**
 * Unquotes a SQL identifier and normalizes unquoted identifiers to lowercase.
 */
function normalizeIdentifier(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed.toLowerCase();
}

/**
 * Parses a possibly schema-qualified SQL identifier into { schema, name }.
 */
function parseQualifiedName(raw) {
  let depthInQuotes = false;
  let dotIndex = -1;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      if (raw[i + 1] === '"') {
        i++;
      } else {
        depthInQuotes = !depthInQuotes;
      }
    } else if (ch === '.' && !depthInQuotes) {
      dotIndex = i;
      break;
    }
  }

  if (dotIndex === -1) {
    return { schema: null, name: normalizeIdentifier(raw) };
  }

  return {
    schema: normalizeIdentifier(raw.slice(0, dotIndex)),
    name: normalizeIdentifier(raw.slice(dotIndex + 1)),
  };
}

function isCoreMobileTable(rawTableName) {
  const { schema, name } = parseQualifiedName(rawTableName);
  if (schema !== null && schema !== 'public') {
    return false;
  }
  return CORE_MOBILE_TABLES.has(name);
}

/**
 * Splits top-level comma-separated clauses inside an ALTER TABLE body,
 * ignoring commas nested inside parentheses or quoted identifiers.
 */
function splitTopLevelCommas(body) {
  const clauses = [];
  let parenDepth = 0;
  let inDoubleQuotes = false;
  let start = 0;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '"') {
      if (body[i + 1] === '"') {
        i++;
      } else {
        inDoubleQuotes = !inDoubleQuotes;
      }
      continue;
    }
    if (inDoubleQuotes) continue;

    if (ch === '(') {
      parenDepth++;
    } else if (ch === ')' && parenDepth > 0) {
      parenDepth--;
    } else if (ch === ',' && parenDepth === 0) {
      const part = body.slice(start, i).trim();
      if (part) clauses.push(part);
      start = i + 1;
    }
  }

  const tail = body.slice(start).trim();
  if (tail) clauses.push(tail);
  return clauses;
}

/**
 * Inspects a list of preceding `-- ...` comment entries for override directives.
 */
function parseOverrideComments(comments) {
  let validOverride = null;
  const invalidOverrides = [];

  for (const comment of comments) {
    const match = comment.text.trim().match(OVERRIDE_DIRECTIVE_RE);
    if (!match) continue;
    const reason = match[1].trim();
    if (reason.length >= MIN_OVERRIDE_REASON_LENGTH) {
      validOverride = { reason, line: comment.line };
    } else {
      invalidOverrides.push({ reason, line: comment.line });
    }
  }

  return { validOverride, invalidOverrides };
}

/**
 * Splits a SQL script into individual statements using a Postgres-aware lexer.
 * Strips comments and literal contents (`'...'`, `$tag$...$tag$`) from `sql`
 * while preserving newlines, line numbers, and `"..."` identifiers.
 *
 * @param {string} sql
 * @returns {Array<{
 *   sql: string,
 *   raw: string,
 *   line: number,
 *   override: { reason: string, line: number } | null,
 *   invalidOverrides: Array<{ reason: string, line: number }>
 * }>}
 */
export function extractStatements(sql) {
  const statements = [];
  let line = 1;
  let prevStmtEndLine = 0;

  let hasSqlToken = false;
  let stmtLine = 1;
  let rawBuf = '';
  let sanitizedBuf = '';
  let leadingComments = [];

  const pushBoth = (ch) => {
    rawBuf += ch;
    sanitizedBuf += ch;
  };

  const pushMasked = (ch) => {
    rawBuf += ch;
    sanitizedBuf += ch === '\n' ? '\n' : ' ';
  };

  const finalizeStatement = () => {
    if (hasSqlToken) {
      const { validOverride, invalidOverrides } =
        parseOverrideComments(leadingComments);
      statements.push({
        sql: sanitizedBuf.trim(),
        raw: rawBuf.trim(),
        line: stmtLine,
        override: validOverride,
        invalidOverrides,
      });
    }
    hasSqlToken = false;
    rawBuf = '';
    sanitizedBuf = '';
    leadingComments = [];
    prevStmtEndLine = line;
  };

  for (let i = 0; i < sql.length; ) {
    const ch = sql[i];
    const next = sql[i + 1];

    // Line comment: -- ...
    if (ch === '-' && next === '-') {
      const commentLine = line;
      let commentBody = '';
      if (hasSqlToken) {
        pushMasked(ch);
        pushMasked(next);
      }
      i += 2;
      while (i < sql.length && sql[i] !== '\n') {
        commentBody += sql[i];
        if (hasSqlToken) pushMasked(sql[i]);
        i++;
      }
      if (!hasSqlToken && commentLine > prevStmtEndLine) {
        leadingComments.push({ text: commentBody, line: commentLine });
      }
      continue;
    }

    // Block comment: /* ... */ (supports Postgres nesting)
    if (ch === '/' && next === '*') {
      let depth = 1;
      if (hasSqlToken) {
        pushMasked(ch);
        pushMasked(next);
      }
      i += 2;
      while (i < sql.length && depth > 0) {
        if (sql[i] === '/' && sql[i + 1] === '*') {
          depth++;
          if (hasSqlToken) {
            pushMasked('/');
            pushMasked('*');
          }
          i += 2;
          continue;
        }
        if (sql[i] === '*' && sql[i + 1] === '/') {
          depth--;
          if (hasSqlToken) {
            pushMasked('*');
            pushMasked('/');
          }
          i += 2;
          continue;
        }
        if (sql[i] === '\n') line++;
        if (hasSqlToken) pushMasked(sql[i]);
        i++;
      }
      continue;
    }

    // Single-quoted string literal (including E'...' escape syntax)
    if (ch === "'") {
      if (!hasSqlToken) {
        hasSqlToken = true;
        stmtLine = line;
      }
      const prevChar = i > 0 ? sql[i - 1] : '';
      const prevPrevChar = i > 1 ? sql[i - 2] : '';
      const isEscapeString =
        (prevChar === 'E' || prevChar === 'e') &&
        !/[A-Za-z0-9_$]/.test(prevPrevChar);

      pushBoth("'");
      i++;
      while (i < sql.length) {
        const c = sql[i];
        if (c === '\n') line++;
        if (isEscapeString && c === '\\' && i + 1 < sql.length) {
          pushMasked(c);
          const escaped = sql[i + 1];
          if (escaped === '\n') line++;
          pushMasked(escaped);
          i += 2;
          continue;
        }
        if (c === "'") {
          if (sql[i + 1] === "'") {
            pushMasked("'");
            pushMasked("'");
            i += 2;
            continue;
          }
          pushBoth("'");
          i++;
          break;
        }
        pushMasked(c);
        i++;
      }
      continue;
    }

    // Double-quoted identifier: "..."
    if (ch === '"') {
      if (!hasSqlToken) {
        hasSqlToken = true;
        stmtLine = line;
      }
      pushBoth('"');
      i++;
      while (i < sql.length) {
        const c = sql[i];
        if (c === '\n') line++;
        pushBoth(c);
        i++;
        if (c === '"') {
          if (sql[i] === '"') {
            pushBoth('"');
            i++;
            continue;
          }
          break;
        }
      }
      continue;
    }

    // Dollar-quoted string literal: $tag$...$tag$
    if (ch === '$') {
      const tagMatch = sql.slice(i).match(DOLLAR_TAG_RE);
      if (tagMatch) {
        const tag = tagMatch[0];
        if (!hasSqlToken) {
          hasSqlToken = true;
          stmtLine = line;
        }
        for (const t of tag) pushBoth(t);
        i += tag.length;

        const closeIdx = sql.indexOf(tag, i);
        if (closeIdx === -1) {
          while (i < sql.length) {
            if (sql[i] === '\n') line++;
            pushMasked(sql[i]);
            i++;
          }
        } else {
          while (i < closeIdx) {
            if (sql[i] === '\n') line++;
            pushMasked(sql[i]);
            i++;
          }
          for (const t of tag) pushBoth(t);
          i += tag.length;
        }
        continue;
      }
    }

    // Statement terminator
    if (ch === ';') {
      if (hasSqlToken) {
        rawBuf += ';';
      }
      finalizeStatement();
      i++;
      continue;
    }

    // Whitespace
    if (/\s/.test(ch)) {
      if (ch === '\n') line++;
      if (hasSqlToken) {
        pushBoth(ch);
      }
      i++;
      continue;
    }

    // Normal SQL token character
    if (!hasSqlToken) {
      hasSqlToken = true;
      stmtLine = line;
    }
    pushBoth(ch);
    i++;
  }

  finalizeStatement();
  return statements;
}

/**
 * Inspects a single extracted SQL statement against the 9 breaking-change rules.
 */
function inspectStatement(stmt) {
  const normalized = stmt.sql.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const findings = [];

  if (DROP_TABLE_RE.test(normalized)) {
    findings.push({
      rule: 'drop-table',
      message:
        'Dropping an existing table breaks older live mobile clients that still read or write it.',
    });
  }

  if (DROP_VIEW_RE.test(normalized)) {
    findings.push({
      rule: 'drop-view',
      message:
        'Dropping a database view breaks live clients or dashboard queries that depend on it.',
    });
  }

  if (DROP_FUNCTION_RE.test(normalized)) {
    findings.push({
      rule: 'drop-function',
      message:
        'Dropping an RPC function breaks older mobile clients that still call it.',
    });
  }

  if (
    ALTER_VIEW_RENAME_RE.test(normalized) ||
    ALTER_FUNCTION_RENAME_RE.test(normalized)
  ) {
    findings.push({
      rule: 'rename-object',
      message:
        'Renaming a view, function, or view column breaks older live mobile clients.',
    });
  }

  const policyMatch =
    normalized.match(POLICY_STMT_RE) || normalized.match(DROP_POLICY_STMT_RE);
  if (policyMatch && isCoreMobileTable(policyMatch[1])) {
    findings.push({
      rule: 'modify-core-rls-policy',
      message: `Modifying an RLS policy on core mobile table "${parseQualifiedName(policyMatch[1]).name}" can break live mobile access.`,
    });
  }

  const alterTableMatch = normalized.match(ALTER_TABLE_HEAD_RE);
  if (alterTableMatch) {
    const rawTableName = alterTableMatch[1];
    const body = alterTableMatch[2];
    const clauses = splitTopLevelCommas(body);

    for (const clause of clauses) {
      if (ALTER_CLAUSE_DROP_COLUMN_RE.test(clause)) {
        findings.push({
          rule: 'drop-column',
          message:
            'Dropping a column breaks older mobile clients whose SELECT/INSERT/UPDATE queries still reference it.',
        });
      }

      if (ALTER_CLAUSE_RENAME_RE.test(clause)) {
        findings.push({
          rule: 'rename-object',
          message:
            'Renaming a table or column breaks older live mobile clients.',
        });
      }

      if (ALTER_CLAUSE_TYPE_RE.test(clause)) {
        findings.push({
          rule: 'alter-column-type',
          message:
            'Changing a column type can break deserialization or writes in older mobile clients.',
        });
      }

      if (ALTER_CLAUSE_SET_NOT_NULL_RE.test(clause)) {
        findings.push({
          rule: 'set-not-null',
          message:
            'Adding SET NOT NULL breaks older mobile clients that still insert or update NULL values.',
        });
      }

      if (
        !ALTER_CLAUSE_ADD_CONSTRAINT_RE.test(clause) &&
        ALTER_CLAUSE_ADD_COLUMN_RE.test(clause)
      ) {
        const colMatch = clause.match(ALTER_CLAUSE_ADD_COLUMN_RE);
        const colRest = colMatch ? colMatch[1] : '';
        const hasNotNull = /\bNOT\s+NULL\b/i.test(colRest);
        const hasDefaultOrGenerated =
          /\bDEFAULT\b/i.test(colRest) ||
          /\bGENERATED\s+(?:ALWAYS|BY\s+DEFAULT)\s+AS\b/i.test(colRest);

        if (hasNotNull && !hasDefaultOrGenerated) {
          findings.push({
            rule: 'add-not-null-no-default',
            message:
              'Adding a NOT NULL column without a DEFAULT fails inserts from older mobile clients that omit the column.',
          });
        }
      }

      if (ALTER_CLAUSE_RLS_RE.test(clause) && isCoreMobileTable(rawTableName)) {
        findings.push({
          rule: 'modify-core-rls-policy',
          message: `Changing RLS enforcement on core mobile table "${parseQualifiedName(rawTableName).name}" can break live mobile access.`,
        });
      }
    }
  }

  return findings;
}

/**
 * Checks a single migration SQL string for breaking schema/RLS changes.
 *
 * @param {string} sql
 * @param {string} [filePath='migration.sql']
 * @returns {{
 *   ok: boolean,
 *   file: string,
 *   violations: Array<{ file: string, line: number, rule: string, message: string, statement: string }>,
 *   overrides: Array<{ file: string, line: number, reason: string, rules: string[] }>,
 *   invalidOverrides: Array<{ file: string, line: number, reason: string }>
 * }}
 */
export function checkMigrationSql(sql, filePath = 'migration.sql') {
  const statements = extractStatements(sql);
  const violations = [];
  const overrides = [];
  const invalidOverrides = [];

  for (const stmt of statements) {
    for (const bad of stmt.invalidOverrides) {
      invalidOverrides.push({
        file: filePath,
        line: bad.line,
        reason: bad.reason,
      });
    }
  }

  const fileHeaderOverride =
    statements.length > 0 ? statements[0].override : null;
  const headerOverriddenRules = [];

  for (let idx = 0; idx < statements.length; idx++) {
    const stmt = statements[idx];
    const findings = inspectStatement(stmt);
    if (findings.length === 0) continue;

    const stmtOverride =
      idx > 0 && stmt.override ? stmt.override : fileHeaderOverride;

    if (stmtOverride) {
      if (stmtOverride === fileHeaderOverride) {
        for (const f of findings) {
          headerOverriddenRules.push(f.rule);
        }
      } else {
        overrides.push({
          file: filePath,
          line: stmtOverride.line,
          reason: stmtOverride.reason,
          rules: findings.map((f) => f.rule),
        });
      }
      continue;
    }

    for (const finding of findings) {
      violations.push({
        file: filePath,
        line: stmt.line,
        rule: finding.rule,
        message: finding.message,
        statement: stmt.raw,
      });
    }
  }

  if (fileHeaderOverride && headerOverriddenRules.length > 0) {
    overrides.unshift({
      file: filePath,
      line: fileHeaderOverride.line,
      reason: fileHeaderOverride.reason,
      rules: headerOverriddenRules,
    });
  }

  return {
    ok: violations.length === 0,
    file: filePath,
    violations,
    overrides,
    invalidOverrides,
  };
}

/**
 * Checks a list of file paths (non-`.sql` paths are ignored).
 *
 * @param {string[]} filePaths
 */
export function checkMigrationFiles(filePaths) {
  const checkedFiles = [];
  const violations = [];
  const overrides = [];
  const invalidOverrides = [];

  for (const rawPath of filePaths) {
    const trimmed = rawPath.trim();
    if (!trimmed || !/\.sql$/i.test(trimmed)) {
      continue;
    }
    const sql = fs.readFileSync(trimmed, 'utf8');
    const result = checkMigrationSql(sql, trimmed);
    checkedFiles.push(trimmed);
    violations.push(...result.violations);
    overrides.push(...result.overrides);
    invalidOverrides.push(...result.invalidOverrides);
  }

  return {
    ok: violations.length === 0,
    checkedFiles,
    violations,
    overrides,
    invalidOverrides,
  };
}

function readCliInputs() {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  if (args.length > 0) {
    return args;
  }
  if (!process.stdin.isTTY) {
    const stdinText = fs.readFileSync(0, 'utf8');
    return stdinText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

function main() {
  const inputPaths = readCliInputs();
  const result = checkMigrationFiles(inputPaths);

  for (const ov of result.overrides) {
    console.log(
      `[override] ${ov.file}:${ov.line} (${ov.rules.join(', ')}): ${ov.reason}`
    );
  }

  for (const bad of result.invalidOverrides) {
    console.warn(
      `[ignored-override] ${bad.file}:${bad.line} Reason must be at least ${MIN_OVERRIDE_REASON_LENGTH} non-whitespace characters.`
    );
  }

  if (!result.ok) {
    for (const v of result.violations) {
      console.error(`[breaking] ${v.file}:${v.line} [${v.rule}] ${v.message}`);
    }
    console.error(
      '\nMigration compatibility check failed.\n' +
        'Because mobile clients stay live across app-store rollout windows, use the Expand -> Migrate -> Contract pattern (see CONTRIBUTING.md).\n' +
        'If this is an intentional Contract-phase or verified-safe change, add:\n' +
        `  -- allow-breaking-migration: <clear reason of at least ${MIN_OVERRIDE_REASON_LENGTH} characters>`
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Migration compatibility check passed (${result.checkedFiles.length} SQL file(s) checked).`
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main();
}
