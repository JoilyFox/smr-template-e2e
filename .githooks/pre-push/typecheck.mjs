/**
 * pre-push: whole-project `tsc --noEmit`. Runs once before you push (not per-commit, not per-edit),
 * so type errors never reach the remote. Configure the tsconfig via config.json → typecheck.tsconfig.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../lib/hook-io.mjs';

const cwd = process.cwd();
const tsconfig = loadConfig().typecheck?.tsconfig ?? 'tsconfig.json';
if (!existsSync(join(cwd, tsconfig))) process.exit(0); // not a TS project → nothing to check

try {
  execSync(`npx tsc --noEmit -p ${tsconfig}`, { cwd, stdio: 'inherit' });
  process.exit(0);
} catch {
  process.stderr.write('\nType errors above — fix them before pushing.\n');
  process.exit(1);
}
