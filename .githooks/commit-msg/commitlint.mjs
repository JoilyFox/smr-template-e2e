/**
 * commit-msg: enforce the Conventional Commits format (e.g. `feat(scope): summary`). Zero-dependency
 * — no @commitlint install — checking type, optional scope, `!` breaking marker, and subject length.
 * Merge/revert/fixup/squash commits are exempt. Configure via config.json → commitlint.
 */
import { readFileSync } from 'node:fs';
import { loadConfig } from '../lib/hook-io.mjs';

const cfg = loadConfig().commitlint ?? {};
const types = cfg.types ?? [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
];
const maxLen = cfg.maxSubjectLength ?? 100;

const msgFile = process.argv[2];
let msg = '';
try {
  msg = readFileSync(msgFile, 'utf8');
} catch {
  process.exit(0); // no message file passed → nothing to lint
}

// First non-empty, non-comment line is the subject.
const subject = (msg.split('\n').find((l) => l.trim() && !l.startsWith('#')) ?? '').trim();

// Exempt auto-generated commits.
if (/^(Merge |Revert |fixup!|squash!)/.test(subject)) process.exit(0);

const re = new RegExp(`^(${types.join('|')})(\\([\\w.\\-/ ]+\\))?(!)?: .+`);
if (!re.test(subject)) {
  process.stderr.write(
    `\nInvalid commit message — Conventional Commits format required.\n\n` +
      `  got:      ${subject || '(empty)'}\n` +
      `  expected: <type>(optional scope): <summary>\n` +
      `  types:    ${types.join(', ')}\n\n` +
      `  e.g.  feat(auth): add refresh-token rotation\n\n` +
      `(Bypass once with \`git commit --no-verify\`.)\n`,
  );
  process.exit(1);
}
if (subject.length > maxLen) {
  process.stderr.write(`\nCommit subject is ${subject.length} chars; keep it ≤ ${maxLen}.\n`);
  process.exit(1);
}
process.exit(0);
