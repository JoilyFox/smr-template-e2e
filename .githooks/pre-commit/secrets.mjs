/**
 * pre-commit: authoritative secret scan of the staged diff via gitleaks (`gitleaks protect
 * --staged`). Blocks the commit when a secret is found. Complements the agent-side `secrets` hook by
 * catching secrets from ANY source — other tools, teammates, merges — not just the AI agent.
 */
import { execSync } from 'node:child_process';
import { loadConfig } from '../lib/hook-io.mjs';

const cfg = loadConfig().secrets ?? {};

function hasGitleaks() {
  try {
    execSync('gitleaks version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!hasGitleaks()) {
  const msg = 'gitleaks not installed. Install it for staged secret scanning: https://github.com/gitleaks/gitleaks\n';
  if (cfg.failIfGitleaksMissing) {
    process.stderr.write(msg);
    process.exit(1);
  }
  process.stderr.write(`(skipped) ${msg}`);
  process.exit(0);
}

try {
  execSync('gitleaks protect --staged --no-banner --redact', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, NO_COLOR: '1' },
  });
  process.exit(0);
} catch (err) {
  // gitleaks exit code 1 = leaks found; anything else = gitleaks itself errored → don't block.
  if (err && err.status === 1) {
    process.stderr.write(
      '\ngitleaks found a secret in the staged changes (above). Remove it and read the value from ' +
        'the environment (ConfigService / .env) instead.\n',
    );
    process.exit(1);
  }
  process.exit(0);
}
