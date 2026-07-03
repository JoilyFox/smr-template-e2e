/**
 * pre-push: run the project's test suite (Jest or Vitest, auto-detected) before pushing, so failing
 * tests never reach the remote. Blocks the push on failure.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const cwd = process.cwd();
function readPkg() {
  try {
    return JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
  } catch {
    return {};
  }
}
const pkg = readPkg();
const dep = (name) =>
  Boolean((pkg.dependencies && pkg.dependencies[name]) || (pkg.devDependencies && pkg.devDependencies[name]));

const cmd = dep('vitest') ? 'npx vitest run' : 'npx jest --passWithNoTests';
try {
  execSync(cmd, { cwd, stdio: 'inherit' });
  process.exit(0);
} catch {
  process.stderr.write('\nTests failed — fix them before pushing.\n');
  process.exit(1);
}
