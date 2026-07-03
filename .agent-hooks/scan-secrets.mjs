/**
 * PostToolUse (Edit|Write|MultiEdit): scan the file the agent just wrote for hardcoded secrets, so a
 * leaked token/key/password is caught before it can be committed. Content-based — complements the
 * `guard` hook, which blocks by path.
 *
 * Uses gitleaks when installed (authoritative); otherwise falls back to a small high-confidence regex
 * set (configurable via `.agent-hooks/config.json` → `secrets`). Only *blocks* when a secret is
 * actually found — a missing gitleaks binary never breaks the loop.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { readInput, loadConfig, isEnabled, blockPostToolUse, q } from './lib/hook-io.mjs';

if (!isEnabled('secrets')) process.exit(0); // disabled locally via .agent-hooks/config.local.json

const input = readInput();
const cfg = loadConfig().secrets ?? {};
const filePath = input?.tool_input?.file_path;
if (!filePath || !existsSync(filePath)) process.exit(0);

function hasGitleaks() {
  try {
    execSync('gitleaks version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (hasGitleaks()) {
  try {
    execSync(`gitleaks detect --no-git --no-banner --redact --source ${q(filePath)}`, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NO_COLOR: '1' },
    });
    process.exit(0); // exit 0 → no leaks
  } catch (err) {
    // gitleaks exit code 1 = leaks found; anything else = gitleaks itself errored → soft-skip.
    if (err && err.status === 1) {
      const out = `${err.stdout ?? ''}${err.stderr ?? ''}`.toString().trim();
      blockPostToolUse(
        `gitleaks flagged a potential secret in ${filePath}. Remove the hardcoded value and read it ` +
          `from the environment (ConfigService / .env) instead.\n\n${out.split('\n').slice(0, 25).join('\n')}`,
      );
    }
    process.exit(0);
  }
}

// gitleaks not installed → lightweight, high-confidence regex fallback.
if (cfg.regexFallback !== false) {
  let text = '';
  try {
    text = readFileSync(filePath, 'utf8');
  } catch {
    process.exit(0);
  }
  const patterns = [
    [/-----BEGIN (?:RSA |EC |OPENSSH |PGP |DSA )?PRIVATE KEY-----/, 'private key'],
    [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key id'],
    [/\bsk-[A-Za-z0-9]{20,}\b/, 'OpenAI-style secret key'],
    [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/, 'GitHub token'],
    [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, 'Slack token'],
    [/\b(?:secret|password|passwd|token|api[_-]?key)\s*[:=]\s*['"][^'"\s]{8,}['"]/i, 'hardcoded credential'],
  ];
  const hits = patterns.filter(([re]) => re.test(text)).map(([, name]) => name);
  if (hits.length) {
    blockPostToolUse(
      `Potential secret in ${filePath} (${hits.join(', ')}). gitleaks isn't installed, so this is a ` +
        `lightweight regex check — remove the hardcoded value and use env/ConfigService instead. ` +
        `Install gitleaks for authoritative scanning: https://github.com/gitleaks/gitleaks`,
    );
  }
  process.exit(0);
}

if (cfg.failIfGitleaksMissing) {
  process.stderr.write(
    'gitleaks not installed; secret scan skipped. Install: https://github.com/gitleaks/gitleaks\n',
  );
}
process.exit(0);
