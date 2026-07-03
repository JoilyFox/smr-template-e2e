/**
 * Shared helpers for the agent hook scripts (the `.agent-hooks/*.mjs` files).
 *
 * These scripts are the portable, agent-agnostic *logic* layer: they're wired into Claude Code via
 * `.claude/settings.json`, into git via `.husky/pre-commit`, and can be reused from CI. They read
 * the hook payload Claude Code pipes on stdin, and emit JSON decisions on stdout (see
 * https://code.claude.com/docs/en/hooks). Zero external dependencies — Node built-ins only, so they
 * run on macOS/Linux/Windows without an install step.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path to the `.agent-hooks` directory (this file lives in `.agent-hooks/lib/`). */
export const HOOKS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Read and parse the hook JSON Claude Code pipes to stdin. Returns `{}` when there's nothing. */
export function readInput() {
  try {
    const raw = readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function readJsonIfPresent(file) {
  try {
    return JSON.parse(readFileSync(join(HOOKS_DIR, file), 'utf8'));
  } catch {
    return undefined;
  }
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
function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Load the effective hook config: the committed `config.json` (team defaults) with the gitignored
 * `config.local.json` (per-developer overrides) deep-merged over it. Either file may be absent.
 * This is the single knob both layers read — the Claude hook scripts and the git-hook dispatchers —
 * so a developer can toggle any hook on/off locally without touching shared, committed settings.
 */
export function loadConfig() {
  const base = readJsonIfPresent('config.json') ?? {};
  const local = readJsonIfPresent('config.local.json');
  return local ? deepMerge(base, local) : base;
}

/**
 * Whether a hook is enabled, per the merged config's top-level `enabled` map. Unlisted hooks default
 * to enabled, so a brand-new hook works without a config edit; a developer opts out by setting
 * `{ "enabled": { "<name>": false } }` in `config.local.json`.
 */
export function isEnabled(name) {
  const enabled = loadConfig().enabled;
  return !isPlainObject(enabled) || enabled[name] !== false;
}

/** Shell-quote a string for use in an `execSync` command (cross-platform-ish, good enough for paths). */
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

/**
 * Files changed in the working tree (staged + unstaged + untracked) as absolute paths — the set the
 * agent touched this session. Used by the Stop-batched typecheck/test hooks.
 */
export function changedFiles(cwd = process.cwd()) {
  const out = git(['status', '--porcelain', '--no-renames'], cwd);
  if (!out) return [];
  return out
    .split('\n')
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .map((p) => resolve(cwd, p));
}

/** Deny a PreToolUse tool call; `reason` is shown to the agent. Exits the process. */
export function denyTool(reason) {
  emit({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  });
}

/** Feed feedback to the agent after an edit (PostToolUse) so it fixes the issue. Exits. */
export function blockPostToolUse(reason) {
  emit({ decision: 'block', reason });
}

/** Ask the agent to keep working after it tried to stop (Stop hook found problems). Exits. */
export function blockStop(reason) {
  emit({ decision: 'block', reason });
}

/** Inject additional context at session start. Exits. */
export function sessionContext(text) {
  emit({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } });
}

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}

/**
 * Tiny glob → RegExp. Supports `**` (any depth, incl. none as a leading segment), `*` (one segment),
 * and `?`. Anchored to the whole (forward-slash) path. Enough for the sensitive-path deny lists.
 */
export function globToRegExp(glob) {
  const g = String(glob).replace(/\\/g, '/');
  let re = '^';
  let i = 0;
  if (g.startsWith('**/')) {
    re += '(?:.*/)?';
    i = 3;
  }
  for (; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        re += '.*';
        i++;
        if (g[i + 1] === '/') i++;
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if ('.+^${}()|[]\\/'.includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  return new RegExp(`${re}$`);
}
