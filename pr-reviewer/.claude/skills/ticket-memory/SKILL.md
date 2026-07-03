---
name: ticket-memory
description: Read and write structured per-ticket review memory files in ./ticket_memory/. Used by pr-review to persist review context across conversations.
---

## Purpose
Persist review results per ticket per repo so that future reviews of the same ticket have historical context (what was found, what was posted, what's still open).

## Storage location
`./ticket_memory/{ticket_key}/{repo_slug}.md`

Example: `./ticket_memory/PROJ-123/app.example.com.md`

## Reading ticket memory
Before launching review agents, check if `./ticket_memory/{ticket_key}/` exists:
- If it does, use the Read tool to read **ALL** `.md` files in that directory.
- Pass relevant insights (prior issues, open threads, historical context) into the agent prompts.
- If the directory doesn't exist, skip — this is a first review.

## Writing ticket memory
After comments are posted, create or **overwrite** the file for the reviewed repo. Use this exact template:

```markdown
# {TICKET_KEY} — {ticket_summary}
## Repo: {repo_slug} | PR #{pr_id}

### Review Date: {YYYY-MM-DD}

### Summary
{1-3 sentences on what the PR changes}

### Issues Raised
{For each issue that was POSTED:}
- **[{score}] {title}** (inline comment #{comment_id} on `{file}:{line}`) — {one-line description}. **Status: {Changes Requested | Approved}.**

### Minor Issues Noted (not posted)
{Bulleted list of issues scored 60-69 or issues the user chose not to post. Keep brief — one line each.}

### Files Changed
{Bulleted list of files with a short note on what changed in each}
```

## Rules
- One file per repo per ticket. If a ticket spans multiple repositories, write separate files.
- On re-review of the same repo, **overwrite** the file with fresh content — don't append.
- If no issues were raised, still write the file (with "No issues raised" under Issues Raised). This records that the review happened.
- Keep each file concise — this is a reference, not a full report.
