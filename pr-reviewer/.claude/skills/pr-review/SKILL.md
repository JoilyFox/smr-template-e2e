---
name: pr-review
description: Full PR review workflow (fetch diffs, audit comments, launch parallel agents, verify, post comments, update Jira). Use when user asks to review a PR or says "review PROJ-123".
---

## When to use this skill
When the user asks to review a ticket, review a PR, or says something like "review PROJ-123".

## Step 1: Identify the PR
If the user provides a ticket key (e.g. `PROJ-123`):
1. **Check ticket memory first:** Look for `./ticket_memory/{ticket_key}/` — filenames are repo slugs.
2. **Auto-discover (fallback):** Run `.claude/tools/jira-dev-status.sh {TICKET_KEY}` to get repo slug, PR ID, branch, and status.
3. **Only ask the user** if both methods fail to find a PR.

If the repo and PR ID are known, proceed. Otherwise, search the Git provider MCP tools for branches or PRs matching the ticket key.

---

## Step 2: Fetch PR Diff, Comments, and Ticket Memory
Identify which Git Provider MCP server is registered:
- **Bitbucket**: `@aashari/mcp-server-atlassian-bitbucket`
- **GitHub**: `@modelcontextprotocol/server-github`
- **GitLab**: Custom GitLab MCP server or commands

Fetch data using the appropriate server's tools:
*   **Bitbucket**:
    *   Fetch PR diff via `bb_get` (path: `/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/diff`).
    *   Fetch comments via `bb_get` (path: `/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/comments`).
*   **GitHub**:
    *   Fetch PR diff via `get_pull_request` (passing repo, owner, number).
    *   Fetch comments via `list_pull_request_comments` and issue comments.
*   **GitLab**:
    *   Fetch diff and discussions via GitLab REST API tools.

**Save the diff to a local file** under `.diffs/diff_{ticket_key}.txt`. *Important: Agents cannot access MCP tools; they must read the diff from this local file.*

Read the ticket memory file at `./ticket_memory/{ticket_key}/{repo_slug}.md` if it exists, to load historical context.

---

## Step 3: Audit Previous Comments (Pre-Review)
Before analyzing code, evaluate existing comments to avoid duplicate reporting:
- **FILTER OUT AND IGNORE** bot comments (e.g. Snyk), automated code reports, and minor conversational updates. Focus only on comments flagging real code issues.
- Check their status and cross-reference with the newly fetched PR diff:
  - **Resolved and fixed in diff**: Mark as `Fixed (Approved)`.
  - **Resolved but NOT fixed in diff**: Mark as `Not Fixed (Not Approved)`. Draft a reply explaining what is missing. Add to the "Already Handled Threads" list.
  - **Unresolved/Open and fixed in diff**: Mark as `Open (Fixed)`.
  - **Unresolved/Open and NOT fixed in diff**: Mark as `Open (Not Fixed)`. Add to the "Already Handled Threads" list.
- Keep this audit list in memory for user presentation.

---

## Step 4: Launch Review Agents
Always run **exactly two agents in parallel** (if the diff is under ~50 lines, you can run only `code-review` and instruct it to check security/perf inline):
1. **`code-review`** — correctness, ticket specs alignment, logic errors, structure, readability.
2. **`risk-review`** — security flaws (injections, auth gaps), performance bottlenecks, concurrency.

**Include in the prompt for both agents:**
*   **Diff file path**: Instruct them to read the local diff file `.diffs/diff_{ticket_key}.txt` using the file Read tool. Do NOT use WebFetch.
*   **Jira Ticket Context**: Pass the fetched Jira ticket description.
*   **Line Numbering Rule**:
    > "The LINE number must be the line in the NEW version of the file, NOT the line number in the diff text file you are reading. To compute it: find the nearest `@@ -old,len +new,start @@` hunk header above the issue. The `+new,start` value is the starting line in the new file. Count only context lines (starting with space) and added lines (starting with `+`) from there to reach the issue line. Lines starting with `-` are deleted and do NOT count toward the new file line number.
    > Example: if the hunk header is `@@ -266,9 +285,18 @@` and the issue is on the 8th non-deleted line in that hunk, the new-file line is 285 + 7 = 292."
*   **Output Structure**: Enforce the structured output:
    *   Score (1-100)
    *   File path
    *   Line number (new-file line, computed from hunk headers)
    *   Category tag (`[Code Review]` or `[Risk]`)
    *   One-line title
    *   Description (2-3 sentences max)

---

## Step 5: Score, Verify, and Deduplicate
1.  **Filter**: Only retain issues scored **60 or higher**.
2.  **Verify (Critical)**: Challenge each issue: "Is this actually reachable? Is the input validated upstream? Is it behind auth? Would a senior engineer block a PR for this?" Drop false positives.
3.  **Deduplicate (Critical)**: Compare findings against the "Already Handled Threads" list from Step 3. If an issue is already tracked in an existing comments thread, **DROP IT**.
4.  **Confirm Lines**: Cross-check the final line numbers against the diff hunk headers to verify alignment.

---

## Step 6: Present the Review Plan to the User
Format the plan EXACTLY like this in markdown before executing comments upload:

- **Table 1: Previous Comments Audit** (Columns: `#`, `Comment ID`, `Original Issue`, `Status`). *Only include actual code issues.* Row keys: `C1, C2...`. Status must strictly be one of: `Fixed (Approved)`, `Not Fixed (Not Approved)`, `Open (Fixed)`, or `Open (Not Fixed)`.
- **Unresolved Comment Details**: List the draft replies for comments marked "Not Fixed (Not Approved)" or "Open (Not Fixed)".
- **Table 2: New Issues Found** (Columns: `#`, `Score`, `Severity`, `Category`, `File`, `Line`, `Title`). Scores >= 80 are `Major`, 60-79 are `Minor`. Row keys: `N1, N2...`.
- **New Issue Details**: Display full descriptions and suggestions for each.
- Ask the user which numbers to approve (e.g. `C1, N1, N3` or `all`).

---

## Step 7: Post Approved Comments
1.  **Determine PR Status**: If there are NO approved Major Issues (>=80) and NO unresolved "Not Fixed" comments, the PR is **Approved**. Otherwise, **Changes Requested**.
2.  **Post Minor Issues (60-79)**: Do NOT post as individual inline comments. Compile all approved minor findings into a single collapsed markdown block.
3.  **Post General Comments**:
    *   *If Approved*: Post one general PR comment starting with "✅ **PR Approved**". Append the Minor Issues block to it.
    *   *If Changes Requested*: Post a primary general comment summarizing Major Issues. Post the Minor Issues block as a **second, separate general comment** (prevents cluttering the review thread).
4.  **Post Major Issues (>=80)**: Post as individual **inline comments** on the Git provider.
    *   Bitbucket: `bb_post` with inline payload.
    *   GitHub: `create_pull_request_review_comment` with body, path, line.
    *   Prefix the comment with: `**[score/100] [Category]**` (e.g. `**[85/100] [Risk]**`).
5.  **Resolve/Reply Threads**: Post replies to unresolved threads and resolve them if marked "Fixed (Approved)".

---

## Step 8: Write to Ticket Memory
Save the review date, summary, files changed, posted issues, and skipped minor findings using the `/ticket-memory` skill.

---

## Step 9: Update Jira Status
Update labels based on the final review verdict:
1. Fetch the ticket's current labels.
2. Remove `ReadyForReview`.
3. Add the verdict label:
   *   `NeedsChanges` — if any Major issues (80+) were posted or prior issues remain unresolved.
   *   `ManualReview` — if the PR was approved or only minor comments were noted.
4. Update the ticket labels.
