/**
 * Build metadata exposed in DevTools so you can verify the active bundle.
 *
 * The revision counter increments every time the JavaScript bundle is
 * reloaded. Update the `SUMMARY` below whenever you ship a change so it’s
 * obvious which bundle you’re looking at in DevTools.
 */

const GLOBAL_REVISION_KEY = '__VINEME_DEVTOOLS_BUNDLE_REVISION__';

const previousRevision =
  typeof (globalThis as any)[GLOBAL_REVISION_KEY] === 'number'
    ? (globalThis as any)[GLOBAL_REVISION_KEY]
    : 0;

const revision = previousRevision + 1;
// eslint-disable-next-line no-multi-assign
(globalThis as any)[GLOBAL_REVISION_KEY] = revision;

const timestampIso = new Date().toISOString();
const SUMMARY = 'Add DevTools build panel with live bundle metadata';

export interface BuildInfo {
  revision: number;
  summary: string;
  timestampIso: string;
  timestampLocal: string;
}

export const buildInfo: BuildInfo = {
  revision,
  summary: SUMMARY,
  timestampIso,
  timestampLocal: new Date(timestampIso).toLocaleString(),
};

export function describeBuild(): string {
  return `#${buildInfo.revision} · ${buildInfo.timestampLocal} — ${buildInfo.summary}`;
}
