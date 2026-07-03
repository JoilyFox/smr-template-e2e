/**
 * PreToolUse (Edit|Write|MultiEdit): block writes to sensitive files (`.env`, `migrations/`, keys,
 * …) before they happen. Path-based — complements the `secrets` hook, which looks at file *content*.
 * Deny-lists (and `.env.example`-style allow-list) live in `.agent-hooks/config.json` → `guard`.
 */
import { readInput, loadConfig, isEnabled, globToRegExp, denyTool } from './lib/hook-io.mjs';

if (!isEnabled('guard')) process.exit(0); // disabled locally via .agent-hooks/config.local.json

const input = readInput();
const cfg = loadConfig().guard ?? {};
const filePath = input?.tool_input?.file_path;
if (!filePath) process.exit(0);

const norm = String(filePath).replace(/\\/g, '/');
const allow = (cfg.allowPaths ?? []).map(globToRegExp);
if (allow.some((re) => re.test(norm))) process.exit(0);

const deny = (cfg.denyPaths ?? []).map(globToRegExp);
if (deny.some((re) => re.test(norm))) {
  denyTool(
    `Editing "${filePath}" is blocked by the 'guard' agent hook (sensitive file). If this is truly ` +
      `intended, edit it by hand or adjust .agent-hooks/config.json → guard.denyPaths.`,
  );
}
process.exit(0);
