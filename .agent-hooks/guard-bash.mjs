/**
 * PreToolUse (Bash): block dangerous shell commands before they run — `rm -rf /`, force-pushes to
 * protected branches, destructive DB/infra commands against prod, … The patterns live in
 * `.agent-hooks/config.json` → `guard.denyBash` (case-insensitive regexes).
 */
import { readInput, loadConfig, isEnabled, denyTool } from './lib/hook-io.mjs';

if (!isEnabled('guard')) process.exit(0); // disabled locally via .agent-hooks/config.local.json

const input = readInput();
const cfg = loadConfig().guard ?? {};
const command = input?.tool_input?.command;
if (!command) process.exit(0);

for (const pattern of cfg.denyBash ?? []) {
  let re;
  try {
    re = new RegExp(pattern, 'i');
  } catch {
    continue; // skip a malformed pattern rather than crash the hook
  }
  if (re.test(command)) {
    denyTool(
      `This command was blocked by the 'guard' agent hook (matched a dangerous pattern: /${pattern}/). ` +
        `Review it carefully; if it's genuinely needed, run it yourself or adjust ` +
        `.agent-hooks/config.json → guard.denyBash.`,
    );
  }
}
process.exit(0);
