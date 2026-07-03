/**
 * pre-commit: refuse commits made directly on a protected branch (main/master by default), nudging
 * toward a feature-branch + PR workflow. Configure via config.json → noCommitToMain.branches.
 */
import { git, loadConfig } from '../lib/hook-io.mjs';

const protectedBranches = loadConfig()['no-commit-to-main']?.branches ?? ['main', 'master'];
// symbolic-ref resolves the branch name even on an unborn branch (before the first commit), where
// `rev-parse --abbrev-ref HEAD` would return the literal "HEAD" and slip the very first commit through.
const branch = git(['symbolic-ref', '--short', 'HEAD']);

if (branch && protectedBranches.includes(branch)) {
  process.stderr.write(
    `\nDirect commits to "${branch}" are blocked by the 'no-commit-to-main' hook.\n` +
      `Work on a feature branch instead:\n\n  git switch -c my-feature\n\n` +
      `(Bypass once with \`git commit --no-verify\`, or edit .githooks/config.json → "no-commit-to-main".branches.)\n`,
  );
  process.exit(1);
}
process.exit(0);
