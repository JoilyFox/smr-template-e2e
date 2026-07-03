/**
 * pre-commit: format + lint-fix the staged code files, then re-stage them, so every commit is tidy.
 * Best-effort — it never blocks the commit (its job is to fix, not to gate); the gating checks are
 * secrets (pre-commit) and typecheck/test/build (pre-push).
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { git, q } from '../lib/hook-io.mjs';

const cwd = process.cwd();
const staged = git(['diff', '--cached', '--name-only', '--diff-filter=ACM'], cwd)
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean);

const code = staged.filter(
  (f) => /\.(ts|tsx|js|jsx|json|md|ya?ml|css|scss|html)$/.test(f) && existsSync(join(cwd, f)),
);
if (!code.length) process.exit(0);

const lintable = code.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));
const runQuiet = (cmd) => {
  try {
    execSync(cmd, { cwd, stdio: 'ignore' });
  } catch {
    /* best-effort — formatting/lint-fix must never break the commit */
  }
};

runQuiet(`npx prettier --write ${code.map(q).join(' ')}`);
if (lintable.length) runQuiet(`npx eslint --fix ${lintable.map(q).join(' ')}`);
runQuiet(`git add ${code.map(q).join(' ')}`); // re-stage the tidied files
process.exit(0);
