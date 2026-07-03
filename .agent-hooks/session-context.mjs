/**
 * SessionStart hook: inject a quick orientation snapshot into the agent's context — current branch,
 * ahead/behind vs upstream, uncommitted changes, and last commit — so it doesn't waste requests
 * re-discovering the repo state at the start of a session.
 */
import { git, isEnabled, sessionContext } from './lib/hook-io.mjs';

if (!isEnabled('context')) process.exit(0); // disabled locally via .agent-hooks/config.local.json

const cwd = process.cwd();
const lines = [];

const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
if (branch) lines.push(`- Current branch: \`${branch}\``);

const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], cwd);
if (upstream) {
  const counts = git(['rev-list', '--left-right', '--count', `${upstream}...HEAD`], cwd);
  if (counts) {
    const [behind, ahead] = counts.split(/\s+/);
    lines.push(`- vs \`${upstream}\`: ${ahead} ahead, ${behind} behind`);
  }
}

const status = git(['status', '--short'], cwd);
lines.push(
  status
    ? `- Uncommitted changes:\n${status
        .split('\n')
        .map((l) => `    ${l}`)
        .join('\n')}`
    : '- Working tree clean',
);

const last = git(['log', '-1', '--pretty=%h %s (%cr)'], cwd);
if (last) lines.push(`- Last commit: ${last}`);

if (lines.length) {
  sessionContext(`## Repository status (from the 'context' agent hook)\n${lines.join('\n')}`);
}
process.exit(0);
