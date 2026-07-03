/**
 * Stop + Notification hooks: ping you when the agent finishes a task (Stop) or needs your attention
 * (Notification) — a desktop notification, and optionally a phone push via ntfy.sh.
 *
 * Phone push is opt-in: set a topic in `NTFY_TOPIC` (env) or `.agent-hooks/config.json` →
 * `notify.ntfyTopic`, then subscribe to that topic in the ntfy app. A short debounce keeps rapid
 * back-and-forth turns from spamming you.
 */
import { execFile } from 'node:child_process';
import { platform, tmpdir } from 'node:os';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { readInput, loadConfig, isEnabled } from './lib/hook-io.mjs';

if (!isEnabled('notify')) process.exit(0); // disabled locally via .agent-hooks/config.local.json

const input = readInput();
const cfg = loadConfig().notify ?? {};
const cwd = process.cwd();
const project = cwd.split(/[\\/]/).filter(Boolean).pop() || 'project';
const event = input.hook_event_name ?? 'Stop';
const isAttention = event === 'Notification';

// Debounce (skip if we notified very recently for this project). Attention events always fire.
const minGap = (cfg.minSecondsBetween ?? 30) * 1000;
const stamp = join(tmpdir(), `agent-notify-${hash(cwd)}`);
if (!isAttention && minGap > 0) {
  try {
    const last = Number(readFileSync(stamp, 'utf8')) || 0;
    if (Date.now() - last < minGap) process.exit(0);
  } catch {
    /* no prior stamp */
  }
}
try {
  writeFileSync(stamp, String(Date.now()));
} catch {
  /* ignore */
}

const title = isAttention ? `Claude needs you — ${project}` : `Claude finished — ${project}`;
const body = (input.message || firstLine(input.assistant_message) || 'Done').slice(0, 200);

if (cfg.desktop !== false) desktopNotify(title, body);
if ((cfg.channel ?? 'ntfy') === 'ntfy') pushNtfy(title, body, isAttention);

// let async notifications flush, then exit
setTimeout(() => process.exit(0), 400);

function desktopNotify(t, b) {
  const done = () => {};
  try {
    if (platform() === 'darwin') {
      execFile('osascript', ['-e', `display notification ${asAppleScript(b)} with title ${asAppleScript(t)}`], done);
    } else if (platform() === 'linux') {
      execFile('notify-send', [t, b], done);
    }
    // Windows: skipped for now (toast setup is noisy); ntfy still delivers.
  } catch {
    /* ignore */
  }
}

function pushNtfy(t, b, attention) {
  const topic = process.env.NTFY_TOPIC || cfg.ntfyTopic;
  if (!topic) return;
  const server = (cfg.ntfyServer || 'https://ntfy.sh').replace(/\/+$/, '');
  let url;
  try {
    url = new URL(`${server}/${topic}`);
  } catch {
    return;
  }
  const req = (url.protocol === 'http:' ? httpRequest : httpsRequest)(
    url,
    {
      method: 'POST',
      headers: {
        Title: ascii(t),
        Priority: attention ? 'high' : 'default',
        Tags: attention ? 'warning' : 'white_check_mark',
        Click: `file://${cwd}`,
      },
    },
    (res) => res.resume(),
  );
  req.on('error', () => {});
  req.end(b);
}

function firstLine(s) {
  return s ? String(s).split('\n').find((l) => l.trim()) || '' : '';
}
function asAppleScript(s) {
  return `"${String(s).replace(/["\\]/g, '\\$&')}"`;
}
function ascii(s) {
  // ntfy headers must be latin-1/ASCII-safe.
  return String(s).replace(/[^\x20-\x7E]/g, '');
}
function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
