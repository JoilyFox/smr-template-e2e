---
name: tickets
description: List Jira tickets ready for review (labeled ReadyForReview, status In Progress) and link them to Bitbucket/GitHub PRs. Use when the user asks to list tickets, check what's ready for review, or says "what needs review".
---

## When to use this skill
When the user asks to list tickets for review, check what needs reviewing, or wants to see the review queue.

## How to fetch

Use `mcp__plugin_atlassian_atlassian__searchJiraIssuesUsingJql` (or similar Jira search tool):
- `cloudId`: `your-cloud-id` (or baseUrl configured in pr-reviewer.config.json)
- `jql`: `labels = "ReadyForReview" AND status = "In Progress"`
- `fields`: `["summary", "status", "assignee", "priority", "labels", "issuetype", "description"]`
- `responseContentFormat`: `markdown`

## Present a summary with:
- Ticket key (e.g. `PROJ-123`)
- Summary / title
- Type (Story, Bug, etc.)
- Assignee
- Priority
- Link to ticket (e.g. `https://company.atlassian.net/browse/PROJ-123`)

## Linking to Pull Requests (PRs)
For each ticket returned by the JQL query:

1. **Check ticket memory first:** Look for the directory `./ticket_memory/{ticket_key}/`. If it exists, the `.md` filenames (excluding any non-repo files) are the repo slugs. Use that repo slug to fetch the PR directly via Git Provider MCP tools (with query `source.branch.name~"{ticket_key}"` or equivalent) — this is a single targeted call instead of searching across many repos.

2. **Auto-discover via Jira DevStatus (fallback):** If no ticket memory exists, run the script:
   ```bash
   .claude/tools/jira-dev-status.sh {TICKET_KEY}
   ```
   This makes a single Jira API call and returns all linked PRs with repo slug, PR ID, branch, and status. No need to search across multiple repositories manually.

   Output format:
   ```
   PULL REQUESTS:
     repo={slug}  id={pr_id}  status={OPEN|DRAFT|MERGED|...}  branch={name}  title={title}
   ```

3. **Search Git Host (last resort):** If the script returns "No PRs or branches linked" or errors out, fall back to searching the Git provider (Bitbucket/GitHub/GitLab) via MCP search tools with query matching the ticket key. If still not found, mark the ticket as "No linked PR found" in the output.
