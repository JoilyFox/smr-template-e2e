/**
 * Git-hook phase dispatcher (run by `.husky/pre-commit`, `.husky/pre-push`, `.husky/commit-msg`).
 *
 * Each git hook invokes `node .githooks/run-phase.mjs <phase> [args…]`. This runs every check
 * script installed for that phase — i.e. every `.githooks/<phase>/*.mjs` present, which is exactly
 * the set of checks selected at generation time (zero-trace: an unselected check ships no script, so
 * it never runs). A check is skipped when disabled in config (`enabled.<check-name>`), letting a dev
 * turn it off locally via `.githooks/config.local.json` without editing the committed hook.
 *
 * All checks in the phase run even if an earlier one fails, so you see every problem at once; the
 * dispatcher exits non-zero if any failed. Bypass in a pinch with `git commit --no-verify` /
 * `git push --no-verify`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { isEnabled } from './lib/hook-io.mjs';

const HOOKS = dirname(fileURLToPath(import.meta.url));
const phase = process.argv[2];
const forwarded = process.argv.slice(3); // e.g. the commit-message file path for commit-msg

if (!phase) {
  process.stderr.write('run-phase: missing phase argument\n');
  process.exit(2);
}

const phaseDir = join(HOOKS, phase);
if (!existsSync(phaseDir)) process.exit(0); // no checks installed for this phase

const scripts = readdirSync(phaseDir)
  .filter((f) => f.endsWith('.mjs'))
  .sort();

let failed = false;
for (const file of scripts) {
  const name = basename(file, '.mjs');
  if (!isEnabled(name)) continue; // turned off in config.local.json / config.json
  process.stdout.write(`▶ ${phase}: ${name}\n`);
  try {
    execFileSync('node', [join(phaseDir, file), ...forwarded], { cwd: process.cwd(), stdio: 'inherit' });
  } catch {
    failed = true;
    process.stderr.write(`✗ ${name} failed\n`);
  }
}

if (failed) {
  process.stderr.write(
    `\n${phase} checks failed. Fix the issues above, or bypass once with \`--no-verify\`.\n`,
  );
  process.exit(1);
}
