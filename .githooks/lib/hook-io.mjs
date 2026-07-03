/**
 * Shared helpers for the git-hook scripts (the phase scripts under `.githooks/`). Zero external
 * dependencies — Node built-ins only, so they run on macOS/Linux/Windows with no install step.
 *
 * This is the git layer's *own* self-contained foundation: it reads `.githooks/config.json` (the git
 * hooks' committed team defaults) deep-merged with the gitignored `.githooks/config.local.json` (a
 * developer's personal overrides). The agent hooks have a separate, independent foundation under
 * `.agent-hooks/` — the two layers share no files.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path to the `.githooks` directory (this file lives in `.githooks/lib/`). */
export const HOOKS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Shell-quote a string for use in an `execSync` command (good enough for paths). */
export function q(s) {
  return `"${String(s).replace(/(["\\$`])/g, '\\$1')}"`;
}

/** Run a git command, returning trimmed stdout or `''` on any failure. */
export function git(args, cwd = process.cwd()) {
  try {
    return execSync(`git ${args.map(q).join(' ')}`, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function readJsonIfPresent(file) {
  try {
    return JSON.parse(readFileSync(join(HOOKS_DIR, file), 'utf8'));
  } catch {
    return undefined;
  }
}

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Deep-merge `source` over `target` (objects merge recursively; everything else overwrites). */
function deepMerge(target, source) {
  if (!isPlainObject(target) || !isPlainObject(source)) return source;
  const out = { ...target };
  for (const [k, v] of Object.entries(source)) {
    out[k] = isPlainObject(v) && isPlainObject(target[k]) ? deepMerge(target[k], v) : v;
  }
  return out;
}

/**
 * Load the effective git-hook config: committed `.githooks/config.json` (team defaults) with the
 * gitignored `.githooks/config.local.json` (per-developer overrides) deep-merged over it. Either
 * file may be absent.
 */
export function loadConfig() {
  const base = readJsonIfPresent('config.json') ?? {};
  const local = readJsonIfPresent('config.local.json');
  return local ? deepMerge(base, local) : base;
}

/**
 * Whether a git hook is enabled, per the merged config's top-level `enabled` map. Unlisted hooks
 * default to enabled; a developer opts out by setting `{ "enabled": { "<name>": false } }` in
 * `.githooks/config.local.json`.
 */
export function isEnabled(name) {
  const enabled = loadConfig().enabled;
  return !isPlainObject(enabled) || enabled[name] !== false;
}
