/**
 * pre-push: run the production build so a broken build never reaches the remote. Uses the app's own
 * build script (`npm run build` by default). Configure the script name via config.json → build.script.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../lib/hook-io.mjs';

const cwd = process.cwd();
const script = loadConfig().build?.script ?? 'build';
const pkg = (() => {
  try {
    return JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
  } catch {
    return {};
  }
})();
if (!pkg.scripts || !pkg.scripts[script]) process.exit(0); // no build script → nothing to do

try {
  execSync(`npm run ${script}`, { cwd, stdio: 'inherit' });
  process.exit(0);
} catch {
  process.stderr.write(`\nBuild (\`npm run ${script}\`) failed — fix it before pushing.\n`);
  process.exit(1);
}
